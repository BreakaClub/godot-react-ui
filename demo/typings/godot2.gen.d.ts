declare module "godot" {
    // AUTO-GENERATED
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectDelay extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectDelay extends __NameMapAudioEffect {
        tap1_active: "tap1Active";
        tap1_delay_ms: "tap1DelayMs";
        tap1_level_db: "tap1LevelDb";
        tap1_pan: "tap1Pan";
        tap2_active: "tap2Active";
        tap2_delay_ms: "tap2DelayMs";
        tap2_level_db: "tap2LevelDb";
        tap2_pan: "tap2Pan";
        feedback_active: "feedbackActive";
        feedback_delay_ms: "feedbackDelayMs";
        feedback_level_db: "feedbackLevelDb";
        feedback_lowpass: "feedbackLowpass";
    }
    /** Adds a delay audio effect to an audio bus.  
     *  Emulates an echo by playing the input audio back after a period of time.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectdelay.html  
     */
    class AudioEffectDelay extends AudioEffect {
        constructor(identifier?: any)
        /** The volume ratio of the original audio. Value can range from 0 to 1. */
        get dry(): float64
        set dry(value: float64)
        
        /** If `true`, the first tap will be enabled. */
        get tap1Active(): boolean
        set tap1Active(value: boolean)
        
        /** First tap delay time in milliseconds, compared to the original audio. Value can range from 0 to 1500. */
        get tap1DelayMs(): float64
        set tap1DelayMs(value: float64)
        
        /** Gain for the first tap, in dB. Value can range from -60 to 0. */
        get tap1LevelDb(): float64
        set tap1LevelDb(value: float64)
        
        /** Pan position for the first tap. Negative values pan the sound to the left, positive pan to the right. Value can range from -1 to 1. */
        get tap1Pan(): float64
        set tap1Pan(value: float64)
        
        /** If `true`, the second tap will be enabled. */
        get tap2Active(): boolean
        set tap2Active(value: boolean)
        
        /** Second tap delay time in milliseconds, compared to the original audio. Value can range from 0 to 1500. */
        get tap2DelayMs(): float64
        set tap2DelayMs(value: float64)
        
        /** Gain for the second tap, in dB. Value can range from -60 to 0. */
        get tap2LevelDb(): float64
        set tap2LevelDb(value: float64)
        
        /** Pan position for the second tap. Negative values pan the sound to the left, positive pan to the right. Value can range from -1 to 1. */
        get tap2Pan(): float64
        set tap2Pan(value: float64)
        
        /** If `true`, feedback is enabled, repeating taps after they are played. */
        get feedbackActive(): boolean
        set feedbackActive(value: boolean)
        
        /** Feedback delay time in milliseconds. Value can range from 0 to 1500. */
        get feedbackDelayMs(): float64
        set feedbackDelayMs(value: float64)
        
        /** Gain for feedback, in dB. Value can range from -60 to 0. */
        get feedbackLevelDb(): float64
        set feedbackLevelDb(value: float64)
        
        /** Low-pass filter for feedback, in Hz. Frequencies above this value are filtered out. Value can range from 1 to 16000. */
        get feedbackLowpass(): float64
        set feedbackLowpass(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectDelay;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectDelay;
    }
    namespace AudioEffectDistortion {
        enum Mode {
            ModeClip = 0,
            ModeAtan = 1,
            ModeLofi = 2,
            ModeOverdrive = 3,
            ModeWaveshape = 4,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectDistortion extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectDistortion extends __NameMapAudioEffect {
        pre_gain: "preGain";
        keep_hf_hz: "keepHfHz";
        post_gain: "postGain";
    }
    /** Adds a distortion audio effect to an audio bus.  
     *  Remaps audio samples using a nonlinear function to achieve a distorted sound.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectdistortion.html  
     */
    class AudioEffectDistortion extends AudioEffect {
        constructor(identifier?: any)
        /** Distortion type. Changes the nonlinear function used to distort the waveform. See [enum Mode]. */
        get mode(): int64
        set mode(value: int64)
        
        /** Gain before the effect, in dB. Value can range from -60 to 60. */
        get preGain(): float64
        set preGain(value: float64)
        
        /** High-pass filter, in Hz. Frequencies higher than this value will not be affected by the distortion. Value can range from 1 to 20000. */
        get keepHfHz(): float64
        set keepHfHz(value: float64)
        
        /** Distortion intensity. Controls how much of the input audio is affected by the distortion curve by moving from a linear function to a nonlinear one. Value can range from 0 to 1. */
        get drive(): float64
        set drive(value: float64)
        
        /** Gain after the effect, in dB. Value can range from -80 to 24. */
        get postGain(): float64
        set postGain(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectDistortion;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectDistortion;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectEQ extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectEQ extends __NameMapAudioEffect {
        set_band_gain_db: "setBandGainDb";
        get_band_gain_db: "getBandGainDb";
        get_band_count: "getBandCount";
    }
    /** Base class for audio equalizers (EQ). Gives you control over frequencies.  
     *  Use it to create a custom equalizer if [AudioEffectEQ6], [AudioEffectEQ10], or [AudioEffectEQ21] don't fit your needs.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecteq.html  
     */
    class AudioEffectEQ extends AudioEffect {
        constructor(identifier?: any)
        /** Sets band's gain at the specified index, in dB. */
        setBandGainDb(bandIdx: int64, volumeDb: float64): void
        
        /** Returns the band's gain at the specified index, in dB. */
        getBandGainDb(bandIdx: int64): float64
        
        /** Returns the number of bands of the equalizer. */
        getBandCount(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectEQ;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectEQ;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectEQ10 extends __RPCMapAudioEffectEQ {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectEQ10 extends __NameMapAudioEffectEQ {
    }
    /** Adds a 10-band equalizer audio effect to an audio bus.  
     *  Gives you control over frequencies from 31 Hz to 16000 Hz. Each frequency can be modulated between -60/+24 dB.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecteq10.html  
     */
    class AudioEffectEQ10 extends AudioEffectEQ {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectEQ10;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectEQ10;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectEQ21 extends __RPCMapAudioEffectEQ {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectEQ21 extends __NameMapAudioEffectEQ {
    }
    /** Adds a 21-band equalizer audio effect to an audio bus.  
     *  Gives you control over frequencies from 22 Hz to 22000 Hz. Each frequency can be modulated between -60/+24 dB.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecteq21.html  
     */
    class AudioEffectEQ21 extends AudioEffectEQ {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectEQ21;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectEQ21;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectEQ6 extends __RPCMapAudioEffectEQ {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectEQ6 extends __NameMapAudioEffectEQ {
    }
    /** Adds a 6-band equalizer audio effect to an audio bus.  
     *  Gives you control over frequencies from 32 Hz to 10000 Hz. Each frequency can be modulated between -60/+24 dB.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecteq6.html  
     */
    class AudioEffectEQ6 extends AudioEffectEQ {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectEQ6;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectEQ6;
    }
    namespace AudioEffectFilter {
        enum FilterDB {
            Filter6Db = 0,
            Filter12Db = 1,
            Filter18Db = 2,
            Filter24Db = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectFilter extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectFilter extends __NameMapAudioEffect {
        cutoff_hz: "cutoffHz";
    }
    /** Base class for filters. Use effects that inherit this class instead of using it directly.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectfilter.html  
     */
    class AudioEffectFilter extends AudioEffect {
        constructor(identifier?: any)
        /** Frequency threshold for the filter, in Hz. Value can range from 1 to 20500. */
        get cutoffHz(): float64
        set cutoffHz(value: float64)
        
        /** Gain at or directly next to the [member cutoff_hz] frequency threshold. Value can range from 0 to 1.  
         *  Its exact behavior depends on the selected filter type:  
         *  - For shelf filters, it accentuates or masks the order by increasing frequencies right next to the [member cutoff_hz] frequency and decreasing frequencies on the opposite side.  
         *  - For the band-pass and notch filters, it widens or narrows the filter at the [member cutoff_hz] frequency threshold.  
         *  - For low/high-pass filters, it increases or decreases frequencies at the [member cutoff_hz] frequency threshold.  
         */
        get resonance(): float64
        set resonance(value: float64)
        
        /** Gain of the frequencies affected by the filter. This property is only available for [AudioEffectLowShelfFilter] and [AudioEffectHighShelfFilter]. Value can range from 0 to 4. */
        get gain(): float64
        set gain(value: float64)
        
        /** Steepness of the cutoff curve in dB per octave (twice the frequency above [member cutoff_hz], or half the frequency below [member cutoff_hz]), also known as the "order" of the filter. Higher orders have a more aggressive cutoff. */
        get db(): int64
        set db(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectHardLimiter extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectHardLimiter extends __NameMapAudioEffect {
        pre_gain_db: "preGainDb";
        ceiling_db: "ceilingDb";
    }
    /** Adds a limiter audio effect to an audio bus.  
     *  Prevents audio signals from exceeding a specified volume level.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecthardlimiter.html  
     */
    class AudioEffectHardLimiter extends AudioEffect {
        constructor(identifier?: any)
        /** Gain before limiting, in dB. Value can range from -24 to 24. */
        get preGainDb(): float64
        set preGainDb(value: float64)
        
        /** The waveform's maximum allowed value, in dB. This value can range from -24 to 0.  
         *  The default value of -0.3 prevents potential inter-sample peaks (ISP) from crossing over 0 dB, which can cause slight distortion on some older hardware.  
         */
        get ceilingDb(): float64
        set ceilingDb(value: float64)
        
        /** Time it takes in seconds for the gain reduction to fully release. Value can range from 0.01 to 3. */
        get release(): float64
        set release(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectHardLimiter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectHardLimiter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectHighPassFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectHighPassFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a high-pass filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecthighpassfilter.html  
     */
    class AudioEffectHighPassFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectHighPassFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectHighPassFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectHighShelfFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectHighShelfFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a high-shelf filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffecthighshelffilter.html  
     */
    class AudioEffectHighShelfFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectHighShelfFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectHighShelfFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectInstance extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectInstance extends __NameMapRefCounted {
        _process_silence: "_processSilence";
    }
    /** Manipulates the audio it receives for a given effect.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectinstance.html  
     */
    class AudioEffectInstance extends RefCounted {
        constructor(identifier?: any)
        /** Called by the [AudioServer] to process this effect. When [method _process_silence] is not overridden or it returns `false`, this method is called only when the bus is active.  
         *      
         *  **Note:** It is not useful to override this method in GDScript or C#. Only GDExtension can take advantage of it.  
         */
        /* gdvirtual */ _process(srcBuffer: int64, rDstBuffer: int64, frameCount: int64): void
        
        /** Override this method to customize the processing behavior of this effect instance.  
         *  Should return `true` to force the [AudioServer] to always call [method _process], even if the bus has been muted or cannot otherwise be heard.  
         */
        /* gdvirtual */ _processSilence(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectInstance;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectInstance;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectLimiter extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectLimiter extends __NameMapAudioEffect {
        ceiling_db: "ceilingDb";
        threshold_db: "thresholdDb";
        soft_clip_db: "softClipDb";
        soft_clip_ratio: "softClipRatio";
    }
    /** Adds a soft-clip limiter audio effect to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectlimiter.html  
     */
    class AudioEffectLimiter extends AudioEffect {
        constructor(identifier?: any)
        /** The waveform's maximum allowed value, in dB. Value can range from -20 to -0.1. */
        get ceilingDb(): float64
        set ceilingDb(value: float64)
        
        /** The volume threshold level from which the limiter begins to be active, in dB. Value can range from -30 to 0. */
        get thresholdDb(): float64
        set thresholdDb(value: float64)
        
        /** Modifies the volume of the limited waves, in dB. Value can range from 0 to 6. */
        get softClipDb(): float64
        set softClipDb(value: float64)
        
        /** This property has no effect on the audio. Use [AudioEffectHardLimiter] instead, as this Limiter effect is deprecated. */
        get softClipRatio(): float64
        set softClipRatio(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectLimiter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectLimiter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectLowPassFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectLowPassFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a low-pass filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectlowpassfilter.html  
     */
    class AudioEffectLowPassFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectLowPassFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectLowPassFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectLowShelfFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectLowShelfFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a low-shelf filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectlowshelffilter.html  
     */
    class AudioEffectLowShelfFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectLowShelfFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectLowShelfFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectNotchFilter extends __RPCMapAudioEffectFilter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectNotchFilter extends __NameMapAudioEffectFilter {
    }
    /** Adds a notch filter to an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectnotchfilter.html  
     */
    class AudioEffectNotchFilter extends AudioEffectFilter {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectNotchFilter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectNotchFilter;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectPanner extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectPanner extends __NameMapAudioEffect {
    }
    /** Adds a panner audio effect to an audio bus.  
     *  Pans the sound left or right.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectpanner.html  
     */
    class AudioEffectPanner extends AudioEffect {
        constructor(identifier?: any)
        /** Pan position. Negative values pan the sound to the left, positive pan to the right. Value can range from -1 to 1. */
        get pan(): float64
        set pan(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectPanner;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectPanner;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectPhaser extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectPhaser extends __NameMapAudioEffect {
        range_min_hz: "rangeMinHz";
        range_max_hz: "rangeMaxHz";
        rate_hz: "rateHz";
    }
    /** Adds a phaser audio effect to an audio bus.  
     *  Creates several notch and peak filters that sweep across the spectrum.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectphaser.html  
     */
    class AudioEffectPhaser extends AudioEffect {
        constructor(identifier?: any)
        /** Determines the minimum frequency affected by the low-frequency oscillator modulations, in Hz. Value can range from 10 to 10000. */
        get rangeMinHz(): float64
        set rangeMinHz(value: float64)
        
        /** Determines the maximum frequency affected by the low-frequency oscillator modulations, in Hz. Value can range from 10 to 10000. */
        get rangeMaxHz(): float64
        set rangeMaxHz(value: float64)
        
        /** Adjusts the rate in Hz at which the effect sweeps up and down across the frequency range. Value can range from 0.01 to 20. */
        get rateHz(): float64
        set rateHz(value: float64)
        
        /** The volume ratio of the filtered audio that is fed back to the all-pass filters. The higher the value, the sharper and louder the peak filters created by the effect. Value can range from 0.1 to 0.9. */
        get feedback(): float64
        set feedback(value: float64)
        
        /** Intensity of the effect. Value can range from 0.1 to 4.0. */
        get depth(): float64
        set depth(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectPhaser;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectPhaser;
    }
    namespace AudioEffectPitchShift {
        enum FftSize {
            FftSize256 = 0,
            FftSize512 = 1,
            FftSize1024 = 2,
            FftSize2048 = 3,
            FftSize4096 = 4,
            FftSizeMax = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectPitchShift extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectPitchShift extends __NameMapAudioEffect {
        pitch_scale: "pitchScale";
        fft_size: "fftSize";
    }
    /** Adds a pitch-shifting audio effect to an audio bus.  
     *  Raises or lowers the pitch of the input audio.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectpitchshift.html  
     */
    class AudioEffectPitchShift extends AudioEffect {
        constructor(identifier?: any)
        /** The pitch scale to use. `1.0` is the default pitch and plays sounds unaffected. [member pitch_scale] can range from 0 (infinitely low pitch, inaudible) to 16 (16 times higher than the initial pitch). */
        get pitchScale(): float64
        set pitchScale(value: float64)
        
        /** The oversampling factor to use. Higher values result in better quality, but are more demanding on the CPU and may cause audio cracking if the CPU can't keep up. */
        get oversampling(): float64
        set oversampling(value: float64)
        
        /** The size of the [url=https://en.wikipedia.org/wiki/Fast_Fourier_transform]Fast Fourier transform[/url] buffer. Higher values smooth out the effect over time, but have greater latency. The effects of this higher latency are especially noticeable on audio signals that have sudden amplitude changes. */
        get fftSize(): int64
        set fftSize(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectPitchShift;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectPitchShift;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectRecord extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectRecord extends __NameMapAudioEffect {
        set_recording_active: "setRecordingActive";
        is_recording_active: "isRecordingActive";
        get_recording: "getRecording";
    }
    /** Audio effect used for recording the sound from an audio bus.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectrecord.html  
     */
    class AudioEffectRecord extends AudioEffect {
        constructor(identifier?: any)
        /** If `true`, the sound will be recorded. Note that restarting the recording will remove the previously recorded sample. */
        setRecordingActive(record: boolean): void
        
        /** Returns whether the recording is active or not. */
        isRecordingActive(): boolean
        
        /** Returns the recorded sample. */
        getRecording(): null | AudioStreamWav
        
        /** Specifies the format in which the sample will be recorded. */
        get format(): int64
        set format(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectRecord;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectRecord;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectReverb extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectReverb extends __NameMapAudioEffect {
        predelay_msec: "predelayMsec";
        predelay_feedback: "predelayFeedback";
        room_size: "roomSize";
    }
    /** Adds a reverberation audio effect to an audio bus.  
     *  Emulates an echo by playing a blurred version of the input audio.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectreverb.html  
     */
    class AudioEffectReverb extends AudioEffect {
        constructor(identifier?: any)
        /** Time between the original audio and the early reflections of the reverb signal, in milliseconds. Value can range from 20 to 500. */
        get predelayMsec(): float64
        set predelayMsec(value: float64)
        
        /** Gain of early reflection copies. At higher values, early reflection copies are louder and ring out for longer. Value can range from 0 to 1. */
        get predelayFeedback(): float64
        set predelayFeedback(value: float64)
        
        /** Dimensions of simulated room. Bigger means more echoes. Value can range from 0 to 1. */
        get roomSize(): float64
        set roomSize(value: float64)
        
        /** Defines how reflective the imaginary room's walls are. The more reflective, the more high frequency content the reverb has. Value can range from 0 to 1. */
        get damping(): float64
        set damping(value: float64)
        
        /** Widens or narrows the stereo image of the reverb tail. At 1, it fully widens. Value can range from 0 to 1. */
        get spread(): float64
        set spread(value: float64)
        
        /** High-pass filter allows frequencies higher than a certain cutoff threshold and attenuates frequencies lower than the cutoff threshold. Value can range from 0 to 1. */
        get hipass(): float64
        set hipass(value: float64)
        
        /** The volume ratio of the original audio. At 0, only the modified audio is outputted. Value can range from 0 to 1. */
        get dry(): float64
        set dry(value: float64)
        
        /** The volume ratio of the modified audio. At 0, only the original audio is outputted. Value can range from 0 to 1. */
        get wet(): float64
        set wet(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectReverb;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectReverb;
    }
    namespace AudioEffectSpectrumAnalyzer {
        enum FftSize {
            FftSize256 = 0,
            FftSize512 = 1,
            FftSize1024 = 2,
            FftSize2048 = 3,
            FftSize4096 = 4,
            FftSizeMax = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectSpectrumAnalyzer extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectSpectrumAnalyzer extends __NameMapAudioEffect {
        buffer_length: "bufferLength";
        fft_size: "fftSize";
    }
    /** Creates an [AudioEffectInstance] which performs frequency analysis and exposes results to be accessed in real-time.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectspectrumanalyzer.html  
     */
    class AudioEffectSpectrumAnalyzer extends AudioEffect {
        constructor(identifier?: any)
        /** The length of the buffer to keep, in seconds. Higher values keep data around for longer, but require more memory. Value can range from 0.1 to 4. */
        get bufferLength(): float64
        set bufferLength(value: float64)
        
        /** The size of the [url=https://en.wikipedia.org/wiki/Fast_Fourier_transform]Fast Fourier transform[/url] buffer. Higher values smooth out the spectrum analysis over time, but have greater latency. The effects of this higher latency are especially noticeable with sudden amplitude changes. */
        get fftSize(): int64
        set fftSize(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectSpectrumAnalyzer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectSpectrumAnalyzer;
    }
    namespace AudioEffectSpectrumAnalyzerInstance {
        enum MagnitudeMode {
            MagnitudeAverage = 0,
            MagnitudeMax = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectSpectrumAnalyzerInstance extends __RPCMapAudioEffectInstance {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectSpectrumAnalyzerInstance extends __NameMapAudioEffectInstance {
        get_magnitude_for_frequency_range: "getMagnitudeForFrequencyRange";
    }
    /** Queryable instance of an [AudioEffectSpectrumAnalyzer].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectspectrumanalyzerinstance.html  
     */
    class AudioEffectSpectrumAnalyzerInstance extends AudioEffectInstance {
        constructor(identifier?: any)
        /** Returns the magnitude of the frequencies from [param from_hz] to [param to_hz] in linear energy as a Vector2. The `x` component of the return value represents the left stereo channel, and `y` represents the right channel.  
         *  [param mode] determines how the frequency range will be processed.  
         */
        getMagnitudeForFrequencyRange(fromHz: float64, toHz: float64, mode?: AudioEffectSpectrumAnalyzerInstance.MagnitudeMode /* = 1 */): Vector2
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectSpectrumAnalyzerInstance;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectSpectrumAnalyzerInstance;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioEffectStereoEnhance extends __RPCMapAudioEffect {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioEffectStereoEnhance extends __NameMapAudioEffect {
        pan_pullout: "panPullout";
        time_pullout_ms: "timePulloutMs";
    }
    /** Adds a stereo manipulation audio effect to an audio bus.  
     *  Controls gain of the side channels, and widens the stereo image.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audioeffectstereoenhance.html  
     */
    class AudioEffectStereoEnhance extends AudioEffect {
        constructor(identifier?: any)
        /** Gain of the side channels, if they exist. A value of 0 will downmix stereo to mono. Value can range from 0 to 4. */
        get panPullout(): float64
        set panPullout(value: float64)
        
        /** Widens the stereo image through phase shifting in conjunction with [member surround]. Just delays the right channel if [member surround] is 0. Value is in milliseconds, and can range from 0 to 50. */
        get timePulloutMs(): float64
        set timePulloutMs(value: float64)
        
        /** Widens the stereo image through phase shifting in conjunction with [member time_pullout_ms]. Just pans sound to the left channel if [member time_pullout_ms] is 0. Value can range from 0 to 1. */
        get surround(): float64
        set surround(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioEffectStereoEnhance;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioEffectStereoEnhance;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioListener2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioListener2D extends __NameMapNode2D {
        make_current: "makeCurrent";
        clear_current: "clearCurrent";
        is_current: "isCurrent";
    }
    /** Overrides the location sounds are heard from.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiolistener2d.html  
     */
    class AudioListener2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Makes the [AudioListener2D] active, setting it as the hearing point for the sounds. If there is already another active [AudioListener2D], it will be disabled.  
         *  This method will have no effect if the [AudioListener2D] is not added to [SceneTree].  
         */
        makeCurrent(): void
        
        /** Disables the [AudioListener2D]. If it's not set as current, this method will have no effect. */
        clearCurrent(): void
        
        /** Returns `true` if this [AudioListener2D] is currently active. */
        isCurrent(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioListener2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioListener2D;
    }
    namespace AudioListener3D {
        enum DopplerTracking {
            DopplerTrackingDisabled = 0,
            DopplerTrackingIdleStep = 1,
            DopplerTrackingPhysicsStep = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioListener3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioListener3D extends __NameMapNode3D {
        make_current: "makeCurrent";
        clear_current: "clearCurrent";
        is_current: "isCurrent";
        get_listener_transform: "getListenerTransform";
        doppler_tracking: "dopplerTracking";
    }
    /** Overrides the location sounds are heard from.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiolistener3d.html  
     */
    class AudioListener3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Enables the listener. This will override the current camera's listener. */
        makeCurrent(): void
        
        /** Disables the listener to use the current camera's listener instead. */
        clearCurrent(): void
        
        /** Returns `true` if the listener was made current using [method make_current], `false` otherwise.  
         *      
         *  **Note:** There may be more than one AudioListener3D marked as "current" in the scene tree, but only the one that was made current last will be used.  
         */
        isCurrent(): boolean
        
        /** Returns the listener's global orthonormalized [Transform3D]. */
        getListenerTransform(): Transform3D
        
        /** If not [constant DOPPLER_TRACKING_DISABLED], this listener will simulate the [url=https://en.wikipedia.org/wiki/Doppler_effect]Doppler effect[/url] for objects changed in particular `_process` methods.  
         *      
         *  **Note:** The Doppler effect will only be heard on [AudioStreamPlayer3D]s if [member AudioStreamPlayer3D.doppler_tracking] is not set to [constant AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED].  
         */
        get dopplerTracking(): int64
        set dopplerTracking(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioListener3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioListener3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioSample extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioSample extends __NameMapRefCounted {
    }
    /** Base class for audio samples.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiosample.html  
     */
    class AudioSample extends RefCounted {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioSample;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioSample;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioSamplePlayback extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioSamplePlayback extends __NameMapRefCounted {
    }
    /** Meta class for playing back audio samples.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiosampleplayback.html  
     */
    class AudioSamplePlayback extends RefCounted {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioSamplePlayback;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioSamplePlayback;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStream extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStream extends __NameMapResource {
        _instantiate_playback: "_instantiatePlayback";
        _get_stream_name: "_getStreamName";
        _get_length: "_getLength";
        _is_monophonic: "_isMonophonic";
        _get_bpm: "_getBpm";
        _get_beat_count: "_getBeatCount";
        _get_tags: "_getTags";
        _get_parameter_list: "_getParameterList";
        _has_loop: "_hasLoop";
        _get_bar_beats: "_getBarBeats";
        get_length: "getLength";
        is_monophonic: "isMonophonic";
        instantiate_playback: "instantiatePlayback";
        can_be_sampled: "canBeSampled";
        generate_sample: "generateSample";
        is_meta_stream: "isMetaStream";
        parameter_list_changed: "parameterListChanged";
    }
    /** Base class for audio streams.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostream.html  
     */
    class AudioStream extends Resource {
        constructor(identifier?: any)
        /** Override this method to customize the returned value of [method instantiate_playback]. Should return a new [AudioStreamPlayback] created when the stream is played (such as by an [AudioStreamPlayer]). */
        /* gdvirtual */ _instantiatePlayback(): null | AudioStreamPlayback
        
        /** Override this method to customize the name assigned to this audio stream. */
        /* gdvirtual */ _getStreamName(): string
        
        /** Override this method to customize the returned value of [method get_length]. Should return the length of this audio stream, in seconds. */
        /* gdvirtual */ _getLength(): float64
        
        /** Override this method to customize the returned value of [method is_monophonic]. Should return `true` if this audio stream only supports one channel. */
        /* gdvirtual */ _isMonophonic(): boolean
        
        /** Overridable method. Should return the tempo of this audio stream, in beats per minute (BPM). Used by the engine to determine the position of every beat.  
         *  Ideally, the returned value should be based off the stream's sample rate ([member AudioStreamWAV.mix_rate], for example).  
         */
        /* gdvirtual */ _getBpm(): float64
        
        /** Overridable method. Should return the total number of beats of this audio stream. Used by the engine to determine the position of every beat.  
         *  Ideally, the returned value should be based off the stream's sample rate ([member AudioStreamWAV.mix_rate], for example).  
         */
        /* gdvirtual */ _getBeatCount(): int64
        
        /** Override this method to customize the tags for this audio stream. Should return a [Dictionary] of strings with the tag as the key and its content as the value.  
         *  Commonly used tags include `title`, `artist`, `album`, `tracknumber`, and `date`.  
         */
        /* gdvirtual */ _getTags(): GDictionary
        
        /** Return the controllable parameters of this stream. This array contains dictionaries with a property info description format (see [method Object.get_property_list]). Additionally, the default value for this parameter must be added tho each dictionary in "default_value" field. */
        /* gdvirtual */ _getParameterList(): GArray<GDictionary>
        
        /** Override this method to return `true` if this stream has a loop. */
        /* gdvirtual */ _hasLoop(): boolean
        
        /** Override this method to return the bar beats of this stream. */
        /* gdvirtual */ _getBarBeats(): int64
        
        /** Returns the length of the audio stream in seconds. If this stream is an [AudioStreamRandomizer], returns the length of the last played stream. If this stream has an indefinite length (such as for [AudioStreamGenerator] and [AudioStreamMicrophone]), returns `0.0`. */
        getLength(): float64
        
        /** Returns `true` if this audio stream only supports one channel ( *monophony* ), or `false` if the audio stream supports two or more channels ( *polyphony* ). */
        isMonophonic(): boolean
        
        /** Returns a newly created [AudioStreamPlayback] intended to play this audio stream. Useful for when you want to extend [method _instantiate_playback] but call [method instantiate_playback] from an internally held AudioStream subresource. An example of this can be found in the source code for `AudioStreamRandomPitch::instantiate_playback`. */
        instantiatePlayback(): null | AudioStreamPlayback
        
        /** Returns if the current [AudioStream] can be used as a sample. Only static streams can be sampled. */
        canBeSampled(): boolean
        
        /** Generates an [AudioSample] based on the current stream. */
        generateSample(): null | AudioSample
        
        /** Returns `true` if the stream is a collection of other streams, `false` otherwise. */
        isMetaStream(): boolean
        
        /** Signal to be emitted to notify when the parameter list changed. */
        readonly parameterListChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStream;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStream;
    }
    namespace AudioStreamGenerator {
        enum AudioStreamGeneratorMixRate {
            MixRateOutput = 0,
            MixRateInput = 1,
            MixRateCustom = 2,
            MixRateMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamGenerator extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamGenerator extends __NameMapAudioStream {
        mix_rate_mode: "mixRateMode";
        mix_rate: "mixRate";
        buffer_length: "bufferLength";
    }
    /** An audio stream with utilities for procedural sound generation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamgenerator.html  
     */
    class AudioStreamGenerator extends AudioStream {
        constructor(identifier?: any)
        /** Mixing rate mode. If set to [constant MIX_RATE_CUSTOM], [member mix_rate] is used, otherwise current [AudioServer] mixing rate is used. */
        get mixRateMode(): int64
        set mixRateMode(value: int64)
        
        /** The sample rate to use (in Hz). Higher values are more demanding for the CPU to generate, but result in better quality.  
         *  In games, common sample rates in use are `11025`, `16000`, `22050`, `32000`, `44100`, and `48000`.  
         *  According to the [url=https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem]Nyquist-Shannon sampling theorem[/url], there is no quality difference to human hearing when going past 40,000 Hz (since most humans can only hear up to ~20,000 Hz, often less). If you are generating lower-pitched sounds such as voices, lower sample rates such as `32000` or `22050` may be usable with no loss in quality.  
         *      
         *  **Note:** [AudioStreamGenerator] is not automatically resampling input data, to produce expected result [member mix_rate_mode] should match the sampling rate of input data.  
         *      
         *  **Note:** If you are using [AudioEffectCapture] as the source of your data, set [member mix_rate_mode] to [constant MIX_RATE_INPUT] or [constant MIX_RATE_OUTPUT] to automatically match current [AudioServer] mixing rate.  
         */
        get mixRate(): float64
        set mixRate(value: float64)
        
        /** The length of the buffer to generate (in seconds). Lower values result in less latency, but require the script to generate audio data faster, resulting in increased CPU usage and more risk for audio cracking if the CPU can't keep up. */
        get bufferLength(): float64
        set bufferLength(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamGenerator;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamGenerator;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamGeneratorPlayback extends __RPCMapAudioStreamPlaybackResampled {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamGeneratorPlayback extends __NameMapAudioStreamPlaybackResampled {
        push_frame: "pushFrame";
        can_push_buffer: "canPushBuffer";
        push_buffer: "pushBuffer";
        get_frames_available: "getFramesAvailable";
        get_skips: "getSkips";
        clear_buffer: "clearBuffer";
    }
    /** Plays back audio generated using [AudioStreamGenerator].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamgeneratorplayback.html  
     */
    class AudioStreamGeneratorPlayback extends AudioStreamPlaybackResampled {
        constructor(identifier?: any)
        /** Pushes a single audio data frame to the buffer. This is usually less efficient than [method push_buffer] in C# and compiled languages via GDExtension, but [method push_frame] may be  *more*  efficient in GDScript. */
        pushFrame(frame: Vector2): boolean
        
        /** Returns `true` if a buffer of the size [param amount] can be pushed to the audio sample data buffer without overflowing it, `false` otherwise. */
        canPushBuffer(amount: int64): boolean
        
        /** Pushes several audio data frames to the buffer. This is usually more efficient than [method push_frame] in C# and compiled languages via GDExtension, but [method push_buffer] may be  *less*  efficient in GDScript. */
        pushBuffer(frames: PackedVector2Array | Vector2[]): boolean
        
        /** Returns the number of frames that can be pushed to the audio sample data buffer without overflowing it. If the result is `0`, the buffer is full. */
        getFramesAvailable(): int64
        
        /** Returns the number of times the playback skipped due to a buffer underrun in the audio sample data. This value is reset at the start of the playback. */
        getSkips(): int64
        
        /** Clears the audio sample data buffer. */
        clearBuffer(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamGeneratorPlayback;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamGeneratorPlayback;
    }
    namespace AudioStreamInteractive {
        enum TransitionFromTime {
            TransitionFromTimeImmediate = 0,
            TransitionFromTimeNextBeat = 1,
            TransitionFromTimeNextBar = 2,
            TransitionFromTimeEnd = 3,
        }
        enum TransitionToTime {
            TransitionToTimeSamePosition = 0,
            TransitionToTimeStart = 1,
            TransitionToTimePreviousPosition = 2,
        }
        enum FadeMode {
            FadeDisabled = 0,
            FadeIn = 1,
            FadeOut = 2,
            FadeCross = 3,
            FadeAutomatic = 4,
        }
        enum AutoAdvanceMode {
            AutoAdvanceDisabled = 0,
            AutoAdvanceEnabled = 1,
            AutoAdvanceReturnToHold = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamInteractive extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamInteractive extends __NameMapAudioStream {
        _get_linked_undo_properties: "_getLinkedUndoProperties";
        _inspector_array_swap_clip: "_inspectorArraySwapClip";
        set_clip_name: "setClipName";
        get_clip_name: "getClipName";
        set_clip_stream: "setClipStream";
        get_clip_stream: "getClipStream";
        set_clip_auto_advance: "setClipAutoAdvance";
        get_clip_auto_advance: "getClipAutoAdvance";
        set_clip_auto_advance_next_clip: "setClipAutoAdvanceNextClip";
        get_clip_auto_advance_next_clip: "getClipAutoAdvanceNextClip";
        add_transition: "addTransition";
        has_transition: "hasTransition";
        erase_transition: "eraseTransition";
        get_transition_list: "getTransitionList";
        get_transition_from_time: "getTransitionFromTime";
        get_transition_to_time: "getTransitionToTime";
        get_transition_fade_mode: "getTransitionFadeMode";
        get_transition_fade_beats: "getTransitionFadeBeats";
        is_transition_using_filler_clip: "isTransitionUsingFillerClip";
        get_transition_filler_clip: "getTransitionFillerClip";
        is_transition_holding_previous: "isTransitionHoldingPrevious";
        clip_count: "clipCount";
        "clip_0/name": "clip0/name";
        "clip_0/stream": "clip0/stream";
        "clip_0/auto_advance": "clip0/autoAdvance";
        "clip_0/next_clip": "clip0/nextClip";
        "clip_1/name": "clip1/name";
        "clip_1/stream": "clip1/stream";
        "clip_1/auto_advance": "clip1/autoAdvance";
        "clip_1/next_clip": "clip1/nextClip";
        "clip_2/name": "clip2/name";
        "clip_2/stream": "clip2/stream";
        "clip_2/auto_advance": "clip2/autoAdvance";
        "clip_2/next_clip": "clip2/nextClip";
        "clip_3/name": "clip3/name";
        "clip_3/stream": "clip3/stream";
        "clip_3/auto_advance": "clip3/autoAdvance";
        "clip_3/next_clip": "clip3/nextClip";
        "clip_4/name": "clip4/name";
        "clip_4/stream": "clip4/stream";
        "clip_4/auto_advance": "clip4/autoAdvance";
        "clip_4/next_clip": "clip4/nextClip";
        "clip_5/name": "clip5/name";
        "clip_5/stream": "clip5/stream";
        "clip_5/auto_advance": "clip5/autoAdvance";
        "clip_5/next_clip": "clip5/nextClip";
        "clip_6/name": "clip6/name";
        "clip_6/stream": "clip6/stream";
        "clip_6/auto_advance": "clip6/autoAdvance";
        "clip_6/next_clip": "clip6/nextClip";
        "clip_7/name": "clip7/name";
        "clip_7/stream": "clip7/stream";
        "clip_7/auto_advance": "clip7/autoAdvance";
        "clip_7/next_clip": "clip7/nextClip";
        "clip_8/name": "clip8/name";
        "clip_8/stream": "clip8/stream";
        "clip_8/auto_advance": "clip8/autoAdvance";
        "clip_8/next_clip": "clip8/nextClip";
        "clip_9/name": "clip9/name";
        "clip_9/stream": "clip9/stream";
        "clip_9/auto_advance": "clip9/autoAdvance";
        "clip_9/next_clip": "clip9/nextClip";
        "clip_10/name": "clip10/name";
        "clip_10/stream": "clip10/stream";
        "clip_10/auto_advance": "clip10/autoAdvance";
        "clip_10/next_clip": "clip10/nextClip";
        "clip_11/name": "clip11/name";
        "clip_11/stream": "clip11/stream";
        "clip_11/auto_advance": "clip11/autoAdvance";
        "clip_11/next_clip": "clip11/nextClip";
        "clip_12/name": "clip12/name";
        "clip_12/stream": "clip12/stream";
        "clip_12/auto_advance": "clip12/autoAdvance";
        "clip_12/next_clip": "clip12/nextClip";
        "clip_13/name": "clip13/name";
        "clip_13/stream": "clip13/stream";
        "clip_13/auto_advance": "clip13/autoAdvance";
        "clip_13/next_clip": "clip13/nextClip";
        "clip_14/name": "clip14/name";
        "clip_14/stream": "clip14/stream";
        "clip_14/auto_advance": "clip14/autoAdvance";
        "clip_14/next_clip": "clip14/nextClip";
        "clip_15/name": "clip15/name";
        "clip_15/stream": "clip15/stream";
        "clip_15/auto_advance": "clip15/autoAdvance";
        "clip_15/next_clip": "clip15/nextClip";
        "clip_16/name": "clip16/name";
        "clip_16/stream": "clip16/stream";
        "clip_16/auto_advance": "clip16/autoAdvance";
        "clip_16/next_clip": "clip16/nextClip";
        "clip_17/name": "clip17/name";
        "clip_17/stream": "clip17/stream";
        "clip_17/auto_advance": "clip17/autoAdvance";
        "clip_17/next_clip": "clip17/nextClip";
        "clip_18/name": "clip18/name";
        "clip_18/stream": "clip18/stream";
        "clip_18/auto_advance": "clip18/autoAdvance";
        "clip_18/next_clip": "clip18/nextClip";
        "clip_19/name": "clip19/name";
        "clip_19/stream": "clip19/stream";
        "clip_19/auto_advance": "clip19/autoAdvance";
        "clip_19/next_clip": "clip19/nextClip";
        "clip_20/name": "clip20/name";
        "clip_20/stream": "clip20/stream";
        "clip_20/auto_advance": "clip20/autoAdvance";
        "clip_20/next_clip": "clip20/nextClip";
        "clip_21/name": "clip21/name";
        "clip_21/stream": "clip21/stream";
        "clip_21/auto_advance": "clip21/autoAdvance";
        "clip_21/next_clip": "clip21/nextClip";
        "clip_22/name": "clip22/name";
        "clip_22/stream": "clip22/stream";
        "clip_22/auto_advance": "clip22/autoAdvance";
        "clip_22/next_clip": "clip22/nextClip";
        "clip_23/name": "clip23/name";
        "clip_23/stream": "clip23/stream";
        "clip_23/auto_advance": "clip23/autoAdvance";
        "clip_23/next_clip": "clip23/nextClip";
        "clip_24/name": "clip24/name";
        "clip_24/stream": "clip24/stream";
        "clip_24/auto_advance": "clip24/autoAdvance";
        "clip_24/next_clip": "clip24/nextClip";
        "clip_25/name": "clip25/name";
        "clip_25/stream": "clip25/stream";
        "clip_25/auto_advance": "clip25/autoAdvance";
        "clip_25/next_clip": "clip25/nextClip";
        "clip_26/name": "clip26/name";
        "clip_26/stream": "clip26/stream";
        "clip_26/auto_advance": "clip26/autoAdvance";
        "clip_26/next_clip": "clip26/nextClip";
        "clip_27/name": "clip27/name";
        "clip_27/stream": "clip27/stream";
        "clip_27/auto_advance": "clip27/autoAdvance";
        "clip_27/next_clip": "clip27/nextClip";
        "clip_28/name": "clip28/name";
        "clip_28/stream": "clip28/stream";
        "clip_28/auto_advance": "clip28/autoAdvance";
        "clip_28/next_clip": "clip28/nextClip";
        "clip_29/name": "clip29/name";
        "clip_29/stream": "clip29/stream";
        "clip_29/auto_advance": "clip29/autoAdvance";
        "clip_29/next_clip": "clip29/nextClip";
        "clip_30/name": "clip30/name";
        "clip_30/stream": "clip30/stream";
        "clip_30/auto_advance": "clip30/autoAdvance";
        "clip_30/next_clip": "clip30/nextClip";
        "clip_31/name": "clip31/name";
        "clip_31/stream": "clip31/stream";
        "clip_31/auto_advance": "clip31/autoAdvance";
        "clip_31/next_clip": "clip31/nextClip";
        "clip_32/name": "clip32/name";
        "clip_32/stream": "clip32/stream";
        "clip_32/auto_advance": "clip32/autoAdvance";
        "clip_32/next_clip": "clip32/nextClip";
        "clip_33/name": "clip33/name";
        "clip_33/stream": "clip33/stream";
        "clip_33/auto_advance": "clip33/autoAdvance";
        "clip_33/next_clip": "clip33/nextClip";
        "clip_34/name": "clip34/name";
        "clip_34/stream": "clip34/stream";
        "clip_34/auto_advance": "clip34/autoAdvance";
        "clip_34/next_clip": "clip34/nextClip";
        "clip_35/name": "clip35/name";
        "clip_35/stream": "clip35/stream";
        "clip_35/auto_advance": "clip35/autoAdvance";
        "clip_35/next_clip": "clip35/nextClip";
        "clip_36/name": "clip36/name";
        "clip_36/stream": "clip36/stream";
        "clip_36/auto_advance": "clip36/autoAdvance";
        "clip_36/next_clip": "clip36/nextClip";
        "clip_37/name": "clip37/name";
        "clip_37/stream": "clip37/stream";
        "clip_37/auto_advance": "clip37/autoAdvance";
        "clip_37/next_clip": "clip37/nextClip";
        "clip_38/name": "clip38/name";
        "clip_38/stream": "clip38/stream";
        "clip_38/auto_advance": "clip38/autoAdvance";
        "clip_38/next_clip": "clip38/nextClip";
        "clip_39/name": "clip39/name";
        "clip_39/stream": "clip39/stream";
        "clip_39/auto_advance": "clip39/autoAdvance";
        "clip_39/next_clip": "clip39/nextClip";
        "clip_40/name": "clip40/name";
        "clip_40/stream": "clip40/stream";
        "clip_40/auto_advance": "clip40/autoAdvance";
        "clip_40/next_clip": "clip40/nextClip";
        "clip_41/name": "clip41/name";
        "clip_41/stream": "clip41/stream";
        "clip_41/auto_advance": "clip41/autoAdvance";
        "clip_41/next_clip": "clip41/nextClip";
        "clip_42/name": "clip42/name";
        "clip_42/stream": "clip42/stream";
        "clip_42/auto_advance": "clip42/autoAdvance";
        "clip_42/next_clip": "clip42/nextClip";
        "clip_43/name": "clip43/name";
        "clip_43/stream": "clip43/stream";
        "clip_43/auto_advance": "clip43/autoAdvance";
        "clip_43/next_clip": "clip43/nextClip";
        "clip_44/name": "clip44/name";
        "clip_44/stream": "clip44/stream";
        "clip_44/auto_advance": "clip44/autoAdvance";
        "clip_44/next_clip": "clip44/nextClip";
        "clip_45/name": "clip45/name";
        "clip_45/stream": "clip45/stream";
        "clip_45/auto_advance": "clip45/autoAdvance";
        "clip_45/next_clip": "clip45/nextClip";
        "clip_46/name": "clip46/name";
        "clip_46/stream": "clip46/stream";
        "clip_46/auto_advance": "clip46/autoAdvance";
        "clip_46/next_clip": "clip46/nextClip";
        "clip_47/name": "clip47/name";
        "clip_47/stream": "clip47/stream";
        "clip_47/auto_advance": "clip47/autoAdvance";
        "clip_47/next_clip": "clip47/nextClip";
        "clip_48/name": "clip48/name";
        "clip_48/stream": "clip48/stream";
        "clip_48/auto_advance": "clip48/autoAdvance";
        "clip_48/next_clip": "clip48/nextClip";
        "clip_49/name": "clip49/name";
        "clip_49/stream": "clip49/stream";
        "clip_49/auto_advance": "clip49/autoAdvance";
        "clip_49/next_clip": "clip49/nextClip";
        "clip_50/name": "clip50/name";
        "clip_50/stream": "clip50/stream";
        "clip_50/auto_advance": "clip50/autoAdvance";
        "clip_50/next_clip": "clip50/nextClip";
        "clip_51/name": "clip51/name";
        "clip_51/stream": "clip51/stream";
        "clip_51/auto_advance": "clip51/autoAdvance";
        "clip_51/next_clip": "clip51/nextClip";
        "clip_52/name": "clip52/name";
        "clip_52/stream": "clip52/stream";
        "clip_52/auto_advance": "clip52/autoAdvance";
        "clip_52/next_clip": "clip52/nextClip";
        "clip_53/name": "clip53/name";
        "clip_53/stream": "clip53/stream";
        "clip_53/auto_advance": "clip53/autoAdvance";
        "clip_53/next_clip": "clip53/nextClip";
        "clip_54/name": "clip54/name";
        "clip_54/stream": "clip54/stream";
        "clip_54/auto_advance": "clip54/autoAdvance";
        "clip_54/next_clip": "clip54/nextClip";
        "clip_55/name": "clip55/name";
        "clip_55/stream": "clip55/stream";
        "clip_55/auto_advance": "clip55/autoAdvance";
        "clip_55/next_clip": "clip55/nextClip";
        "clip_56/name": "clip56/name";
        "clip_56/stream": "clip56/stream";
        "clip_56/auto_advance": "clip56/autoAdvance";
        "clip_56/next_clip": "clip56/nextClip";
        "clip_57/name": "clip57/name";
        "clip_57/stream": "clip57/stream";
        "clip_57/auto_advance": "clip57/autoAdvance";
        "clip_57/next_clip": "clip57/nextClip";
        "clip_58/name": "clip58/name";
        "clip_58/stream": "clip58/stream";
        "clip_58/auto_advance": "clip58/autoAdvance";
        "clip_58/next_clip": "clip58/nextClip";
        "clip_59/name": "clip59/name";
        "clip_59/stream": "clip59/stream";
        "clip_59/auto_advance": "clip59/autoAdvance";
        "clip_59/next_clip": "clip59/nextClip";
        "clip_60/name": "clip60/name";
        "clip_60/stream": "clip60/stream";
        "clip_60/auto_advance": "clip60/autoAdvance";
        "clip_60/next_clip": "clip60/nextClip";
        "clip_61/name": "clip61/name";
        "clip_61/stream": "clip61/stream";
        "clip_61/auto_advance": "clip61/autoAdvance";
        "clip_61/next_clip": "clip61/nextClip";
        "clip_62/name": "clip62/name";
        "clip_62/stream": "clip62/stream";
        "clip_62/auto_advance": "clip62/autoAdvance";
        "clip_62/next_clip": "clip62/nextClip";
        initial_clip: "initialClip";
    }
    /** Audio stream that can playback music interactively, combining clips and a transition table.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreaminteractive.html  
     */
    class AudioStreamInteractive extends AudioStream {
        /** This constant describes that any clip is valid for a specific transition as either source or destination. */
        static readonly CLIP_ANY = -1
        constructor(identifier?: any)
        _getLinkedUndoProperties(forProperty: string, forValue: any): PackedStringArray
        _inspectorArraySwapClip(a: int64, b: int64): void
        
        /** Set the name of the current clip (for easier identification). */
        setClipName(clipIndex: int64, name: StringName): void
        
        /** Return the name of a clip. */
        getClipName(clipIndex: int64): StringName
        
        /** Set the [AudioStream] associated with the current clip. */
        setClipStream(clipIndex: int64, stream: AudioStream): void
        
        /** Return the [AudioStream] associated with a clip. */
        getClipStream(clipIndex: int64): null | AudioStream
        
        /** Set whether a clip will auto-advance by changing the auto-advance mode. */
        setClipAutoAdvance(clipIndex: int64, mode: AudioStreamInteractive.AutoAdvanceMode): void
        
        /** Return whether a clip has auto-advance enabled. See [method set_clip_auto_advance]. */
        getClipAutoAdvance(clipIndex: int64): AudioStreamInteractive.AutoAdvanceMode
        
        /** Set the index of the next clip towards which this clip will auto advance to when finished. If the clip being played loops, then auto-advance will be ignored. */
        setClipAutoAdvanceNextClip(clipIndex: int64, autoAdvanceNextClip: int64): void
        
        /** Return the clip towards which the clip referenced by [param clip_index] will auto-advance to. */
        getClipAutoAdvanceNextClip(clipIndex: int64): int64
        
        /** Add a transition between two clips. Provide the indices of the source and destination clips, or use the [constant CLIP_ANY] constant to indicate that transition happens to/from any clip to this one.  
         *  * [param from_time] indicates the moment in the current clip the transition will begin after triggered.  
         *  * [param to_time] indicates the time in the next clip that the playback will start from.  
         *  * [param fade_mode] indicates how the fade will happen between clips. If unsure, just use [constant FADE_AUTOMATIC] which uses the most common type of fade for each situation.  
         *  * [param fade_beats] indicates how many beats the fade will take. Using decimals is allowed.  
         *  * [param use_filler_clip] indicates that there will be a filler clip used between the source and destination clips.  
         *  * [param filler_clip] the index of the filler clip.  
         *  * If [param hold_previous] is used, then this clip will be remembered. This can be used together with [constant AUTO_ADVANCE_RETURN_TO_HOLD] to return to this clip after another is done playing.  
         */
        addTransition(fromClip: int64, toClip: int64, fromTime: AudioStreamInteractive.TransitionFromTime, toTime: AudioStreamInteractive.TransitionToTime, fadeMode: AudioStreamInteractive.FadeMode, fadeBeats: float64, useFillerClip?: boolean /* = false */, fillerClip?: int64 /* = -1 */, holdPrevious?: boolean /* = false */): void
        
        /** Returns `true` if a given transition exists (was added via [method add_transition]). */
        hasTransition(fromClip: int64, toClip: int64): boolean
        
        /** Erase a transition by providing [param from_clip] and [param to_clip] clip indices. [constant CLIP_ANY] can be used for either argument or both. */
        eraseTransition(fromClip: int64, toClip: int64): void
        
        /** Return the list of transitions (from, to interleaved). */
        getTransitionList(): PackedInt32Array
        
        /** Return the source time position for a transition (see [method add_transition]). */
        getTransitionFromTime(fromClip: int64, toClip: int64): AudioStreamInteractive.TransitionFromTime
        
        /** Return the destination time position for a transition (see [method add_transition]). */
        getTransitionToTime(fromClip: int64, toClip: int64): AudioStreamInteractive.TransitionToTime
        
        /** Return the mode for a transition (see [method add_transition]). */
        getTransitionFadeMode(fromClip: int64, toClip: int64): AudioStreamInteractive.FadeMode
        
        /** Return the time (in beats) for a transition (see [method add_transition]). */
        getTransitionFadeBeats(fromClip: int64, toClip: int64): float64
        
        /** Return whether a transition uses the  *filler clip*  functionality (see [method add_transition]). */
        isTransitionUsingFillerClip(fromClip: int64, toClip: int64): boolean
        
        /** Return the filler clip for a transition (see [method add_transition]). */
        getTransitionFillerClip(fromClip: int64, toClip: int64): int64
        
        /** Return whether a transition uses the  *hold previous*  functionality (see [method add_transition]). */
        isTransitionHoldingPrevious(fromClip: int64, toClip: int64): boolean
        
        /** Amount of clips contained in this interactive player. */
        get clipCount(): int64
        set clipCount(value: int64)
        get "clip0/name"(): StringName
        set "clip0/name"(value: StringName)
        get "clip0/stream"(): null | AudioStream
        set "clip0/stream"(value: null | AudioStream)
        get "clip0/autoAdvance"(): int64
        set "clip0/autoAdvance"(value: int64)
        get "clip0/nextClip"(): int64
        set "clip0/nextClip"(value: int64)
        get "clip1/name"(): StringName
        set "clip1/name"(value: StringName)
        get "clip1/stream"(): null | AudioStream
        set "clip1/stream"(value: null | AudioStream)
        get "clip1/autoAdvance"(): int64
        set "clip1/autoAdvance"(value: int64)
        get "clip1/nextClip"(): int64
        set "clip1/nextClip"(value: int64)
        get "clip2/name"(): StringName
        set "clip2/name"(value: StringName)
        get "clip2/stream"(): null | AudioStream
        set "clip2/stream"(value: null | AudioStream)
        get "clip2/autoAdvance"(): int64
        set "clip2/autoAdvance"(value: int64)
        get "clip2/nextClip"(): int64
        set "clip2/nextClip"(value: int64)
        get "clip3/name"(): StringName
        set "clip3/name"(value: StringName)
        get "clip3/stream"(): null | AudioStream
        set "clip3/stream"(value: null | AudioStream)
        get "clip3/autoAdvance"(): int64
        set "clip3/autoAdvance"(value: int64)
        get "clip3/nextClip"(): int64
        set "clip3/nextClip"(value: int64)
        get "clip4/name"(): StringName
        set "clip4/name"(value: StringName)
        get "clip4/stream"(): null | AudioStream
        set "clip4/stream"(value: null | AudioStream)
        get "clip4/autoAdvance"(): int64
        set "clip4/autoAdvance"(value: int64)
        get "clip4/nextClip"(): int64
        set "clip4/nextClip"(value: int64)
        get "clip5/name"(): StringName
        set "clip5/name"(value: StringName)
        get "clip5/stream"(): null | AudioStream
        set "clip5/stream"(value: null | AudioStream)
        get "clip5/autoAdvance"(): int64
        set "clip5/autoAdvance"(value: int64)
        get "clip5/nextClip"(): int64
        set "clip5/nextClip"(value: int64)
        get "clip6/name"(): StringName
        set "clip6/name"(value: StringName)
        get "clip6/stream"(): null | AudioStream
        set "clip6/stream"(value: null | AudioStream)
        get "clip6/autoAdvance"(): int64
        set "clip6/autoAdvance"(value: int64)
        get "clip6/nextClip"(): int64
        set "clip6/nextClip"(value: int64)
        get "clip7/name"(): StringName
        set "clip7/name"(value: StringName)
        get "clip7/stream"(): null | AudioStream
        set "clip7/stream"(value: null | AudioStream)
        get "clip7/autoAdvance"(): int64
        set "clip7/autoAdvance"(value: int64)
        get "clip7/nextClip"(): int64
        set "clip7/nextClip"(value: int64)
        get "clip8/name"(): StringName
        set "clip8/name"(value: StringName)
        get "clip8/stream"(): null | AudioStream
        set "clip8/stream"(value: null | AudioStream)
        get "clip8/autoAdvance"(): int64
        set "clip8/autoAdvance"(value: int64)
        get "clip8/nextClip"(): int64
        set "clip8/nextClip"(value: int64)
        get "clip9/name"(): StringName
        set "clip9/name"(value: StringName)
        get "clip9/stream"(): null | AudioStream
        set "clip9/stream"(value: null | AudioStream)
        get "clip9/autoAdvance"(): int64
        set "clip9/autoAdvance"(value: int64)
        get "clip9/nextClip"(): int64
        set "clip9/nextClip"(value: int64)
        get "clip10/name"(): StringName
        set "clip10/name"(value: StringName)
        get "clip10/stream"(): null | AudioStream
        set "clip10/stream"(value: null | AudioStream)
        get "clip10/autoAdvance"(): int64
        set "clip10/autoAdvance"(value: int64)
        get "clip10/nextClip"(): int64
        set "clip10/nextClip"(value: int64)
        get "clip11/name"(): StringName
        set "clip11/name"(value: StringName)
        get "clip11/stream"(): null | AudioStream
        set "clip11/stream"(value: null | AudioStream)
        get "clip11/autoAdvance"(): int64
        set "clip11/autoAdvance"(value: int64)
        get "clip11/nextClip"(): int64
        set "clip11/nextClip"(value: int64)
        get "clip12/name"(): StringName
        set "clip12/name"(value: StringName)
        get "clip12/stream"(): null | AudioStream
        set "clip12/stream"(value: null | AudioStream)
        get "clip12/autoAdvance"(): int64
        set "clip12/autoAdvance"(value: int64)
        get "clip12/nextClip"(): int64
        set "clip12/nextClip"(value: int64)
        get "clip13/name"(): StringName
        set "clip13/name"(value: StringName)
        get "clip13/stream"(): null | AudioStream
        set "clip13/stream"(value: null | AudioStream)
        get "clip13/autoAdvance"(): int64
        set "clip13/autoAdvance"(value: int64)
        get "clip13/nextClip"(): int64
        set "clip13/nextClip"(value: int64)
        get "clip14/name"(): StringName
        set "clip14/name"(value: StringName)
        get "clip14/stream"(): null | AudioStream
        set "clip14/stream"(value: null | AudioStream)
        get "clip14/autoAdvance"(): int64
        set "clip14/autoAdvance"(value: int64)
        get "clip14/nextClip"(): int64
        set "clip14/nextClip"(value: int64)
        get "clip15/name"(): StringName
        set "clip15/name"(value: StringName)
        get "clip15/stream"(): null | AudioStream
        set "clip15/stream"(value: null | AudioStream)
        get "clip15/autoAdvance"(): int64
        set "clip15/autoAdvance"(value: int64)
        get "clip15/nextClip"(): int64
        set "clip15/nextClip"(value: int64)
        get "clip16/name"(): StringName
        set "clip16/name"(value: StringName)
        get "clip16/stream"(): null | AudioStream
        set "clip16/stream"(value: null | AudioStream)
        get "clip16/autoAdvance"(): int64
        set "clip16/autoAdvance"(value: int64)
        get "clip16/nextClip"(): int64
        set "clip16/nextClip"(value: int64)
        get "clip17/name"(): StringName
        set "clip17/name"(value: StringName)
        get "clip17/stream"(): null | AudioStream
        set "clip17/stream"(value: null | AudioStream)
        get "clip17/autoAdvance"(): int64
        set "clip17/autoAdvance"(value: int64)
        get "clip17/nextClip"(): int64
        set "clip17/nextClip"(value: int64)
        get "clip18/name"(): StringName
        set "clip18/name"(value: StringName)
        get "clip18/stream"(): null | AudioStream
        set "clip18/stream"(value: null | AudioStream)
        get "clip18/autoAdvance"(): int64
        set "clip18/autoAdvance"(value: int64)
        get "clip18/nextClip"(): int64
        set "clip18/nextClip"(value: int64)
        get "clip19/name"(): StringName
        set "clip19/name"(value: StringName)
        get "clip19/stream"(): null | AudioStream
        set "clip19/stream"(value: null | AudioStream)
        get "clip19/autoAdvance"(): int64
        set "clip19/autoAdvance"(value: int64)
        get "clip19/nextClip"(): int64
        set "clip19/nextClip"(value: int64)
        get "clip20/name"(): StringName
        set "clip20/name"(value: StringName)
        get "clip20/stream"(): null | AudioStream
        set "clip20/stream"(value: null | AudioStream)
        get "clip20/autoAdvance"(): int64
        set "clip20/autoAdvance"(value: int64)
        get "clip20/nextClip"(): int64
        set "clip20/nextClip"(value: int64)
        get "clip21/name"(): StringName
        set "clip21/name"(value: StringName)
        get "clip21/stream"(): null | AudioStream
        set "clip21/stream"(value: null | AudioStream)
        get "clip21/autoAdvance"(): int64
        set "clip21/autoAdvance"(value: int64)
        get "clip21/nextClip"(): int64
        set "clip21/nextClip"(value: int64)
        get "clip22/name"(): StringName
        set "clip22/name"(value: StringName)
        get "clip22/stream"(): null | AudioStream
        set "clip22/stream"(value: null | AudioStream)
        get "clip22/autoAdvance"(): int64
        set "clip22/autoAdvance"(value: int64)
        get "clip22/nextClip"(): int64
        set "clip22/nextClip"(value: int64)
        get "clip23/name"(): StringName
        set "clip23/name"(value: StringName)
        get "clip23/stream"(): null | AudioStream
        set "clip23/stream"(value: null | AudioStream)
        get "clip23/autoAdvance"(): int64
        set "clip23/autoAdvance"(value: int64)
        get "clip23/nextClip"(): int64
        set "clip23/nextClip"(value: int64)
        get "clip24/name"(): StringName
        set "clip24/name"(value: StringName)
        get "clip24/stream"(): null | AudioStream
        set "clip24/stream"(value: null | AudioStream)
        get "clip24/autoAdvance"(): int64
        set "clip24/autoAdvance"(value: int64)
        get "clip24/nextClip"(): int64
        set "clip24/nextClip"(value: int64)
        get "clip25/name"(): StringName
        set "clip25/name"(value: StringName)
        get "clip25/stream"(): null | AudioStream
        set "clip25/stream"(value: null | AudioStream)
        get "clip25/autoAdvance"(): int64
        set "clip25/autoAdvance"(value: int64)
        get "clip25/nextClip"(): int64
        set "clip25/nextClip"(value: int64)
        get "clip26/name"(): StringName
        set "clip26/name"(value: StringName)
        get "clip26/stream"(): null | AudioStream
        set "clip26/stream"(value: null | AudioStream)
        get "clip26/autoAdvance"(): int64
        set "clip26/autoAdvance"(value: int64)
        get "clip26/nextClip"(): int64
        set "clip26/nextClip"(value: int64)
        get "clip27/name"(): StringName
        set "clip27/name"(value: StringName)
        get "clip27/stream"(): null | AudioStream
        set "clip27/stream"(value: null | AudioStream)
        get "clip27/autoAdvance"(): int64
        set "clip27/autoAdvance"(value: int64)
        get "clip27/nextClip"(): int64
        set "clip27/nextClip"(value: int64)
        get "clip28/name"(): StringName
        set "clip28/name"(value: StringName)
        get "clip28/stream"(): null | AudioStream
        set "clip28/stream"(value: null | AudioStream)
        get "clip28/autoAdvance"(): int64
        set "clip28/autoAdvance"(value: int64)
        get "clip28/nextClip"(): int64
        set "clip28/nextClip"(value: int64)
        get "clip29/name"(): StringName
        set "clip29/name"(value: StringName)
        get "clip29/stream"(): null | AudioStream
        set "clip29/stream"(value: null | AudioStream)
        get "clip29/autoAdvance"(): int64
        set "clip29/autoAdvance"(value: int64)
        get "clip29/nextClip"(): int64
        set "clip29/nextClip"(value: int64)
        get "clip30/name"(): StringName
        set "clip30/name"(value: StringName)
        get "clip30/stream"(): null | AudioStream
        set "clip30/stream"(value: null | AudioStream)
        get "clip30/autoAdvance"(): int64
        set "clip30/autoAdvance"(value: int64)
        get "clip30/nextClip"(): int64
        set "clip30/nextClip"(value: int64)
        get "clip31/name"(): StringName
        set "clip31/name"(value: StringName)
        get "clip31/stream"(): null | AudioStream
        set "clip31/stream"(value: null | AudioStream)
        get "clip31/autoAdvance"(): int64
        set "clip31/autoAdvance"(value: int64)
        get "clip31/nextClip"(): int64
        set "clip31/nextClip"(value: int64)
        get "clip32/name"(): StringName
        set "clip32/name"(value: StringName)
        get "clip32/stream"(): null | AudioStream
        set "clip32/stream"(value: null | AudioStream)
        get "clip32/autoAdvance"(): int64
        set "clip32/autoAdvance"(value: int64)
        get "clip32/nextClip"(): int64
        set "clip32/nextClip"(value: int64)
        get "clip33/name"(): StringName
        set "clip33/name"(value: StringName)
        get "clip33/stream"(): null | AudioStream
        set "clip33/stream"(value: null | AudioStream)
        get "clip33/autoAdvance"(): int64
        set "clip33/autoAdvance"(value: int64)
        get "clip33/nextClip"(): int64
        set "clip33/nextClip"(value: int64)
        get "clip34/name"(): StringName
        set "clip34/name"(value: StringName)
        get "clip34/stream"(): null | AudioStream
        set "clip34/stream"(value: null | AudioStream)
        get "clip34/autoAdvance"(): int64
        set "clip34/autoAdvance"(value: int64)
        get "clip34/nextClip"(): int64
        set "clip34/nextClip"(value: int64)
        get "clip35/name"(): StringName
        set "clip35/name"(value: StringName)
        get "clip35/stream"(): null | AudioStream
        set "clip35/stream"(value: null | AudioStream)
        get "clip35/autoAdvance"(): int64
        set "clip35/autoAdvance"(value: int64)
        get "clip35/nextClip"(): int64
        set "clip35/nextClip"(value: int64)
        get "clip36/name"(): StringName
        set "clip36/name"(value: StringName)
        get "clip36/stream"(): null | AudioStream
        set "clip36/stream"(value: null | AudioStream)
        get "clip36/autoAdvance"(): int64
        set "clip36/autoAdvance"(value: int64)
        get "clip36/nextClip"(): int64
        set "clip36/nextClip"(value: int64)
        get "clip37/name"(): StringName
        set "clip37/name"(value: StringName)
        get "clip37/stream"(): null | AudioStream
        set "clip37/stream"(value: null | AudioStream)
        get "clip37/autoAdvance"(): int64
        set "clip37/autoAdvance"(value: int64)
        get "clip37/nextClip"(): int64
        set "clip37/nextClip"(value: int64)
        get "clip38/name"(): StringName
        set "clip38/name"(value: StringName)
        get "clip38/stream"(): null | AudioStream
        set "clip38/stream"(value: null | AudioStream)
        get "clip38/autoAdvance"(): int64
        set "clip38/autoAdvance"(value: int64)
        get "clip38/nextClip"(): int64
        set "clip38/nextClip"(value: int64)
        get "clip39/name"(): StringName
        set "clip39/name"(value: StringName)
        get "clip39/stream"(): null | AudioStream
        set "clip39/stream"(value: null | AudioStream)
        get "clip39/autoAdvance"(): int64
        set "clip39/autoAdvance"(value: int64)
        get "clip39/nextClip"(): int64
        set "clip39/nextClip"(value: int64)
        get "clip40/name"(): StringName
        set "clip40/name"(value: StringName)
        get "clip40/stream"(): null | AudioStream
        set "clip40/stream"(value: null | AudioStream)
        get "clip40/autoAdvance"(): int64
        set "clip40/autoAdvance"(value: int64)
        get "clip40/nextClip"(): int64
        set "clip40/nextClip"(value: int64)
        get "clip41/name"(): StringName
        set "clip41/name"(value: StringName)
        get "clip41/stream"(): null | AudioStream
        set "clip41/stream"(value: null | AudioStream)
        get "clip41/autoAdvance"(): int64
        set "clip41/autoAdvance"(value: int64)
        get "clip41/nextClip"(): int64
        set "clip41/nextClip"(value: int64)
        get "clip42/name"(): StringName
        set "clip42/name"(value: StringName)
        get "clip42/stream"(): null | AudioStream
        set "clip42/stream"(value: null | AudioStream)
        get "clip42/autoAdvance"(): int64
        set "clip42/autoAdvance"(value: int64)
        get "clip42/nextClip"(): int64
        set "clip42/nextClip"(value: int64)
        get "clip43/name"(): StringName
        set "clip43/name"(value: StringName)
        get "clip43/stream"(): null | AudioStream
        set "clip43/stream"(value: null | AudioStream)
        get "clip43/autoAdvance"(): int64
        set "clip43/autoAdvance"(value: int64)
        get "clip43/nextClip"(): int64
        set "clip43/nextClip"(value: int64)
        get "clip44/name"(): StringName
        set "clip44/name"(value: StringName)
        get "clip44/stream"(): null | AudioStream
        set "clip44/stream"(value: null | AudioStream)
        get "clip44/autoAdvance"(): int64
        set "clip44/autoAdvance"(value: int64)
        get "clip44/nextClip"(): int64
        set "clip44/nextClip"(value: int64)
        get "clip45/name"(): StringName
        set "clip45/name"(value: StringName)
        get "clip45/stream"(): null | AudioStream
        set "clip45/stream"(value: null | AudioStream)
        get "clip45/autoAdvance"(): int64
        set "clip45/autoAdvance"(value: int64)
        get "clip45/nextClip"(): int64
        set "clip45/nextClip"(value: int64)
        get "clip46/name"(): StringName
        set "clip46/name"(value: StringName)
        get "clip46/stream"(): null | AudioStream
        set "clip46/stream"(value: null | AudioStream)
        get "clip46/autoAdvance"(): int64
        set "clip46/autoAdvance"(value: int64)
        get "clip46/nextClip"(): int64
        set "clip46/nextClip"(value: int64)
        get "clip47/name"(): StringName
        set "clip47/name"(value: StringName)
        get "clip47/stream"(): null | AudioStream
        set "clip47/stream"(value: null | AudioStream)
        get "clip47/autoAdvance"(): int64
        set "clip47/autoAdvance"(value: int64)
        get "clip47/nextClip"(): int64
        set "clip47/nextClip"(value: int64)
        get "clip48/name"(): StringName
        set "clip48/name"(value: StringName)
        get "clip48/stream"(): null | AudioStream
        set "clip48/stream"(value: null | AudioStream)
        get "clip48/autoAdvance"(): int64
        set "clip48/autoAdvance"(value: int64)
        get "clip48/nextClip"(): int64
        set "clip48/nextClip"(value: int64)
        get "clip49/name"(): StringName
        set "clip49/name"(value: StringName)
        get "clip49/stream"(): null | AudioStream
        set "clip49/stream"(value: null | AudioStream)
        get "clip49/autoAdvance"(): int64
        set "clip49/autoAdvance"(value: int64)
        get "clip49/nextClip"(): int64
        set "clip49/nextClip"(value: int64)
        get "clip50/name"(): StringName
        set "clip50/name"(value: StringName)
        get "clip50/stream"(): null | AudioStream
        set "clip50/stream"(value: null | AudioStream)
        get "clip50/autoAdvance"(): int64
        set "clip50/autoAdvance"(value: int64)
        get "clip50/nextClip"(): int64
        set "clip50/nextClip"(value: int64)
        get "clip51/name"(): StringName
        set "clip51/name"(value: StringName)
        get "clip51/stream"(): null | AudioStream
        set "clip51/stream"(value: null | AudioStream)
        get "clip51/autoAdvance"(): int64
        set "clip51/autoAdvance"(value: int64)
        get "clip51/nextClip"(): int64
        set "clip51/nextClip"(value: int64)
        get "clip52/name"(): StringName
        set "clip52/name"(value: StringName)
        get "clip52/stream"(): null | AudioStream
        set "clip52/stream"(value: null | AudioStream)
        get "clip52/autoAdvance"(): int64
        set "clip52/autoAdvance"(value: int64)
        get "clip52/nextClip"(): int64
        set "clip52/nextClip"(value: int64)
        get "clip53/name"(): StringName
        set "clip53/name"(value: StringName)
        get "clip53/stream"(): null | AudioStream
        set "clip53/stream"(value: null | AudioStream)
        get "clip53/autoAdvance"(): int64
        set "clip53/autoAdvance"(value: int64)
        get "clip53/nextClip"(): int64
        set "clip53/nextClip"(value: int64)
        get "clip54/name"(): StringName
        set "clip54/name"(value: StringName)
        get "clip54/stream"(): null | AudioStream
        set "clip54/stream"(value: null | AudioStream)
        get "clip54/autoAdvance"(): int64
        set "clip54/autoAdvance"(value: int64)
        get "clip54/nextClip"(): int64
        set "clip54/nextClip"(value: int64)
        get "clip55/name"(): StringName
        set "clip55/name"(value: StringName)
        get "clip55/stream"(): null | AudioStream
        set "clip55/stream"(value: null | AudioStream)
        get "clip55/autoAdvance"(): int64
        set "clip55/autoAdvance"(value: int64)
        get "clip55/nextClip"(): int64
        set "clip55/nextClip"(value: int64)
        get "clip56/name"(): StringName
        set "clip56/name"(value: StringName)
        get "clip56/stream"(): null | AudioStream
        set "clip56/stream"(value: null | AudioStream)
        get "clip56/autoAdvance"(): int64
        set "clip56/autoAdvance"(value: int64)
        get "clip56/nextClip"(): int64
        set "clip56/nextClip"(value: int64)
        get "clip57/name"(): StringName
        set "clip57/name"(value: StringName)
        get "clip57/stream"(): null | AudioStream
        set "clip57/stream"(value: null | AudioStream)
        get "clip57/autoAdvance"(): int64
        set "clip57/autoAdvance"(value: int64)
        get "clip57/nextClip"(): int64
        set "clip57/nextClip"(value: int64)
        get "clip58/name"(): StringName
        set "clip58/name"(value: StringName)
        get "clip58/stream"(): null | AudioStream
        set "clip58/stream"(value: null | AudioStream)
        get "clip58/autoAdvance"(): int64
        set "clip58/autoAdvance"(value: int64)
        get "clip58/nextClip"(): int64
        set "clip58/nextClip"(value: int64)
        get "clip59/name"(): StringName
        set "clip59/name"(value: StringName)
        get "clip59/stream"(): null | AudioStream
        set "clip59/stream"(value: null | AudioStream)
        get "clip59/autoAdvance"(): int64
        set "clip59/autoAdvance"(value: int64)
        get "clip59/nextClip"(): int64
        set "clip59/nextClip"(value: int64)
        get "clip60/name"(): StringName
        set "clip60/name"(value: StringName)
        get "clip60/stream"(): null | AudioStream
        set "clip60/stream"(value: null | AudioStream)
        get "clip60/autoAdvance"(): int64
        set "clip60/autoAdvance"(value: int64)
        get "clip60/nextClip"(): int64
        set "clip60/nextClip"(value: int64)
        get "clip61/name"(): StringName
        set "clip61/name"(value: StringName)
        get "clip61/stream"(): null | AudioStream
        set "clip61/stream"(value: null | AudioStream)
        get "clip61/autoAdvance"(): int64
        set "clip61/autoAdvance"(value: int64)
        get "clip61/nextClip"(): int64
        set "clip61/nextClip"(value: int64)
        get "clip62/name"(): StringName
        set "clip62/name"(value: StringName)
        get "clip62/stream"(): null | AudioStream
        set "clip62/stream"(value: null | AudioStream)
        get "clip62/autoAdvance"(): int64
        set "clip62/autoAdvance"(value: int64)
        get "clip62/nextClip"(): int64
        set "clip62/nextClip"(value: int64)
        
        /** Index of the initial clip, which will be played first when this stream is played. */
        get initialClip(): int64
        set initialClip(value: int64)
        get _transitions(): GDictionary
        set _transitions(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamInteractive;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamInteractive;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamMP3 extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamMP3 extends __NameMapAudioStream {
        load_from_buffer: "loadFromBuffer";
        load_from_file: "loadFromFile";
        beat_count: "beatCount";
        bar_beats: "barBeats";
        loop_offset: "loopOffset";
    }
    /** MP3 audio stream driver.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreammp3.html  
     */
    class AudioStreamMP3 extends AudioStream {
        constructor(identifier?: any)
        /** Creates a new [AudioStreamMP3] instance from the given buffer. The buffer must contain MP3 data. */
        static loadFromBuffer(streamData: PackedByteArray | byte[] | ArrayBuffer): null | AudioStreamMP3
        
        /** Creates a new [AudioStreamMP3] instance from the given file path. The file must be in MP3 format. */
        static loadFromFile(path: string): null | AudioStreamMP3
        
        /** Contains the audio data in bytes.  
         *  You can load a file without having to import it beforehand using the code snippet below. Keep in mind that this snippet loads the whole file into memory and may not be ideal for huge files (hundreds of megabytes or more).  
         *    
         */
        get data(): PackedByteArray
        set data(value: PackedByteArray | byte[] | ArrayBuffer)
        
        /** The tempo of the audio track, measured in beats per minute. */
        get bpm(): float64
        set bpm(value: float64)
        
        /** The length of the audio track, in beats. The actual duration of the audio file might be longer than what is indicated by this property. It defines the end of the audio for looping, [AudioStreamPlaylist], and [AudioStreamInteractive]. */
        get beatCount(): int64
        set beatCount(value: int64)
        
        /** The number of beats within a single bar in the audio track. */
        get barBeats(): int64
        set barBeats(value: int64)
        
        /** If `true`, the stream will play again from the specified [member loop_offset] once it reaches the end of the audio track, or once it reaches the end of the last beat according to the amount specified in [member beat_count]. Useful for ambient sounds and background music. */
        get loop(): boolean
        set loop(value: boolean)
        
        /** Time in seconds at which the stream starts after being looped. */
        get loopOffset(): float64
        set loopOffset(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamMP3;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamMP3;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamMicrophone extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamMicrophone extends __NameMapAudioStream {
    }
    /** Plays real-time audio input data.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreammicrophone.html  
     */
    class AudioStreamMicrophone extends AudioStream {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamMicrophone;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamMicrophone;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamOggVorbis extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamOggVorbis extends __NameMapAudioStream {
        load_from_buffer: "loadFromBuffer";
        load_from_file: "loadFromFile";
        packet_sequence: "packetSequence";
        beat_count: "beatCount";
        bar_beats: "barBeats";
        loop_offset: "loopOffset";
    }
    /** A class representing an Ogg Vorbis audio stream.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamoggvorbis.html  
     */
    class AudioStreamOggVorbis extends AudioStream {
        constructor(identifier?: any)
        /** Creates a new [AudioStreamOggVorbis] instance from the given buffer. The buffer must contain Ogg Vorbis data. */
        static loadFromBuffer(streamData: PackedByteArray | byte[] | ArrayBuffer): null | AudioStreamOggVorbis
        
        /** Creates a new [AudioStreamOggVorbis] instance from the given file path. The file must be in Ogg Vorbis format. */
        static loadFromFile(path: string): null | AudioStreamOggVorbis
        
        /** Contains the raw Ogg data for this stream. */
        get packetSequence(): null | GObject
        set packetSequence(value: null | GObject)
        
        /** The tempo of the audio track, measured in beats per minute. */
        get bpm(): float64
        set bpm(value: float64)
        
        /** The length of the audio track, in beats. The actual duration of the audio file might be longer than what is indicated by this property. It defines the end of the audio for looping, [AudioStreamPlaylist], and [AudioStreamInteractive]. */
        get beatCount(): int64
        set beatCount(value: int64)
        
        /** The number of beats within a single bar in the audio track. */
        get barBeats(): int64
        set barBeats(value: int64)
        
        /** Contains user-defined tags if found in the Ogg Vorbis data.  
         *  Commonly used tags include `title`, `artist`, `album`, `tracknumber`, and `date` (`date` does not have a standard date format).  
         *      
         *  **Note:** No tag is  *guaranteed*  to be present in every file, so make sure to account for the keys not always existing.  
         */
        get tags(): GDictionary
        set tags(value: GDictionary)
        
        /** If `true`, the stream will play again from the specified [member loop_offset] once it reaches the end of the audio track, or once it reaches the end of the last beat according to the amount specified in [member beat_count]. Useful for ambient sounds and background music. */
        get loop(): boolean
        set loop(value: boolean)
        
        /** Time in seconds at which the stream starts after being looped. */
        get loopOffset(): float64
        set loopOffset(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamOggVorbis;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamOggVorbis;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlayback extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlayback extends __NameMapRefCounted {
        _is_playing: "_isPlaying";
        _get_loop_count: "_getLoopCount";
        _get_playback_position: "_getPlaybackPosition";
        _tag_used_streams: "_tagUsedStreams";
        _set_parameter: "_setParameter";
        _get_parameter: "_getParameter";
        set_sample_playback: "setSamplePlayback";
        get_sample_playback: "getSamplePlayback";
        mix_audio: "mixAudio";
        get_loop_count: "getLoopCount";
        get_playback_position: "getPlaybackPosition";
        is_playing: "isPlaying";
    }
    /** Meta class for playing back audio.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplayback.html  
     */
    class AudioStreamPlayback extends RefCounted {
        constructor(identifier?: any)
        /** Override this method to customize what happens when the playback starts at the given position, such as by calling [method AudioStreamPlayer.play]. */
        /* gdvirtual */ _start(fromPos: float64): void
        
        /** Override this method to customize what happens when the playback is stopped, such as by calling [method AudioStreamPlayer.stop]. */
        /* gdvirtual */ _stop(): void
        
        /** Overridable method. Should return `true` if this playback is active and playing its audio stream. */
        /* gdvirtual */ _isPlaying(): boolean
        
        /** Overridable method. Should return how many times this audio stream has looped. Most built-in playbacks always return `0`. */
        /* gdvirtual */ _getLoopCount(): int64
        
        /** Overridable method. Should return the current progress along the audio stream, in seconds. */
        /* gdvirtual */ _getPlaybackPosition(): float64
        
        /** Override this method to customize what happens when seeking this audio stream at the given [param position], such as by calling [method AudioStreamPlayer.seek]. */
        /* gdvirtual */ _seek(position: float64): void
        
        /** Override this method to customize how the audio stream is mixed. This method is called even if the playback is not active.  
         *      
         *  **Note:** It is not useful to override this method in GDScript or C#. Only GDExtension can take advantage of it.  
         */
        /* gdvirtual */ _mix(buffer: int64, rateScale: float64, frames: int64): int64
        
        /** Overridable method. Called whenever the audio stream is mixed if the playback is active and [method AudioServer.set_enable_tagging_used_audio_streams] has been set to `true`. Editor plugins may use this method to "tag" the current position along the audio stream and display it in a preview. */
        /* gdvirtual */ _tagUsedStreams(): void
        
        /** Set the current value of a playback parameter by name (see [method AudioStream._get_parameter_list]). */
        /* gdvirtual */ _setParameter(name: StringName, value: any): void
        
        /** Return the current value of a playback parameter by name (see [method AudioStream._get_parameter_list]). */
        /* gdvirtual */ _getParameter(name: StringName): any
        
        /** Associates [AudioSamplePlayback] to this [AudioStreamPlayback] for playing back the audio sample of this stream. */
        setSamplePlayback(playbackSample: AudioSamplePlayback): void
        
        /** Returns the [AudioSamplePlayback] associated with this [AudioStreamPlayback] for playing back the audio sample of this stream. */
        getSamplePlayback(): null | AudioSamplePlayback
        
        /** Mixes up to [param frames] of audio from the stream from the current position, at a rate of [param rate_scale], advancing the stream.  
         *  Returns a [PackedVector2Array] where each element holds the left and right channel volume levels of each frame.  
         *      
         *  **Note:** Can return fewer frames than requested, make sure to use the size of the return value.  
         */
        mixAudio(rateScale: float64, frames: int64): PackedVector2Array
        
        /** Starts the stream from the given [param from_pos], in seconds. */
        start(fromPos?: float64 /* = 0 */): void
        
        /** Seeks the stream at the given [param time], in seconds. */
        seek(time?: float64 /* = 0 */): void
        
        /** Stops the stream. */
        stop(): void
        
        /** Returns the number of times the stream has looped. */
        getLoopCount(): int64
        
        /** Returns the current position in the stream, in seconds. */
        getPlaybackPosition(): float64
        
        /** Returns `true` if the stream is playing. */
        isPlaying(): boolean
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlayback;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlayback;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaybackInteractive extends __RPCMapAudioStreamPlayback {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaybackInteractive extends __NameMapAudioStreamPlayback {
        switch_to_clip_by_name: "switchToClipByName";
        switch_to_clip: "switchToClip";
        get_current_clip_index: "getCurrentClipIndex";
    }
    /** Playback component of [AudioStreamInteractive].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaybackinteractive.html  
     */
    class AudioStreamPlaybackInteractive extends AudioStreamPlayback {
        constructor(identifier?: any)
        /** Switch to a clip (by name). */
        switchToClipByName(clipName: StringName): void
        
        /** Switch to a clip (by index). */
        switchToClip(clipIndex: int64): void
        
        /** Return the index of the currently playing clip. You can use this to get the name of the currently playing clip with [method AudioStreamInteractive.get_clip_name].  
         *  **Example:** Get the currently playing clip name from inside an [AudioStreamPlayer] node.  
         *    
         */
        getCurrentClipIndex(): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaybackInteractive;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaybackInteractive;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaybackOggVorbis extends __RPCMapAudioStreamPlaybackResampled {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaybackOggVorbis extends __NameMapAudioStreamPlaybackResampled {
    }
    /** Playback class used for [AudioStreamOggVorbis].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaybackoggvorbis.html  
     */
    class AudioStreamPlaybackOggVorbis extends AudioStreamPlaybackResampled {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaybackOggVorbis;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaybackOggVorbis;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaybackPlaylist extends __RPCMapAudioStreamPlayback {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaybackPlaylist extends __NameMapAudioStreamPlayback {
    }
    /** Playback class used for [AudioStreamPlaylist].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaybackplaylist.html  
     */
    class AudioStreamPlaybackPlaylist extends AudioStreamPlayback {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaybackPlaylist;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaybackPlaylist;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaybackPolyphonic extends __RPCMapAudioStreamPlayback {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaybackPolyphonic extends __NameMapAudioStreamPlayback {
        play_stream: "playStream";
        set_stream_volume: "setStreamVolume";
        set_stream_pitch_scale: "setStreamPitchScale";
        is_stream_playing: "isStreamPlaying";
        stop_stream: "stopStream";
    }
    /** Playback instance for [AudioStreamPolyphonic].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaybackpolyphonic.html  
     */
    class AudioStreamPlaybackPolyphonic extends AudioStreamPlayback {
        /** Returned by [method play_stream] in case it could not allocate a stream for playback. */
        static readonly INVALID_ID = -1
        constructor(identifier?: any)
        
        /** Play an [AudioStream] at a given offset, volume, pitch scale, playback type, and bus. Playback starts immediately.  
         *  The return value is a unique integer ID that is associated to this playback stream and which can be used to control it.  
         *  This ID becomes invalid when the stream ends (if it does not loop), when the [AudioStreamPlaybackPolyphonic] is stopped, or when [method stop_stream] is called.  
         *  This function returns [constant INVALID_ID] if the amount of streams currently playing equals [member AudioStreamPolyphonic.polyphony]. If you need a higher amount of maximum polyphony, raise this value.  
         */
        playStream(stream: AudioStream, fromOffset?: float64 /* = 0 */, volumeDb?: float64 /* = 0 */, pitchScale?: float64 /* = 1 */, playbackType?: AudioServer.PlaybackType /* = 0 */, bus?: StringName /* = 'Master' */): int64
        
        /** Change the stream volume (in db). The [param stream] argument is an integer ID returned by [method play_stream]. */
        setStreamVolume(stream: int64, volumeDb: float64): void
        
        /** Change the stream pitch scale. The [param stream] argument is an integer ID returned by [method play_stream]. */
        setStreamPitchScale(stream: int64, pitchScale: float64): void
        
        /** Returns `true` if the stream associated with the given integer ID is still playing. Check [method play_stream] for information on when this ID becomes invalid. */
        isStreamPlaying(stream: int64): boolean
        
        /** Stop a stream. The [param stream] argument is an integer ID returned by [method play_stream], which becomes invalid after calling this function. */
        stopStream(stream: int64): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaybackPolyphonic;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaybackPolyphonic;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaybackResampled extends __RPCMapAudioStreamPlayback {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaybackResampled extends __NameMapAudioStreamPlayback {
        _mix_resampled: "_mixResampled";
        _get_stream_sampling_rate: "_getStreamSamplingRate";
        begin_resample: "beginResample";
    }
    /** Playback class used for resampled [AudioStream]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaybackresampled.html  
     */
    class AudioStreamPlaybackResampled extends AudioStreamPlayback {
        constructor(identifier?: any)
        /** Called by [method begin_resample] to mix an [AudioStream] to [method AudioServer.get_mix_rate]. Uses [method _get_stream_sampling_rate] as the source sample rate. Returns the number of mixed frames. */
        /* gdvirtual */ _mixResampled(dstBuffer: int64, frameCount: int64): int64
        
        /** Returns an [AudioStream]'s sample rate, in Hz. Used to perform resampling. */
        /* gdvirtual */ _getStreamSamplingRate(): float64
        
        /** Called when an [AudioStream] is played. Clears the cubic interpolation history and starts mixing by calling [method _mix_resampled]. */
        beginResample(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaybackResampled;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaybackResampled;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaybackSynchronized extends __RPCMapAudioStreamPlayback {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaybackSynchronized extends __NameMapAudioStreamPlayback {
    }
    /** Playback class used for [AudioStreamSynchronized].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaybacksynchronized.html  
     */
    class AudioStreamPlaybackSynchronized extends AudioStreamPlayback {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaybackSynchronized;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaybackSynchronized;
    }
    namespace AudioStreamPlayer {
        enum MixTarget {
            MixTargetStereo = 0,
            MixTargetSurround = 1,
            MixTargetCenter = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlayer extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlayer extends __NameMapNode {
        get_playback_position: "getPlaybackPosition";
        has_stream_playback: "hasStreamPlayback";
        get_stream_playback: "getStreamPlayback";
        volume_db: "volumeDb";
        volume_linear: "volumeLinear";
        pitch_scale: "pitchScale";
        stream_paused: "streamPaused";
        mix_target: "mixTarget";
        max_polyphony: "maxPolyphony";
        playback_type: "playbackType";
    }
    /** A node for audio playback.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplayer.html  
     */
    class AudioStreamPlayer<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Plays a sound from the beginning, or the given [param from_position] in seconds. */
        play(fromPosition?: float64 /* = 0 */): void
        
        /** Restarts all sounds to be played from the given [param to_position], in seconds. Does nothing if no sounds are playing. */
        seek(toPosition: float64): void
        
        /** Stops all sounds from this node. */
        stop(): void
        
        /** Returns the position in the [AudioStream] of the latest sound, in seconds. Returns `0.0` if no sounds are playing.  
         *      
         *  **Note:** The position is not always accurate, as the [AudioServer] does not mix audio every processed frame. To get more accurate results, add [method AudioServer.get_time_since_last_mix] to the returned position.  
         *      
         *  **Note:** This method always returns `0.0` if the [member stream] is an [AudioStreamInteractive], since it can have multiple clips playing at once.  
         */
        getPlaybackPosition(): float64
        
        /** Returns `true` if any sound is active, even if [member stream_paused] is set to `true`. See also [member playing] and [method get_stream_playback]. */
        hasStreamPlayback(): boolean
        
        /** Returns the latest [AudioStreamPlayback] of this node, usually the most recently created by [method play]. If no sounds are playing, this method fails and returns an empty playback. */
        getStreamPlayback(): null | AudioStreamPlayback
        
        /** The [AudioStream] resource to be played. Setting this property stops all currently playing sounds. If left empty, the [AudioStreamPlayer] does not work. */
        get stream(): null | AudioStream
        set stream(value: null | AudioStream)
        
        /** Volume of sound, in decibels. This is an offset of the [member stream]'s volume.  
         *      
         *  **Note:** To convert between decibel and linear energy (like most volume sliders do), use [member volume_linear], or [method @GlobalScope.db_to_linear] and [method @GlobalScope.linear_to_db].  
         */
        get volumeDb(): float64
        set volumeDb(value: float64)
        
        /** Volume of sound, as a linear value.  
         *      
         *  **Note:** This member modifies [member volume_db] for convenience. The returned value is equivalent to the result of [method @GlobalScope.db_to_linear] on [member volume_db]. Setting this member is equivalent to setting [member volume_db] to the result of [method @GlobalScope.linear_to_db] on a value.  
         */
        get volumeLinear(): float64
        set volumeLinear(value: float64)
        
        /** The audio's pitch and tempo, as a multiplier of the [member stream]'s sample rate. A value of `2.0` doubles the audio's pitch, while a value of `0.5` halves the pitch. */
        get pitchScale(): float64
        set pitchScale(value: float64)
        
        /** If `true`, this node is playing sounds. Setting this property has the same effect as [method play] and [method stop]. */
        get playing(): boolean
        set playing(value: boolean)
        
        /** If `true`, this node calls [method play] when entering the tree. */
        get autoplay(): boolean
        set autoplay(value: boolean)
        
        /** If `true`, the sounds are paused. Setting [member stream_paused] to `false` resumes all sounds.  
         *      
         *  **Note:** This property is automatically changed when exiting or entering the tree, or this node is paused (see [member Node.process_mode]).  
         */
        get streamPaused(): boolean
        set streamPaused(value: boolean)
        
        /** The mix target channels. Has no effect when two speakers or less are detected (see [enum AudioServer.SpeakerMode]). */
        get mixTarget(): int64
        set mixTarget(value: int64)
        
        /** The maximum number of sounds this node can play at the same time. Calling [method play] after this value is reached will cut off the oldest sounds. */
        get maxPolyphony(): int64
        set maxPolyphony(value: int64)
        
        /** The target bus name. All sounds from this node will be playing on this bus.  
         *      
         *  **Note:** At runtime, if no bus with the given name exists, all sounds will fall back on `"Master"`. See also [method AudioServer.get_bus_name].  
         */
        get bus(): StringName
        set bus(value: StringName)
        
        /** The playback type of the stream player. If set other than to the default value, it will force that playback type. */
        get playbackType(): int64
        set playbackType(value: int64)
        
        /** Emitted when a sound finishes playing without interruptions. This signal is  *not*  emitted when calling [method stop], or when exiting the tree while sounds are playing. */
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlayer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlayer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlayer2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlayer2D extends __NameMapNode2D {
        get_playback_position: "getPlaybackPosition";
        has_stream_playback: "hasStreamPlayback";
        get_stream_playback: "getStreamPlayback";
        volume_db: "volumeDb";
        volume_linear: "volumeLinear";
        pitch_scale: "pitchScale";
        stream_paused: "streamPaused";
        max_distance: "maxDistance";
        max_polyphony: "maxPolyphony";
        panning_strength: "panningStrength";
        area_mask: "areaMask";
        playback_type: "playbackType";
    }
    /** Plays positional sound in 2D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplayer2d.html  
     */
    class AudioStreamPlayer2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Queues the audio to play on the next physics frame, from the given position [param from_position], in seconds. */
        play(fromPosition?: float64 /* = 0 */): void
        
        /** Sets the position from which audio will be played, in seconds. */
        seek(toPosition: float64): void
        
        /** Stops the audio. */
        stop(): void
        
        /** Returns the position in the [AudioStream]. */
        getPlaybackPosition(): float64
        
        /** Returns whether the [AudioStreamPlayer] can return the [AudioStreamPlayback] object or not. */
        hasStreamPlayback(): boolean
        
        /** Returns the [AudioStreamPlayback] object associated with this [AudioStreamPlayer2D]. */
        getStreamPlayback(): null | AudioStreamPlayback
        
        /** The [AudioStream] object to be played. */
        get stream(): null | AudioStream
        set stream(value: null | AudioStream)
        
        /** Base volume before attenuation, in decibels. */
        get volumeDb(): float64
        set volumeDb(value: float64)
        
        /** Base volume before attenuation, as a linear value.  
         *      
         *  **Note:** This member modifies [member volume_db] for convenience. The returned value is equivalent to the result of [method @GlobalScope.db_to_linear] on [member volume_db]. Setting this member is equivalent to setting [member volume_db] to the result of [method @GlobalScope.linear_to_db] on a value.  
         */
        get volumeLinear(): float64
        set volumeLinear(value: float64)
        
        /** The pitch and the tempo of the audio, as a multiplier of the audio sample's sample rate. */
        get pitchScale(): float64
        set pitchScale(value: float64)
        
        /** If `true`, audio is playing or is queued to be played (see [method play]). */
        get playing(): boolean
        set playing(value: boolean)
        
        /** If `true`, audio plays when added to scene tree. */
        get autoplay(): boolean
        set autoplay(value: boolean)
        
        /** If `true`, the playback is paused. You can resume it by setting [member stream_paused] to `false`. */
        get streamPaused(): boolean
        set streamPaused(value: boolean)
        
        /** Maximum distance from which audio is still hearable. */
        get maxDistance(): float64
        set maxDistance(value: float64)
        
        /** The volume is attenuated over distance with this as an exponent. */
        get attenuation(): float64
        set attenuation(value: float64)
        
        /** The maximum number of sounds this node can play at the same time. Playing additional sounds after this value is reached will cut off the oldest sounds. */
        get maxPolyphony(): int64
        set maxPolyphony(value: int64)
        
        /** Scales the panning strength for this node by multiplying the base [member ProjectSettings.audio/general/2d_panning_strength] with this factor. Higher values will pan audio from left to right more dramatically than lower values. */
        get panningStrength(): float64
        set panningStrength(value: float64)
        
        /** Bus on which this audio is playing.  
         *      
         *  **Note:** When setting this property, keep in mind that no validation is performed to see if the given name matches an existing bus. This is because audio bus layouts might be loaded after this property is set. If this given name can't be resolved at runtime, it will fall back to `"Master"`.  
         */
        get bus(): StringName
        set bus(value: StringName)
        
        /** Determines which [Area2D] layers affect the sound for reverb and audio bus effects. Areas can be used to redirect [AudioStream]s so that they play in a certain audio bus. An example of how you might use this is making a "water" area so that sounds played in the water are redirected through an audio bus to make them sound like they are being played underwater. */
        get areaMask(): int64
        set areaMask(value: int64)
        
        /** The playback type of the stream player. If set other than to the default value, it will force that playback type. */
        get playbackType(): int64
        set playbackType(value: int64)
        
        /** Emitted when the audio stops playing. */
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlayer2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlayer2D;
    }
    namespace AudioStreamPlayer3D {
        enum AttenuationModel {
            AttenuationInverseDistance = 0,
            AttenuationInverseSquareDistance = 1,
            AttenuationLogarithmic = 2,
            AttenuationDisabled = 3,
        }
        enum DopplerTracking {
            DopplerTrackingDisabled = 0,
            DopplerTrackingIdleStep = 1,
            DopplerTrackingPhysicsStep = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlayer3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlayer3D extends __NameMapNode3D {
        get_playback_position: "getPlaybackPosition";
        has_stream_playback: "hasStreamPlayback";
        get_stream_playback: "getStreamPlayback";
        attenuation_model: "attenuationModel";
        volume_db: "volumeDb";
        volume_linear: "volumeLinear";
        unit_size: "unitSize";
        max_db: "maxDb";
        pitch_scale: "pitchScale";
        stream_paused: "streamPaused";
        max_distance: "maxDistance";
        max_polyphony: "maxPolyphony";
        panning_strength: "panningStrength";
        area_mask: "areaMask";
        playback_type: "playbackType";
        emission_angle_enabled: "emissionAngleEnabled";
        emission_angle_degrees: "emissionAngleDegrees";
        emission_angle_filter_attenuation_db: "emissionAngleFilterAttenuationDb";
        attenuation_filter_cutoff_hz: "attenuationFilterCutoffHz";
        attenuation_filter_db: "attenuationFilterDb";
        doppler_tracking: "dopplerTracking";
    }
    /** Plays positional sound in 3D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplayer3d.html  
     */
    class AudioStreamPlayer3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Queues the audio to play on the next physics frame, from the given position [param from_position], in seconds. */
        play(fromPosition?: float64 /* = 0 */): void
        
        /** Sets the position from which audio will be played, in seconds. */
        seek(toPosition: float64): void
        
        /** Stops the audio. */
        stop(): void
        
        /** Returns the position in the [AudioStream]. */
        getPlaybackPosition(): float64
        
        /** Returns whether the [AudioStreamPlayer] can return the [AudioStreamPlayback] object or not. */
        hasStreamPlayback(): boolean
        
        /** Returns the [AudioStreamPlayback] object associated with this [AudioStreamPlayer3D]. */
        getStreamPlayback(): null | AudioStreamPlayback
        
        /** The [AudioStream] resource to be played. */
        get stream(): null | AudioStream
        set stream(value: null | AudioStream)
        
        /** Decides if audio should get quieter with distance linearly, quadratically, logarithmically, or not be affected by distance, effectively disabling attenuation. */
        get attenuationModel(): int64
        set attenuationModel(value: int64)
        
        /** The base sound level before attenuation, in decibels. */
        get volumeDb(): float64
        set volumeDb(value: float64)
        
        /** The base sound level before attenuation, as a linear value.  
         *      
         *  **Note:** This member modifies [member volume_db] for convenience. The returned value is equivalent to the result of [method @GlobalScope.db_to_linear] on [member volume_db]. Setting this member is equivalent to setting [member volume_db] to the result of [method @GlobalScope.linear_to_db] on a value.  
         */
        get volumeLinear(): float64
        set volumeLinear(value: float64)
        
        /** The factor for the attenuation effect. Higher values make the sound audible over a larger distance. */
        get unitSize(): float64
        set unitSize(value: float64)
        
        /** Sets the absolute maximum of the sound level, in decibels. */
        get maxDb(): float64
        set maxDb(value: float64)
        
        /** The pitch and the tempo of the audio, as a multiplier of the audio sample's sample rate. */
        get pitchScale(): float64
        set pitchScale(value: float64)
        
        /** If `true`, audio is playing or is queued to be played (see [method play]). */
        get playing(): boolean
        set playing(value: boolean)
        
        /** If `true`, audio plays when the AudioStreamPlayer3D node is added to scene tree. */
        get autoplay(): boolean
        set autoplay(value: boolean)
        
        /** If `true`, the playback is paused. You can resume it by setting [member stream_paused] to `false`. */
        get streamPaused(): boolean
        set streamPaused(value: boolean)
        
        /** The distance past which the sound can no longer be heard at all. Only has an effect if set to a value greater than `0.0`. [member max_distance] works in tandem with [member unit_size]. However, unlike [member unit_size] whose behavior depends on the [member attenuation_model], [member max_distance] always works in a linear fashion. This can be used to prevent the [AudioStreamPlayer3D] from requiring audio mixing when the listener is far away, which saves CPU resources. */
        get maxDistance(): float64
        set maxDistance(value: float64)
        
        /** The maximum number of sounds this node can play at the same time. Playing additional sounds after this value is reached will cut off the oldest sounds. */
        get maxPolyphony(): int64
        set maxPolyphony(value: int64)
        
        /** Scales the panning strength for this node by multiplying the base [member ProjectSettings.audio/general/3d_panning_strength] by this factor. If the product is `0.0` then stereo panning is disabled and the volume is the same for all channels. If the product is `1.0` then one of the channels will be muted when the sound is located exactly to the left (or right) of the listener.  
         *  Two speaker stereo arrangements implement the [url=https://webaudio.github.io/web-audio-api/#stereopanner-algorithm]WebAudio standard for StereoPannerNode Panning[/url] where the volume is cosine of half the azimuth angle to the ear.  
         *  For other speaker arrangements such as the 5.1 and 7.1 the SPCAP (Speaker-Placement Correction Amplitude) algorithm is implemented.  
         */
        get panningStrength(): float64
        set panningStrength(value: float64)
        
        /** The bus on which this audio is playing.  
         *      
         *  **Note:** When setting this property, keep in mind that no validation is performed to see if the given name matches an existing bus. This is because audio bus layouts might be loaded after this property is set. If this given name can't be resolved at runtime, it will fall back to `"Master"`.  
         */
        get bus(): StringName
        set bus(value: StringName)
        
        /** Determines which [Area3D] layers affect the sound for reverb and audio bus effects. Areas can be used to redirect [AudioStream]s so that they play in a certain audio bus. An example of how you might use this is making a "water" area so that sounds played in the water are redirected through an audio bus to make them sound like they are being played underwater. */
        get areaMask(): int64
        set areaMask(value: int64)
        
        /** The playback type of the stream player. If set other than to the default value, it will force that playback type. */
        get playbackType(): int64
        set playbackType(value: int64)
        
        /** If `true`, the audio should be attenuated according to the direction of the sound. */
        get emissionAngleEnabled(): boolean
        set emissionAngleEnabled(value: boolean)
        
        /** The angle in which the audio reaches a listener unattenuated. */
        get emissionAngleDegrees(): float64
        set emissionAngleDegrees(value: float64)
        
        /** Attenuation factor used if listener is outside of [member emission_angle_degrees] and [member emission_angle_enabled] is set, in decibels. */
        get emissionAngleFilterAttenuationDb(): float64
        set emissionAngleFilterAttenuationDb(value: float64)
        
        /** The cutoff frequency of the attenuation low-pass filter, in Hz. A sound above this frequency is attenuated more than a sound below this frequency. To disable this effect, set this to `20500` as this frequency is above the human hearing limit. */
        get attenuationFilterCutoffHz(): float64
        set attenuationFilterCutoffHz(value: float64)
        
        /** Amount how much the filter affects the loudness, in decibels. */
        get attenuationFilterDb(): float64
        set attenuationFilterDb(value: float64)
        
        /** Decides in which step the Doppler effect should be calculated.  
         *      
         *  **Note:** If [member doppler_tracking] is not [constant DOPPLER_TRACKING_DISABLED] but the current [Camera3D]/[AudioListener3D] has doppler tracking disabled, the Doppler effect will be heard but will not take the movement of the current listener into account. If accurate Doppler effect is desired, doppler tracking should be enabled on both the [AudioStreamPlayer3D] and the current [Camera3D]/[AudioListener3D].  
         */
        get dopplerTracking(): int64
        set dopplerTracking(value: int64)
        
        /** Emitted when the audio stops playing. */
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlayer3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlayer3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPlaylist extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPlaylist extends __NameMapAudioStream {
        get_bpm: "getBpm";
        set_list_stream: "setListStream";
        get_list_stream: "getListStream";
        fade_time: "fadeTime";
        stream_count: "streamCount";
        stream_0: "stream0";
        stream_1: "stream1";
        stream_2: "stream2";
        stream_3: "stream3";
        stream_4: "stream4";
        stream_5: "stream5";
        stream_6: "stream6";
        stream_7: "stream7";
        stream_8: "stream8";
        stream_9: "stream9";
        stream_10: "stream10";
        stream_11: "stream11";
        stream_12: "stream12";
        stream_13: "stream13";
        stream_14: "stream14";
        stream_15: "stream15";
        stream_16: "stream16";
        stream_17: "stream17";
        stream_18: "stream18";
        stream_19: "stream19";
        stream_20: "stream20";
        stream_21: "stream21";
        stream_22: "stream22";
        stream_23: "stream23";
        stream_24: "stream24";
        stream_25: "stream25";
        stream_26: "stream26";
        stream_27: "stream27";
        stream_28: "stream28";
        stream_29: "stream29";
        stream_30: "stream30";
        stream_31: "stream31";
        stream_32: "stream32";
        stream_33: "stream33";
        stream_34: "stream34";
        stream_35: "stream35";
        stream_36: "stream36";
        stream_37: "stream37";
        stream_38: "stream38";
        stream_39: "stream39";
        stream_40: "stream40";
        stream_41: "stream41";
        stream_42: "stream42";
        stream_43: "stream43";
        stream_44: "stream44";
        stream_45: "stream45";
        stream_46: "stream46";
        stream_47: "stream47";
        stream_48: "stream48";
        stream_49: "stream49";
        stream_50: "stream50";
        stream_51: "stream51";
        stream_52: "stream52";
        stream_53: "stream53";
        stream_54: "stream54";
        stream_55: "stream55";
        stream_56: "stream56";
        stream_57: "stream57";
        stream_58: "stream58";
        stream_59: "stream59";
        stream_60: "stream60";
        stream_61: "stream61";
        stream_62: "stream62";
        stream_63: "stream63";
    }
    /** [AudioStream] that includes sub-streams and plays them back like a playlist.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamplaylist.html  
     */
    class AudioStreamPlaylist extends AudioStream {
        /** Maximum amount of streams supported in the playlist. */
        static readonly MAX_STREAMS = 64
        constructor(identifier?: any)
        
        /** Returns the BPM of the playlist, which can vary depending on the clip being played. */
        getBpm(): float64
        
        /** Sets the stream at playback position index. */
        setListStream(streamIndex: int64, audioStream: AudioStream): void
        
        /** Returns the stream at playback position index. */
        getListStream(streamIndex: int64): null | AudioStream
        
        /** If `true`, the playlist will shuffle each time playback starts and each time it loops. */
        get shuffle(): boolean
        set shuffle(value: boolean)
        
        /** If `true`, the playlist will loop, otherwise the playlist will end when the last stream is finished. */
        get loop(): boolean
        set loop(value: boolean)
        
        /** Fade time used when a stream ends, when going to the next one. Streams are expected to have an extra bit of audio after the end to help with fading. */
        get fadeTime(): float64
        set fadeTime(value: float64)
        
        /** Amount of streams in the playlist. */
        get streamCount(): int64
        set streamCount(value: int64)
        get stream0(): null | AudioStream
        set stream0(value: null | AudioStream)
        get stream1(): null | AudioStream
        set stream1(value: null | AudioStream)
        get stream2(): null | AudioStream
        set stream2(value: null | AudioStream)
        get stream3(): null | AudioStream
        set stream3(value: null | AudioStream)
        get stream4(): null | AudioStream
        set stream4(value: null | AudioStream)
        get stream5(): null | AudioStream
        set stream5(value: null | AudioStream)
        get stream6(): null | AudioStream
        set stream6(value: null | AudioStream)
        get stream7(): null | AudioStream
        set stream7(value: null | AudioStream)
        get stream8(): null | AudioStream
        set stream8(value: null | AudioStream)
        get stream9(): null | AudioStream
        set stream9(value: null | AudioStream)
        get stream10(): null | AudioStream
        set stream10(value: null | AudioStream)
        get stream11(): null | AudioStream
        set stream11(value: null | AudioStream)
        get stream12(): null | AudioStream
        set stream12(value: null | AudioStream)
        get stream13(): null | AudioStream
        set stream13(value: null | AudioStream)
        get stream14(): null | AudioStream
        set stream14(value: null | AudioStream)
        get stream15(): null | AudioStream
        set stream15(value: null | AudioStream)
        get stream16(): null | AudioStream
        set stream16(value: null | AudioStream)
        get stream17(): null | AudioStream
        set stream17(value: null | AudioStream)
        get stream18(): null | AudioStream
        set stream18(value: null | AudioStream)
        get stream19(): null | AudioStream
        set stream19(value: null | AudioStream)
        get stream20(): null | AudioStream
        set stream20(value: null | AudioStream)
        get stream21(): null | AudioStream
        set stream21(value: null | AudioStream)
        get stream22(): null | AudioStream
        set stream22(value: null | AudioStream)
        get stream23(): null | AudioStream
        set stream23(value: null | AudioStream)
        get stream24(): null | AudioStream
        set stream24(value: null | AudioStream)
        get stream25(): null | AudioStream
        set stream25(value: null | AudioStream)
        get stream26(): null | AudioStream
        set stream26(value: null | AudioStream)
        get stream27(): null | AudioStream
        set stream27(value: null | AudioStream)
        get stream28(): null | AudioStream
        set stream28(value: null | AudioStream)
        get stream29(): null | AudioStream
        set stream29(value: null | AudioStream)
        get stream30(): null | AudioStream
        set stream30(value: null | AudioStream)
        get stream31(): null | AudioStream
        set stream31(value: null | AudioStream)
        get stream32(): null | AudioStream
        set stream32(value: null | AudioStream)
        get stream33(): null | AudioStream
        set stream33(value: null | AudioStream)
        get stream34(): null | AudioStream
        set stream34(value: null | AudioStream)
        get stream35(): null | AudioStream
        set stream35(value: null | AudioStream)
        get stream36(): null | AudioStream
        set stream36(value: null | AudioStream)
        get stream37(): null | AudioStream
        set stream37(value: null | AudioStream)
        get stream38(): null | AudioStream
        set stream38(value: null | AudioStream)
        get stream39(): null | AudioStream
        set stream39(value: null | AudioStream)
        get stream40(): null | AudioStream
        set stream40(value: null | AudioStream)
        get stream41(): null | AudioStream
        set stream41(value: null | AudioStream)
        get stream42(): null | AudioStream
        set stream42(value: null | AudioStream)
        get stream43(): null | AudioStream
        set stream43(value: null | AudioStream)
        get stream44(): null | AudioStream
        set stream44(value: null | AudioStream)
        get stream45(): null | AudioStream
        set stream45(value: null | AudioStream)
        get stream46(): null | AudioStream
        set stream46(value: null | AudioStream)
        get stream47(): null | AudioStream
        set stream47(value: null | AudioStream)
        get stream48(): null | AudioStream
        set stream48(value: null | AudioStream)
        get stream49(): null | AudioStream
        set stream49(value: null | AudioStream)
        get stream50(): null | AudioStream
        set stream50(value: null | AudioStream)
        get stream51(): null | AudioStream
        set stream51(value: null | AudioStream)
        get stream52(): null | AudioStream
        set stream52(value: null | AudioStream)
        get stream53(): null | AudioStream
        set stream53(value: null | AudioStream)
        get stream54(): null | AudioStream
        set stream54(value: null | AudioStream)
        get stream55(): null | AudioStream
        set stream55(value: null | AudioStream)
        get stream56(): null | AudioStream
        set stream56(value: null | AudioStream)
        get stream57(): null | AudioStream
        set stream57(value: null | AudioStream)
        get stream58(): null | AudioStream
        set stream58(value: null | AudioStream)
        get stream59(): null | AudioStream
        set stream59(value: null | AudioStream)
        get stream60(): null | AudioStream
        set stream60(value: null | AudioStream)
        get stream61(): null | AudioStream
        set stream61(value: null | AudioStream)
        get stream62(): null | AudioStream
        set stream62(value: null | AudioStream)
        get stream63(): null | AudioStream
        set stream63(value: null | AudioStream)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPlaylist;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPlaylist;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamPolyphonic extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamPolyphonic extends __NameMapAudioStream {
    }
    /** AudioStream that lets the user play custom streams at any time from code, simultaneously using a single player.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreampolyphonic.html  
     */
    class AudioStreamPolyphonic extends AudioStream {
        constructor(identifier?: any)
        /** Maximum amount of simultaneous streams that can be played. */
        get polyphony(): int64
        set polyphony(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamPolyphonic;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamPolyphonic;
    }
    namespace AudioStreamRandomizer {
        enum PlaybackMode {
            PlaybackRandomNoRepeats = 0,
            PlaybackRandom = 1,
            PlaybackSequential = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamRandomizer extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamRandomizer extends __NameMapAudioStream {
        add_stream: "addStream";
        move_stream: "moveStream";
        remove_stream: "removeStream";
        set_stream: "setStream";
        get_stream: "getStream";
        set_stream_probability_weight: "setStreamProbabilityWeight";
        get_stream_probability_weight: "getStreamProbabilityWeight";
        playback_mode: "playbackMode";
        random_pitch: "randomPitch";
        random_pitch_semitones: "randomPitchSemitones";
        random_volume_offset_db: "randomVolumeOffsetDb";
        streams_count: "streamsCount";
    }
    /** Wraps a pool of audio streams with pitch and volume shifting.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamrandomizer.html  
     */
    class AudioStreamRandomizer extends AudioStream {
        constructor(identifier?: any)
        /** Insert a stream at the specified index. If the index is less than zero, the insertion occurs at the end of the underlying pool. */
        addStream(index: int64, stream: AudioStream, weight?: float64 /* = 1 */): void
        
        /** Move a stream from one index to another. */
        moveStream(indexFrom: int64, indexTo: int64): void
        
        /** Remove the stream at the specified index. */
        removeStream(index: int64): void
        
        /** Set the AudioStream at the specified index. */
        setStream(index: int64, stream: AudioStream): void
        
        /** Returns the stream at the specified index. */
        getStream(index: int64): null | AudioStream
        
        /** Set the probability weight of the stream at the specified index. The higher this value, the more likely that the randomizer will choose this stream during random playback modes. */
        setStreamProbabilityWeight(index: int64, weight: float64): void
        
        /** Returns the probability weight associated with the stream at the given index. */
        getStreamProbabilityWeight(index: int64): float64
        
        /** Controls how this AudioStreamRandomizer picks which AudioStream to play next. */
        get playbackMode(): int64
        set playbackMode(value: int64)
        
        /** The largest possible frequency multiplier of the random pitch variation. Pitch will be randomly chosen within a range of [code skip-lint]1.0 / random_pitch` and [code skip-lint]random_pitch`. A value of `1.0` means no variation. A value of `2.0` means pitch will be randomized between double and half.  
         *      
         *  **Note:** Setting this property also sets [member random_pitch_semitones].  
         */
        get randomPitch(): float64
        set randomPitch(value: float64)
        
        /** The largest possible distance, in semitones, of the random pitch variation. A value of `0.0` means no variation.  
         *      
         *  **Note:** Setting this property also sets [member random_pitch].  
         */
        get randomPitchSemitones(): float64
        set randomPitchSemitones(value: float64)
        
        /** The intensity of random volume variation. Volume will be increased or decreased by a random value up to [code skip-lint]random_volume_offset_db`. A value of `0.0` means no variation. A value of `3.0` means volume will be randomized between `-3.0 dB` and `+3.0 dB`. */
        get randomVolumeOffsetDb(): float64
        set randomVolumeOffsetDb(value: float64)
        
        /** The number of streams in the stream pool. */
        get streamsCount(): int64
        set streamsCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamRandomizer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamRandomizer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamSynchronized extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamSynchronized extends __NameMapAudioStream {
        set_sync_stream: "setSyncStream";
        get_sync_stream: "getSyncStream";
        set_sync_stream_volume: "setSyncStreamVolume";
        get_sync_stream_volume: "getSyncStreamVolume";
        stream_count: "streamCount";
        "stream_0/stream": "stream0/stream";
        "stream_0/volume": "stream0/volume";
        "stream_1/stream": "stream1/stream";
        "stream_1/volume": "stream1/volume";
        "stream_2/stream": "stream2/stream";
        "stream_2/volume": "stream2/volume";
        "stream_3/stream": "stream3/stream";
        "stream_3/volume": "stream3/volume";
        "stream_4/stream": "stream4/stream";
        "stream_4/volume": "stream4/volume";
        "stream_5/stream": "stream5/stream";
        "stream_5/volume": "stream5/volume";
        "stream_6/stream": "stream6/stream";
        "stream_6/volume": "stream6/volume";
        "stream_7/stream": "stream7/stream";
        "stream_7/volume": "stream7/volume";
        "stream_8/stream": "stream8/stream";
        "stream_8/volume": "stream8/volume";
        "stream_9/stream": "stream9/stream";
        "stream_9/volume": "stream9/volume";
        "stream_10/stream": "stream10/stream";
        "stream_10/volume": "stream10/volume";
        "stream_11/stream": "stream11/stream";
        "stream_11/volume": "stream11/volume";
        "stream_12/stream": "stream12/stream";
        "stream_12/volume": "stream12/volume";
        "stream_13/stream": "stream13/stream";
        "stream_13/volume": "stream13/volume";
        "stream_14/stream": "stream14/stream";
        "stream_14/volume": "stream14/volume";
        "stream_15/stream": "stream15/stream";
        "stream_15/volume": "stream15/volume";
        "stream_16/stream": "stream16/stream";
        "stream_16/volume": "stream16/volume";
        "stream_17/stream": "stream17/stream";
        "stream_17/volume": "stream17/volume";
        "stream_18/stream": "stream18/stream";
        "stream_18/volume": "stream18/volume";
        "stream_19/stream": "stream19/stream";
        "stream_19/volume": "stream19/volume";
        "stream_20/stream": "stream20/stream";
        "stream_20/volume": "stream20/volume";
        "stream_21/stream": "stream21/stream";
        "stream_21/volume": "stream21/volume";
        "stream_22/stream": "stream22/stream";
        "stream_22/volume": "stream22/volume";
        "stream_23/stream": "stream23/stream";
        "stream_23/volume": "stream23/volume";
        "stream_24/stream": "stream24/stream";
        "stream_24/volume": "stream24/volume";
        "stream_25/stream": "stream25/stream";
        "stream_25/volume": "stream25/volume";
        "stream_26/stream": "stream26/stream";
        "stream_26/volume": "stream26/volume";
        "stream_27/stream": "stream27/stream";
        "stream_27/volume": "stream27/volume";
        "stream_28/stream": "stream28/stream";
        "stream_28/volume": "stream28/volume";
        "stream_29/stream": "stream29/stream";
        "stream_29/volume": "stream29/volume";
        "stream_30/stream": "stream30/stream";
        "stream_30/volume": "stream30/volume";
        "stream_31/stream": "stream31/stream";
        "stream_31/volume": "stream31/volume";
    }
    /** Stream that can be fitted with sub-streams, which will be played in-sync.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_audiostreamsynchronized.html  
     */
    class AudioStreamSynchronized extends AudioStream {
        /** Maximum amount of streams that can be synchronized. */
        static readonly MAX_STREAMS = 32
        constructor(identifier?: any)
        
        /** Set one of the synchronized streams, by index. */
        setSyncStream(streamIndex: int64, audioStream: AudioStream): void
        
        /** Get one of the synchronized streams, by index. */
        getSyncStream(streamIndex: int64): null | AudioStream
        
        /** Set the volume of one of the synchronized streams, by index. */
        setSyncStreamVolume(streamIndex: int64, volumeDb: float64): void
        
        /** Get the volume of one of the synchronized streams, by index. */
        getSyncStreamVolume(streamIndex: int64): float64
        
        /** Set the total amount of streams that will be played back synchronized. */
        get streamCount(): int64
        set streamCount(value: int64)
        get "stream0/stream"(): null | AudioStream
        set "stream0/stream"(value: null | AudioStream)
        get "stream0/volume"(): float64
        set "stream0/volume"(value: float64)
        get "stream1/stream"(): null | AudioStream
        set "stream1/stream"(value: null | AudioStream)
        get "stream1/volume"(): float64
        set "stream1/volume"(value: float64)
        get "stream2/stream"(): null | AudioStream
        set "stream2/stream"(value: null | AudioStream)
        get "stream2/volume"(): float64
        set "stream2/volume"(value: float64)
        get "stream3/stream"(): null | AudioStream
        set "stream3/stream"(value: null | AudioStream)
        get "stream3/volume"(): float64
        set "stream3/volume"(value: float64)
        get "stream4/stream"(): null | AudioStream
        set "stream4/stream"(value: null | AudioStream)
        get "stream4/volume"(): float64
        set "stream4/volume"(value: float64)
        get "stream5/stream"(): null | AudioStream
        set "stream5/stream"(value: null | AudioStream)
        get "stream5/volume"(): float64
        set "stream5/volume"(value: float64)
        get "stream6/stream"(): null | AudioStream
        set "stream6/stream"(value: null | AudioStream)
        get "stream6/volume"(): float64
        set "stream6/volume"(value: float64)
        get "stream7/stream"(): null | AudioStream
        set "stream7/stream"(value: null | AudioStream)
        get "stream7/volume"(): float64
        set "stream7/volume"(value: float64)
        get "stream8/stream"(): null | AudioStream
        set "stream8/stream"(value: null | AudioStream)
        get "stream8/volume"(): float64
        set "stream8/volume"(value: float64)
        get "stream9/stream"(): null | AudioStream
        set "stream9/stream"(value: null | AudioStream)
        get "stream9/volume"(): float64
        set "stream9/volume"(value: float64)
        get "stream10/stream"(): null | AudioStream
        set "stream10/stream"(value: null | AudioStream)
        get "stream10/volume"(): float64
        set "stream10/volume"(value: float64)
        get "stream11/stream"(): null | AudioStream
        set "stream11/stream"(value: null | AudioStream)
        get "stream11/volume"(): float64
        set "stream11/volume"(value: float64)
        get "stream12/stream"(): null | AudioStream
        set "stream12/stream"(value: null | AudioStream)
        get "stream12/volume"(): float64
        set "stream12/volume"(value: float64)
        get "stream13/stream"(): null | AudioStream
        set "stream13/stream"(value: null | AudioStream)
        get "stream13/volume"(): float64
        set "stream13/volume"(value: float64)
        get "stream14/stream"(): null | AudioStream
        set "stream14/stream"(value: null | AudioStream)
        get "stream14/volume"(): float64
        set "stream14/volume"(value: float64)
        get "stream15/stream"(): null | AudioStream
        set "stream15/stream"(value: null | AudioStream)
        get "stream15/volume"(): float64
        set "stream15/volume"(value: float64)
        get "stream16/stream"(): null | AudioStream
        set "stream16/stream"(value: null | AudioStream)
        get "stream16/volume"(): float64
        set "stream16/volume"(value: float64)
        get "stream17/stream"(): null | AudioStream
        set "stream17/stream"(value: null | AudioStream)
        get "stream17/volume"(): float64
        set "stream17/volume"(value: float64)
        get "stream18/stream"(): null | AudioStream
        set "stream18/stream"(value: null | AudioStream)
        get "stream18/volume"(): float64
        set "stream18/volume"(value: float64)
        get "stream19/stream"(): null | AudioStream
        set "stream19/stream"(value: null | AudioStream)
        get "stream19/volume"(): float64
        set "stream19/volume"(value: float64)
        get "stream20/stream"(): null | AudioStream
        set "stream20/stream"(value: null | AudioStream)
        get "stream20/volume"(): float64
        set "stream20/volume"(value: float64)
        get "stream21/stream"(): null | AudioStream
        set "stream21/stream"(value: null | AudioStream)
        get "stream21/volume"(): float64
        set "stream21/volume"(value: float64)
        get "stream22/stream"(): null | AudioStream
        set "stream22/stream"(value: null | AudioStream)
        get "stream22/volume"(): float64
        set "stream22/volume"(value: float64)
        get "stream23/stream"(): null | AudioStream
        set "stream23/stream"(value: null | AudioStream)
        get "stream23/volume"(): float64
        set "stream23/volume"(value: float64)
        get "stream24/stream"(): null | AudioStream
        set "stream24/stream"(value: null | AudioStream)
        get "stream24/volume"(): float64
        set "stream24/volume"(value: float64)
        get "stream25/stream"(): null | AudioStream
        set "stream25/stream"(value: null | AudioStream)
        get "stream25/volume"(): float64
        set "stream25/volume"(value: float64)
        get "stream26/stream"(): null | AudioStream
        set "stream26/stream"(value: null | AudioStream)
        get "stream26/volume"(): float64
        set "stream26/volume"(value: float64)
        get "stream27/stream"(): null | AudioStream
        set "stream27/stream"(value: null | AudioStream)
        get "stream27/volume"(): float64
        set "stream27/volume"(value: float64)
        get "stream28/stream"(): null | AudioStream
        set "stream28/stream"(value: null | AudioStream)
        get "stream28/volume"(): float64
        set "stream28/volume"(value: float64)
        get "stream29/stream"(): null | AudioStream
        set "stream29/stream"(value: null | AudioStream)
        get "stream29/volume"(): float64
        set "stream29/volume"(value: float64)
        get "stream30/stream"(): null | AudioStream
        set "stream30/stream"(value: null | AudioStream)
        get "stream30/volume"(): float64
        set "stream30/volume"(value: float64)
        get "stream31/stream"(): null | AudioStream
        set "stream31/stream"(value: null | AudioStream)
        get "stream31/volume"(): float64
        set "stream31/volume"(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamSynchronized;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamSynchronized;
    }
    namespace AudioStreamWav {
        enum Format {
            Format8Bits = 0,
            Format16Bits = 1,
            FormatImaAdpcm = 2,
            FormatQoa = 3,
        }
        enum LoopMode {
            LoopDisabled = 0,
            LoopForward = 1,
            LoopPingpong = 2,
            LoopBackward = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAudioStreamWav extends __RPCMapAudioStream {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAudioStreamWav extends __NameMapAudioStream {
        load_from_buffer: "loadFromBuffer";
        load_from_file: "loadFromFile";
        save_to_wav: "saveToWav";
        loop_mode: "loopMode";
        loop_begin: "loopBegin";
        loop_end: "loopEnd";
        mix_rate: "mixRate";
    }
    class AudioStreamWav extends AudioStream {
        constructor(identifier?: any)
        static loadFromBuffer(streamData: PackedByteArray | byte[] | ArrayBuffer, options?: GDictionary /* = new GDictionary() */): null | AudioStreamWav
        static loadFromFile(path: string, options?: GDictionary /* = new GDictionary() */): null | AudioStreamWav
        saveToWav(path: string): GError
        get data(): PackedByteArray
        set data(value: PackedByteArray | byte[] | ArrayBuffer)
        get format(): int64
        set format(value: int64)
        get loopMode(): int64
        set loopMode(value: int64)
        get loopBegin(): int64
        set loopBegin(value: int64)
        get loopEnd(): int64
        set loopEnd(value: int64)
        get mixRate(): int64
        set mixRate(value: int64)
        get stereo(): boolean
        set stereo(value: boolean)
        get tags(): GDictionary
        set tags(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAudioStreamWav;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAudioStreamWav;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapAwaitTweener extends __RPCMapTweener {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapAwaitTweener extends __NameMapTweener {
        set_timeout: "setTimeout";
        _signal_callback: "_signalCallback";
    }
    /** Awaits a specified signal.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_awaittweener.html  
     */
    class AwaitTweener extends Tweener {
        constructor(identifier?: any)
        /** Sets the maximum time an [AwaitTweener] can wait for the signal. Can be used as a safeguard for signals that may never be emitted. If not specified, the tweener will wait indefinitely. */
        setTimeout(timeout: float64): null | AwaitTweener
        _signalCallback(...varargs: any[]): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapAwaitTweener;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapAwaitTweener;
    }
    namespace BackBufferCopy {
        enum CopyMode {
            CopyModeDisabled = 0,
            CopyModeRect = 1,
            CopyModeViewport = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBackBufferCopy extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBackBufferCopy extends __NameMapNode2D {
        copy_mode: "copyMode";
    }
    /** A node that copies a region of the screen to a buffer for access in shader code.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_backbuffercopy.html  
     */
    class BackBufferCopy<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Buffer mode. */
        get copyMode(): int64
        set copyMode(value: int64)
        
        /** The area covered by the [BackBufferCopy]. Only used if [member copy_mode] is [constant COPY_MODE_RECT]. */
        get rect(): Rect2
        set rect(value: Rect2)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBackBufferCopy;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBackBufferCopy;
    }
    namespace BaseButton {
        enum DrawMode {
            DrawNormal = 0,
            DrawPressed = 1,
            DrawHover = 2,
            DrawDisabled = 3,
            DrawHoverPressed = 4,
        }
        enum ActionMode {
            ActionModeButtonPress = 0,
            ActionModeButtonRelease = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBaseButton extends __RPCMapControl {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBaseButton extends __NameMapControl {
        set_pressed_no_signal: "setPressedNoSignal";
        is_hovered: "isHovered";
        get_draw_mode: "getDrawMode";
        toggle_mode: "toggleMode";
        button_pressed: "buttonPressed";
        action_mode: "actionMode";
        button_mask: "buttonMask";
        keep_pressed_outside: "keepPressedOutside";
        button_group: "buttonGroup";
        shortcut_feedback: "shortcutFeedback";
        shortcut_in_tooltip: "shortcutInTooltip";
        button_up: "buttonUp";
        button_down: "buttonDown";
    }
    /** Abstract base class for GUI buttons.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_basebutton.html  
     */
    class BaseButton<Map extends NodePathMap = any> extends Control<Map> {
        constructor(identifier?: any)
        /** Called when the button is pressed. If you need to know the button's pressed state (and [member toggle_mode] is active), use [method _toggled] instead. */
        /* gdvirtual */ _pressed(): void
        
        /** Called when the button is toggled (only if [member toggle_mode] is active). */
        /* gdvirtual */ _toggled(toggledOn: boolean): void
        
        /** Presses the button. This causes the corresponding virtual method to be called and the corresponding signal to be emitted, depending on [member toggle_mode]. If [member disabled] is `true`, nothing happens.  
         *      
         *  **Note:** This method does not change the visual state of the button and does not grab focus to the button.  
         */
        press(): void
        
        /** Changes the [member button_pressed] state of the button, without emitting [signal toggled]. Use when you just want to change the state of the button without sending the pressed event (e.g. when initializing scene). Only works if [member toggle_mode] is `true`.  
         *      
         *  **Note:** This method doesn't unpress other buttons in [member button_group].  
         */
        setPressedNoSignal(pressed: boolean): void
        
        /** Returns `true` if the mouse has entered the button and has not left it yet. */
        isHovered(): boolean
        
        /** Returns the visual state used to draw the button. This is useful mainly when implementing your own draw code by either overriding _draw() or connecting to "draw" signal. The visual state of the button is defined by the [enum DrawMode] enum. */
        getDrawMode(): BaseButton.DrawMode
        
        /** If `true`, the button is in disabled state and can't be clicked or toggled.  
         *      
         *  **Note:** If the button is disabled while held down, [signal button_up] will be emitted.  
         */
        get disabled(): boolean
        set disabled(value: boolean)
        
        /** If `true`, the button is in toggle mode. Makes the button flip state between pressed and unpressed each time its area is clicked. */
        get toggleMode(): boolean
        set toggleMode(value: boolean)
        
        /** If `true`, the button's state is pressed. Means the button is pressed down or toggled (if [member toggle_mode] is active). Only works if [member toggle_mode] is `true`.  
         *      
         *  **Note:** Changing the value of [member button_pressed] will result in [signal toggled] to be emitted. If you want to change the pressed state without emitting that signal, use [method set_pressed_no_signal].  
         */
        get buttonPressed(): boolean
        set buttonPressed(value: boolean)
        
        /** Determines when the button is considered clicked. */
        get actionMode(): int64
        set actionMode(value: int64)
        
        /** Binary mask to choose which mouse buttons this button will respond to.  
         *  To allow both left-click and right-click, use `MOUSE_BUTTON_MASK_LEFT | MOUSE_BUTTON_MASK_RIGHT`.  
         */
        get buttonMask(): int64
        set buttonMask(value: int64)
        
        /** If `true`, the button stays pressed when moving the cursor outside the button while pressing it.  
         *      
         *  **Note:** This property only affects the button's visual appearance. Signals will be emitted at the same moment regardless of this property's value.  
         */
        get keepPressedOutside(): boolean
        set keepPressedOutside(value: boolean)
        
        /** The [ButtonGroup] associated with the button. Not to be confused with node groups.  
         *      
         *  **Note:** The button will be configured as a radio button if a [ButtonGroup] is assigned to it.  
         */
        get buttonGroup(): null | ButtonGroup
        set buttonGroup(value: null | ButtonGroup)
        
        /** [Shortcut] associated to the button. */
        get shortcut(): null | Shortcut
        set shortcut(value: null | Shortcut)
        
        /** If `true`, the button will highlight for a short amount of time when its shortcut is activated. If `false` and [member toggle_mode] is `false`, the shortcut will activate without any visual feedback. */
        get shortcutFeedback(): boolean
        set shortcutFeedback(value: boolean)
        
        /** If `true`, the button will add information about its shortcut in the tooltip. This includes the shortcut's events and its [member Resource.resource_name]. If both events and name are empty, the shortcut will not be included.  
         *      
         *  **Note:** This property does nothing when the tooltip control is customized using [method Control._make_custom_tooltip].  
         */
        get shortcutInTooltip(): boolean
        set shortcutInTooltip(value: boolean)
        
        /** Emitted when the button is toggled or pressed. This is on [signal button_down] if [member action_mode] is [constant ACTION_MODE_BUTTON_PRESS] and on [signal button_up] otherwise.  
         *  If you need to know the button's pressed state (and [member toggle_mode] is active), use [signal toggled] instead.  
         */
        readonly pressed: Signal<() => void>
        
        /** Emitted when the button stops being held down. */
        readonly buttonUp: Signal<() => void>
        
        /** Emitted when the button starts being held down. */
        readonly buttonDown: Signal<() => void>
        
        /** Emitted when the button was just toggled between pressed and normal states (only if [member toggle_mode] is active). The new state is contained in the [param toggled_on] argument. */
        readonly toggled: Signal<(toggledOn: boolean) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBaseButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBaseButton;
    }
    namespace BaseMaterial3D {
        enum TextureParam {
            TextureAlbedo = 0,
            TextureMetallic = 1,
            TextureRoughness = 2,
            TextureEmission = 3,
            TextureNormal = 4,
            TextureBentNormal = 18,
            TextureRim = 5,
            TextureClearcoat = 6,
            TextureFlowmap = 7,
            TextureAmbientOcclusion = 8,
            TextureHeightmap = 9,
            TextureSubsurfaceScattering = 10,
            TextureSubsurfaceTransmittance = 11,
            TextureBacklight = 12,
            TextureRefraction = 13,
            TextureDetailMask = 14,
            TextureDetailAlbedo = 15,
            TextureDetailNormal = 16,
            TextureOrm = 17,
            TextureMax = 19,
        }
        enum TextureFilter {
            TextureFilterNearest = 0,
            TextureFilterLinear = 1,
            TextureFilterNearestWithMipmaps = 2,
            TextureFilterLinearWithMipmaps = 3,
            TextureFilterNearestWithMipmapsAnisotropic = 4,
            TextureFilterLinearWithMipmapsAnisotropic = 5,
            TextureFilterMax = 6,
        }
        enum DetailUV {
            DetailUV1 = 0,
            DetailUV2 = 1,
        }
        enum Transparency {
            TransparencyDisabled = 0,
            TransparencyAlpha = 1,
            TransparencyAlphaScissor = 2,
            TransparencyAlphaHash = 3,
            TransparencyAlphaDepthPrePass = 4,
            TransparencyMax = 5,
        }
        enum ShadingMode {
            ShadingModeUnshaded = 0,
            ShadingModePerPixel = 1,
            ShadingModePerVertex = 2,
            ShadingModeMax = 3,
        }
        enum Feature {
            FeatureEmission = 0,
            FeatureNormalMapping = 1,
            FeatureRim = 2,
            FeatureClearcoat = 3,
            FeatureAnisotropy = 4,
            FeatureAmbientOcclusion = 5,
            FeatureHeightMapping = 6,
            FeatureSubsurfaceScattering = 7,
            FeatureSubsurfaceTransmittance = 8,
            FeatureBacklight = 9,
            FeatureRefraction = 10,
            FeatureDetail = 11,
            FeatureBentNormalMapping = 12,
            FeatureParticlesAnimation = 13,
            FeatureMax = 14,
        }
        enum BlendMode {
            BlendModeMix = 0,
            BlendModeAdd = 1,
            BlendModeSub = 2,
            BlendModeMul = 3,
            BlendModePremultAlpha = 4,
        }
        enum AlphaAntiAliasing {
            AlphaAntialiasingOff = 0,
            AlphaAntialiasingAlphaToCoverage = 1,
            AlphaAntialiasingAlphaToCoverageAndToOne = 2,
        }
        enum DepthDrawMode {
            DepthDrawOpaqueOnly = 0,
            DepthDrawAlways = 1,
            DepthDrawDisabled = 2,
        }
        enum DepthTest {
            DepthTestDefault = 0,
            DepthTestInverted = 1,
        }
        enum CullMode {
            CullBack = 0,
            CullFront = 1,
            CullDisabled = 2,
        }
        enum Flags {
            FlagDisableDepthTest = 0,
            FlagAlbedoFromVertexColor = 1,
            FlagSrgbVertexColor = 2,
            FlagUsePointSize = 3,
            FlagFixedSize = 4,
            FlagBillboardKeepScale = 5,
            FlagUv1UseTriplanar = 6,
            FlagUV2UseTriplanar = 7,
            FlagUv1UseWorldTriplanar = 8,
            FlagUV2UseWorldTriplanar = 9,
            FlagAOOnUV2 = 10,
            FlagEmissionOnUV2 = 11,
            FlagAlbedoTextureForceSrgb = 12,
            FlagDontReceiveShadows = 13,
            FlagDisableAmbientLight = 14,
            FlagUseShadowToOpacity = 15,
            FlagUseTextureRepeat = 16,
            FlagInvertHeightmap = 17,
            FlagSubsurfaceModeSkin = 18,
            FlagParticleTrailsMode = 19,
            FlagAlbedoTextureMsdf = 20,
            FlagDisableFog = 21,
            FlagDisableSpecularOcclusion = 22,
            FlagUseZClipScale = 23,
            FlagUseFovOverride = 24,
            FlagMax = 25,
        }
        enum DiffuseMode {
            DiffuseBurley = 0,
            DiffuseLambert = 1,
            DiffuseLambertWrap = 2,
            DiffuseToon = 3,
        }
        enum SpecularMode {
            SpecularSchlickGgx = 0,
            SpecularToon = 1,
            SpecularDisabled = 2,
        }
        enum BillboardMode {
            BillboardDisabled = 0,
            BillboardEnabled = 1,
            BillboardFixedY = 2,
            BillboardParticles = 3,
        }
        enum TextureChannel {
            TextureChannelRed = 0,
            TextureChannelGreen = 1,
            TextureChannelBlue = 2,
            TextureChannelAlpha = 3,
            TextureChannelGrayscale = 4,
        }
        enum EmissionOperator {
            EmissionOpAdd = 0,
            EmissionOpMultiply = 1,
        }
        enum DistanceFadeMode {
            DistanceFadeDisabled = 0,
            DistanceFadePixelAlpha = 1,
            DistanceFadePixelDither = 2,
            DistanceFadeObjectDither = 3,
        }
        enum StencilMode {
            StencilModeDisabled = 0,
            StencilModeOutline = 1,
            StencilModeXray = 2,
            StencilModeCustom = 3,
        }
        enum StencilFlags {
            StencilFlagRead = 1,
            StencilFlagWrite = 2,
            StencilFlagWriteDepthFail = 4,
        }
        enum StencilCompare {
            StencilCompareAlways = 0,
            StencilCompareLess = 1,
            StencilCompareEqual = 2,
            StencilCompareLessOrEqual = 3,
            StencilCompareGreater = 4,
            StencilCompareNotEqual = 5,
            StencilCompareGreaterOrEqual = 6,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBaseMaterial3D extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBaseMaterial3D extends __NameMapMaterial {
        set_flag: "setFlag";
        get_flag: "getFlag";
        set_feature: "setFeature";
        get_feature: "getFeature";
        set_texture: "setTexture";
        get_texture: "getTexture";
        alpha_scissor_threshold: "alphaScissorThreshold";
        alpha_hash_scale: "alphaHashScale";
        alpha_antialiasing_mode: "alphaAntialiasingMode";
        alpha_antialiasing_edge: "alphaAntialiasingEdge";
        blend_mode: "blendMode";
        cull_mode: "cullMode";
        depth_draw_mode: "depthDrawMode";
        no_depth_test: "noDepthTest";
        depth_test: "depthTest";
        shading_mode: "shadingMode";
        diffuse_mode: "diffuseMode";
        specular_mode: "specularMode";
        disable_ambient_light: "disableAmbientLight";
        disable_fog: "disableFog";
        disable_specular_occlusion: "disableSpecularOcclusion";
        vertex_color_use_as_albedo: "vertexColorUseAsAlbedo";
        vertex_color_is_srgb: "vertexColorIsSrgb";
        albedo_color: "albedoColor";
        albedo_texture: "albedoTexture";
        albedo_texture_force_srgb: "albedoTextureForceSrgb";
        albedo_texture_msdf: "albedoTextureMsdf";
        orm_texture: "ormTexture";
        metallic_specular: "metallicSpecular";
        metallic_texture: "metallicTexture";
        metallic_texture_channel: "metallicTextureChannel";
        roughness_texture: "roughnessTexture";
        roughness_texture_channel: "roughnessTextureChannel";
        emission_enabled: "emissionEnabled";
        emission_energy_multiplier: "emissionEnergyMultiplier";
        emission_intensity: "emissionIntensity";
        emission_operator: "emissionOperator";
        emission_on_uv2: "emissionOnUV2";
        emission_texture: "emissionTexture";
        normal_enabled: "normalEnabled";
        normal_scale: "normalScale";
        normal_texture: "normalTexture";
        bent_normal_enabled: "bentNormalEnabled";
        bent_normal_texture: "bentNormalTexture";
        rim_enabled: "rimEnabled";
        rim_tint: "rimTint";
        rim_texture: "rimTexture";
        clearcoat_enabled: "clearcoatEnabled";
        clearcoat_roughness: "clearcoatRoughness";
        clearcoat_texture: "clearcoatTexture";
        anisotropy_enabled: "anisotropyEnabled";
        anisotropy_flowmap: "anisotropyFlowmap";
        ao_enabled: "aOEnabled";
        ao_light_affect: "aOLightAffect";
        ao_texture: "aOTexture";
        ao_on_uv2: "aOOnUV2";
        ao_texture_channel: "aOTextureChannel";
        heightmap_enabled: "heightmapEnabled";
        heightmap_scale: "heightmapScale";
        heightmap_deep_parallax: "heightmapDeepParallax";
        heightmap_min_layers: "heightmapMinLayers";
        heightmap_max_layers: "heightmapMaxLayers";
        heightmap_flip_tangent: "heightmapFlipTangent";
        heightmap_flip_binormal: "heightmapFlipBinormal";
        heightmap_texture: "heightmapTexture";
        heightmap_flip_texture: "heightmapFlipTexture";
        subsurf_scatter_enabled: "subsurfScatterEnabled";
        subsurf_scatter_strength: "subsurfScatterStrength";
        subsurf_scatter_skin_mode: "subsurfScatterSkinMode";
        subsurf_scatter_texture: "subsurfScatterTexture";
        subsurf_scatter_transmittance_enabled: "subsurfScatterTransmittanceEnabled";
        subsurf_scatter_transmittance_color: "subsurfScatterTransmittanceColor";
        subsurf_scatter_transmittance_texture: "subsurfScatterTransmittanceTexture";
        subsurf_scatter_transmittance_depth: "subsurfScatterTransmittanceDepth";
        subsurf_scatter_transmittance_boost: "subsurfScatterTransmittanceBoost";
        backlight_enabled: "backlightEnabled";
        backlight_texture: "backlightTexture";
        refraction_enabled: "refractionEnabled";
        refraction_scale: "refractionScale";
        refraction_texture: "refractionTexture";
        refraction_texture_channel: "refractionTextureChannel";
        detail_enabled: "detailEnabled";
        detail_mask: "detailMask";
        detail_blend_mode: "detailBlendMode";
        detail_uv_layer: "detailUVLayer";
        detail_albedo: "detailAlbedo";
        detail_normal: "detailNormal";
        uv1_scale: "uv1Scale";
        uv1_offset: "uv1Offset";
        uv1_triplanar: "uv1Triplanar";
        uv1_triplanar_sharpness: "uv1TriplanarSharpness";
        uv1_world_triplanar: "uv1WorldTriplanar";
        uv2_scale: "uV2Scale";
        uv2_offset: "uV2Offset";
        uv2_triplanar: "uV2Triplanar";
        uv2_triplanar_sharpness: "uV2TriplanarSharpness";
        uv2_world_triplanar: "uV2WorldTriplanar";
        texture_filter: "textureFilter";
        texture_repeat: "textureRepeat";
        disable_receive_shadows: "disableReceiveShadows";
        shadow_to_opacity: "shadowToOpacity";
        billboard_mode: "billboardMode";
        billboard_keep_scale: "billboardKeepScale";
        particles_anim_enabled: "particlesAnimEnabled";
        particles_anim_h_frames: "particlesAnimHFrames";
        particles_anim_v_frames: "particlesAnimVFrames";
        particles_anim_loop: "particlesAnimLoop";
        grow_amount: "growAmount";
        fixed_size: "fixedSize";
        use_point_size: "usePointSize";
        point_size: "pointSize";
        use_particle_trails: "useParticleTrails";
        use_z_clip_scale: "useZClipScale";
        z_clip_scale: "zClipScale";
        use_fov_override: "useFovOverride";
        fov_override: "fovOverride";
        proximity_fade_enabled: "proximityFadeEnabled";
        proximity_fade_distance: "proximityFadeDistance";
        msdf_pixel_range: "msdfPixelRange";
        msdf_outline_size: "msdfOutlineSize";
        distance_fade_mode: "distanceFadeMode";
        distance_fade_min_distance: "distanceFadeMinDistance";
        distance_fade_max_distance: "distanceFadeMaxDistance";
        stencil_mode: "stencilMode";
        stencil_flags: "stencilFlags";
        stencil_compare: "stencilCompare";
        stencil_reference: "stencilReference";
        stencil_color: "stencilColor";
        stencil_outline_thickness: "stencilOutlineThickness";
    }
    /** Abstract base class for defining the 3D rendering properties of meshes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_basematerial3d.html  
     */
    class BaseMaterial3D extends Material {
        constructor(identifier?: any)
        /** If [param enable] is `true`, enables the specified [param flag]. Flags are optional behavior that can be turned on and off. Only one flag can be enabled at a time with this function, the flag enumerators cannot be bit-masked together to enable or disable multiple flags at once. Flags can also be enabled by setting their corresponding property to `true`. */
        setFlag(flag: BaseMaterial3D.Flags, enable: boolean): void
        
        /** Returns `true` if the specified [param flag] is enabled. */
        getFlag(flag: BaseMaterial3D.Flags): boolean
        
        /** If [param enable] is `true`, enables the specified [param feature]. Many features that are available in [BaseMaterial3D] need to be enabled before use. This way, the cost for using the feature is only incurred when specified. Features can also be enabled by setting their corresponding property to `true`. */
        setFeature(feature: BaseMaterial3D.Feature, enable: boolean): void
        
        /** Returns `true` if the specified [param feature] is enabled. */
        getFeature(feature: BaseMaterial3D.Feature): boolean
        
        /** Sets the texture for the slot specified by [param param]. */
        setTexture(param: BaseMaterial3D.TextureParam, texture: Texture2D): void
        
        /** Returns the [Texture2D] associated with the specified texture [param param]. */
        getTexture(param: BaseMaterial3D.TextureParam): null | Texture2D
        
        /** The material's transparency mode. Some transparency modes will disable shadow casting. Any transparency mode other than [constant TRANSPARENCY_DISABLED] has a greater performance impact compared to opaque rendering. See also [member blend_mode]. */
        get transparency(): int64
        set transparency(value: int64)
        
        /** Threshold at which the alpha scissor will discard values. Higher values will result in more pixels being discarded. If the material becomes too opaque at a distance, try increasing [member alpha_scissor_threshold]. If the material disappears at a distance, try decreasing [member alpha_scissor_threshold]. */
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
        
        /** The material's blend mode.  
         *      
         *  **Note:** Values other than `Mix` force the object into the transparent pipeline.  
         */
        get blendMode(): int64
        set blendMode(value: int64)
        
        /** Determines which side of the triangle to cull depending on whether the triangle faces towards or away from the camera. */
        get cullMode(): int64
        set cullMode(value: int64)
        
        /** Determines when depth rendering takes place. See also [member transparency]. */
        get depthDrawMode(): int64
        set depthDrawMode(value: int64)
        
        /** If `true`, depth testing is disabled and the object will be drawn in render order. */
        get noDepthTest(): boolean
        set noDepthTest(value: boolean)
        
        /** Determines which comparison operator is used when testing depth.  
         *      
         *  **Note:** Changing [member depth_test] to a non-default value only has a visible effect when used on a transparent material, or a material that has [member depth_draw_mode] set to [constant DEPTH_DRAW_DISABLED].  
         */
        get depthTest(): int64
        set depthTest(value: int64)
        
        /** Sets whether the shading takes place, per-pixel, per-vertex or unshaded. Per-vertex lighting is faster, making it the best choice for mobile applications, however it looks considerably worse than per-pixel. Unshaded rendering is the fastest, but disables all interactions with lights. */
        get shadingMode(): int64
        set shadingMode(value: int64)
        
        /** The algorithm used for diffuse light scattering. */
        get diffuseMode(): int64
        set diffuseMode(value: int64)
        
        /** The method for rendering the specular blob.  
         *      
         *  **Note:** [member specular_mode] only applies to the specular blob. It does not affect specular reflections from the sky, screen-space reflections, [VoxelGI], SDFGI or [ReflectionProbe]s. To disable reflections from these sources as well, set [member metallic_specular] to `0.0` instead.  
         */
        get specularMode(): int64
        set specularMode(value: int64)
        
        /** If `true`, the object receives no ambient light. */
        get disableAmbientLight(): boolean
        set disableAmbientLight(value: boolean)
        
        /** If `true`, the object will not be affected by fog (neither volumetric nor depth fog). This is useful for unshaded or transparent materials (e.g. particles), which without this setting will be affected even if fully transparent. */
        get disableFog(): boolean
        set disableFog(value: boolean)
        
        /** If `true`, disables specular occlusion even if [member ProjectSettings.rendering/reflections/specular_occlusion/enabled] is `false`. */
        get disableSpecularOcclusion(): boolean
        set disableSpecularOcclusion(value: boolean)
        
        /** If `true`, the vertex color is used as albedo color. */
        get vertexColorUseAsAlbedo(): boolean
        set vertexColorUseAsAlbedo(value: boolean)
        
        /** If `true`, vertex colors are considered to be stored in nonlinear sRGB encoding and are converted to linear encoding during rendering. If `false`, vertex colors are considered to be stored in linear encoding and are rendered as-is. See also [member albedo_texture_force_srgb].  
         *      
         *  **Note:** Only effective when using the Forward+ and Mobile rendering methods, not Compatibility.  
         */
        get vertexColorIsSrgb(): boolean
        set vertexColorIsSrgb(value: boolean)
        
        /** The material's base color.  
         *      
         *  **Note:** If [member detail_enabled] is `true` and a [member detail_albedo] texture is specified, [member albedo_color] will  *not*  modulate the detail texture. This can be used to color partial areas of a material by not specifying an albedo texture and using a transparent [member detail_albedo] texture instead.  
         */
        get albedoColor(): Color
        set albedoColor(value: Color)
        
        /** Texture to multiply by [member albedo_color]. Used for basic texturing of objects.  
         *  If the texture appears unexpectedly too dark or too bright, check [member albedo_texture_force_srgb].  
         */
        get albedoTexture(): null | Texture2D
        set albedoTexture(value: null | Texture2D)
        
        /** If `true`, forces a conversion of the [member albedo_texture] from nonlinear sRGB encoding to linear encoding. See also [member vertex_color_is_srgb].  
         *  This should only be enabled when needed (typically when using a [ViewportTexture] as [member albedo_texture]). If [member albedo_texture_force_srgb] is `true` when it shouldn't be, the texture will appear to be too dark. If [member albedo_texture_force_srgb] is `false` when it shouldn't be, the texture will appear to be too bright.  
         */
        get albedoTextureForceSrgb(): boolean
        set albedoTextureForceSrgb(value: boolean)
        
        /** Enables multichannel signed distance field rendering shader. Use [member msdf_pixel_range] and [member msdf_outline_size] to configure MSDF parameters. */
        get albedoTextureMsdf(): boolean
        set albedoTextureMsdf(value: boolean)
        
        /** The Occlusion/Roughness/Metallic texture to use. This is a more efficient replacement of [member ao_texture], [member roughness_texture] and [member metallic_texture] in [ORMMaterial3D]. Ambient occlusion is stored in the red channel. Roughness map is stored in the green channel. Metallic map is stored in the blue channel. The alpha channel is ignored. */
        get ormTexture(): null | Texture2D
        set ormTexture(value: null | Texture2D)
        
        /** A high value makes the material appear more like a metal. Non-metals use their albedo as the diffuse color and add diffuse to the specular reflection. With non-metals, the reflection appears on top of the albedo color. Metals use their albedo as a multiplier to the specular reflection and set the diffuse color to black resulting in a tinted reflection. Materials work better when fully metal or fully non-metal, values between `0` and `1` should only be used for blending between metal and non-metal sections. To alter the amount of reflection use [member roughness]. */
        get metallic(): float64
        set metallic(value: float64)
        
        /** Adjusts the strength of specular reflections. Specular reflections are composed of scene reflections and the specular lobe which is the bright spot that is reflected from light sources. When set to `0.0`, no specular reflections will be visible. This differs from the [constant SPECULAR_DISABLED] [enum SpecularMode] as [constant SPECULAR_DISABLED] only applies to the specular lobe from the light source.  
         *      
         *  **Note:** Unlike [member metallic], this is not energy-conserving, so it should be left at `0.5` in most cases. See also [member roughness].  
         */
        get metallicSpecular(): float64
        set metallicSpecular(value: float64)
        
        /** Texture used to specify metallic for an object. This is multiplied by [member metallic]. */
        get metallicTexture(): null | Texture2D
        set metallicTexture(value: null | Texture2D)
        
        /** Specifies the channel of the [member metallic_texture] in which the metallic information is stored. This is useful when you store the information for multiple effects in a single texture. For example if you stored metallic in the red channel, roughness in the blue, and ambient occlusion in the green you could reduce the number of textures you use. */
        get metallicTextureChannel(): int64
        set metallicTextureChannel(value: int64)
        
        /** Surface reflection. A value of `0` represents a perfect mirror while a value of `1` completely blurs the reflection. See also [member metallic]. */
        get roughness(): float64
        set roughness(value: float64)
        
        /** Texture used to control the roughness per-pixel. Multiplied by [member roughness]. */
        get roughnessTexture(): null | Texture2D
        set roughnessTexture(value: null | Texture2D)
        
        /** Specifies the channel of the [member roughness_texture] in which the roughness information is stored. This is useful when you store the information for multiple effects in a single texture. For example if you stored metallic in the red channel, roughness in the blue, and ambient occlusion in the green you could reduce the number of textures you use. */
        get roughnessTextureChannel(): int64
        set roughnessTextureChannel(value: int64)
        
        /** If `true`, the body emits light. Emitting light makes the object appear brighter. The object can also cast light on other objects if a [VoxelGI], SDFGI, or [LightmapGI] is used and this object is used in baked lighting. */
        get emissionEnabled(): boolean
        set emissionEnabled(value: boolean)
        
        /** The emitted light's color. See [member emission_enabled]. */
        get emission(): Color
        set emission(value: Color)
        
        /** Multiplier for emitted light. See [member emission_enabled]. */
        get emissionEnergyMultiplier(): float64
        set emissionEnergyMultiplier(value: float64)
        
        /** Luminance of emitted light, measured in nits (candela per square meter). Only available when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is enabled. The default is roughly equivalent to an indoor lightbulb. */
        get emissionIntensity(): float64
        set emissionIntensity(value: float64)
        
        /** Sets how [member emission] interacts with [member emission_texture]. Can either add or multiply. */
        get emissionOperator(): int64
        set emissionOperator(value: int64)
        
        /** Use `UV2` to read from the [member emission_texture]. */
        get emissionOnUV2(): boolean
        set emissionOnUV2(value: boolean)
        
        /** Texture that specifies how much surface emits light at a given point. */
        get emissionTexture(): null | Texture2D
        set emissionTexture(value: null | Texture2D)
        
        /** If `true`, normal mapping is enabled. This has a slight performance cost, especially on mobile GPUs. */
        get normalEnabled(): boolean
        set normalEnabled(value: boolean)
        
        /** The strength of the normal map's effect. */
        get normalScale(): float64
        set normalScale(value: float64)
        
        /** Texture used to specify the normal at a given pixel. The [member normal_texture] only uses the red and green channels; the blue and alpha channels are ignored. The normal read from [member normal_texture] is oriented around the surface normal provided by the [Mesh].  
         *      
         *  **Note:** The mesh must have both normals and tangents defined in its vertex data. Otherwise, the normal map won't render correctly and will only appear to darken the whole surface. If creating geometry with [SurfaceTool], you can use [method SurfaceTool.generate_normals] and [method SurfaceTool.generate_tangents] to automatically generate normals and tangents respectively.  
         *      
         *  **Note:** Godot expects the normal map to use X+, Y+, and Z+ coordinates. See [url=http://wiki.polycount.com/wiki/Normal_Map_Technical_Details#Common_Swizzle_Coordinates]this page[/url] for a comparison of normal map coordinates expected by popular engines.  
         *      
         *  **Note:** If [member detail_enabled] is `true`, the [member detail_albedo] texture is drawn  *below*  the [member normal_texture]. To display a normal map  *above*  the [member detail_albedo] texture, use [member detail_normal] instead.  
         */
        get normalTexture(): null | Texture2D
        set normalTexture(value: null | Texture2D)
        
        /** If `true`, the bent normal map is enabled. This allows for more accurate indirect lighting and specular occlusion. */
        get bentNormalEnabled(): boolean
        set bentNormalEnabled(value: boolean)
        
        /** Texture that specifies the average direction of incoming ambient light at a given pixel. The [member bent_normal_texture] only uses the red and green channels; the blue and alpha channels are ignored. The normal read from [member bent_normal_texture] is oriented around the surface normal provided by the [Mesh].  
         *      
         *  **Note:** A bent normal map is different from a regular normal map. When baking a bent normal map make sure to use **a cosine distribution** for the bent normal map to work correctly.  
         *      
         *  **Note:** The mesh must have both normals and tangents defined in its vertex data. Otherwise, the shading produced by the bent normal map will not look correct. If creating geometry with [SurfaceTool], you can use [method SurfaceTool.generate_normals] and [method SurfaceTool.generate_tangents] to automatically generate normals and tangents respectively.  
         *      
         *  **Note:** Godot expects the bent normal map to use X+, Y+, and Z+ coordinates. See [url=http://wiki.polycount.com/wiki/Normal_Map_Technical_Details#Common_Swizzle_Coordinates]this page[/url] for a comparison of normal map coordinates expected by popular engines.  
         */
        get bentNormalTexture(): null | Texture2D
        set bentNormalTexture(value: null | Texture2D)
        
        /** If `true`, rim effect is enabled. Rim lighting increases the brightness at glancing angles on an object.  
         *      
         *  **Note:** Rim lighting is not visible if the material's [member shading_mode] is [constant SHADING_MODE_UNSHADED].  
         */
        get rimEnabled(): boolean
        set rimEnabled(value: boolean)
        
        /** Sets the strength of the rim lighting effect. */
        get rim(): float64
        set rim(value: float64)
        
        /** The amount of to blend light and albedo color when rendering rim effect. If `0` the light color is used, while `1` means albedo color is used. An intermediate value generally works best. */
        get rimTint(): float64
        set rimTint(value: float64)
        
        /** Texture used to set the strength of the rim lighting effect per-pixel. Multiplied by [member rim]. */
        get rimTexture(): null | Texture2D
        set rimTexture(value: null | Texture2D)
        
        /** If `true`, clearcoat rendering is enabled. Adds a secondary transparent pass to the lighting calculation resulting in an added specular blob. This makes materials appear as if they have a clear layer on them that can be either glossy or rough.  
         *      
         *  **Note:** Clearcoat rendering is not visible if the material's [member shading_mode] is [constant SHADING_MODE_UNSHADED].  
         */
        get clearcoatEnabled(): boolean
        set clearcoatEnabled(value: boolean)
        
        /** Sets the strength of the clearcoat effect. Setting to `0` looks the same as disabling the clearcoat effect. */
        get clearcoat(): float64
        set clearcoat(value: float64)
        
        /** Sets the roughness of the clearcoat pass. A higher value results in a rougher clearcoat while a lower value results in a smoother clearcoat. */
        get clearcoatRoughness(): float64
        set clearcoatRoughness(value: float64)
        
        /** Texture that defines the strength of the clearcoat effect and the glossiness of the clearcoat. Strength is specified in the red channel while glossiness is specified in the green channel. */
        get clearcoatTexture(): null | Texture2D
        set clearcoatTexture(value: null | Texture2D)
        
        /** If `true`, anisotropy is enabled. Anisotropy changes the shape of the specular blob and aligns it to tangent space. This is useful for brushed aluminum and hair reflections.  
         *      
         *  **Note:** Mesh tangents are needed for anisotropy to work. If the mesh does not contain tangents, the anisotropy effect will appear broken.  
         *      
         *  **Note:** Material anisotropy should not to be confused with anisotropic texture filtering, which can be enabled by setting [member texture_filter] to [constant TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC].  
         */
        get anisotropyEnabled(): boolean
        set anisotropyEnabled(value: boolean)
        
        /** The strength of the anisotropy effect. This is multiplied by [member anisotropy_flowmap]'s alpha channel if a texture is defined there and the texture contains an alpha channel. */
        get anisotropy(): float64
        set anisotropy(value: float64)
        
        /** Texture that offsets the tangent map for anisotropy calculations and optionally controls the anisotropy effect (if an alpha channel is present). The flowmap texture is expected to be a derivative map, with the red channel representing distortion on the X axis and green channel representing distortion on the Y axis. Values below 0.5 will result in negative distortion, whereas values above 0.5 will result in positive distortion.  
         *  If present, the texture's alpha channel will be used to multiply the strength of the [member anisotropy] effect. Fully opaque pixels will keep the anisotropy effect's original strength while fully transparent pixels will disable the anisotropy effect entirely. The flowmap texture's blue channel is ignored.  
         */
        get anisotropyFlowmap(): null | Texture2D
        set anisotropyFlowmap(value: null | Texture2D)
        
        /** If `true`, ambient occlusion is enabled. Ambient occlusion darkens areas based on the [member ao_texture]. */
        get aOEnabled(): boolean
        set aOEnabled(value: boolean)
        
        /** Amount that ambient occlusion affects lighting from lights. If `0`, ambient occlusion only affects ambient light. If `1`, ambient occlusion affects lights just as much as it affects ambient light. This can be used to impact the strength of the ambient occlusion effect, but typically looks unrealistic. */
        get aOLightAffect(): float64
        set aOLightAffect(value: float64)
        
        /** Texture that defines the amount of ambient occlusion for a given point on the object. */
        get aOTexture(): null | Texture2D
        set aOTexture(value: null | Texture2D)
        
        /** If `true`, use `UV2` coordinates to look up from the [member ao_texture]. */
        get aOOnUV2(): boolean
        set aOOnUV2(value: boolean)
        
        /** Specifies the channel of the [member ao_texture] in which the ambient occlusion information is stored. This is useful when you store the information for multiple effects in a single texture. For example if you stored metallic in the red channel, roughness in the blue, and ambient occlusion in the green you could reduce the number of textures you use. */
        get aOTextureChannel(): int64
        set aOTextureChannel(value: int64)
        
        /** If `true`, height mapping is enabled (also called "parallax mapping" or "depth mapping"). See also [member normal_enabled]. Height mapping is a demanding feature on the GPU, so it should only be used on materials where it makes a significant visual difference.  
         *      
         *  **Note:** Height mapping is not supported if triplanar mapping is used on the same material. The value of [member heightmap_enabled] will be ignored if [member uv1_triplanar] is enabled.  
         */
        get heightmapEnabled(): boolean
        set heightmapEnabled(value: boolean)
        
        /** The heightmap scale to use for the parallax effect (see [member heightmap_enabled]). The default value is tuned so that the highest point (value = 255) appears to be 5 cm higher than the lowest point (value = 0). Higher values result in a deeper appearance, but may result in artifacts appearing when looking at the material from oblique angles, especially when the camera moves. Negative values can be used to invert the parallax effect, but this is different from inverting the texture using [member heightmap_flip_texture] as the material will also appear to be "closer" to the camera. In most cases, [member heightmap_scale] should be kept to a positive value.  
         *      
         *  **Note:** If the height map effect looks strange regardless of this value, try adjusting [member heightmap_flip_binormal] and [member heightmap_flip_tangent]. See also [member heightmap_texture] for recommendations on authoring heightmap textures, as the way the heightmap texture is authored affects how [member heightmap_scale] behaves.  
         */
        get heightmapScale(): float64
        set heightmapScale(value: float64)
        
        /** If `true`, uses parallax occlusion mapping to represent depth in the material instead of simple offset mapping (see [member heightmap_enabled]). This results in a more convincing depth effect, but is much more expensive on the GPU. Only enable this on materials where it makes a significant visual difference. */
        get heightmapDeepParallax(): boolean
        set heightmapDeepParallax(value: boolean)
        
        /** The number of layers to use for parallax occlusion mapping when the camera is far away from the material. Higher values result in a more convincing depth effect, especially in materials that have steep height changes. Higher values have a significant cost on the GPU, so it should only be increased on materials where it makes a significant visual difference.  
         *      
         *  **Note:** Only effective if [member heightmap_deep_parallax] is `true`.  
         */
        get heightmapMinLayers(): int64
        set heightmapMinLayers(value: int64)
        
        /** The number of layers to use for parallax occlusion mapping when the camera is up close to the material. Higher values result in a more convincing depth effect, especially in materials that have steep height changes. Higher values have a significant cost on the GPU, so it should only be increased on materials where it makes a significant visual difference.  
         *      
         *  **Note:** Only effective if [member heightmap_deep_parallax] is `true`.  
         */
        get heightmapMaxLayers(): int64
        set heightmapMaxLayers(value: int64)
        
        /** If `true`, flips the mesh's tangent vectors when interpreting the height map. If the heightmap effect looks strange when the camera moves (even with a reasonable [member heightmap_scale]), try setting this to `true`. */
        get heightmapFlipTangent(): boolean
        set heightmapFlipTangent(value: boolean)
        
        /** If `true`, flips the mesh's binormal vectors when interpreting the height map. If the heightmap effect looks strange when the camera moves (even with a reasonable [member heightmap_scale]), try setting this to `true`. */
        get heightmapFlipBinormal(): boolean
        set heightmapFlipBinormal(value: boolean)
        
        /** The texture to use as a height map. See also [member heightmap_enabled].  
         *  For best results, the texture should be normalized (with [member heightmap_scale] reduced to compensate). In [url=https://gimp.org]GIMP[/url], this can be done using **Colors > Auto > Equalize**. If the texture only uses a small part of its available range, the parallax effect may look strange, especially when the camera moves.  
         *      
         *  **Note:** To reduce memory usage and improve loading times, you may be able to use a lower-resolution heightmap texture as most heightmaps are only comprised of low-frequency data.  
         */
        get heightmapTexture(): null | Texture2D
        set heightmapTexture(value: null | Texture2D)
        
        /** If `true`, interprets the height map texture as a depth map, with brighter values appearing to be "lower" in altitude compared to darker values.  
         *  This can be enabled for compatibility with some materials authored for Godot 3.x. This is not necessary if the Invert import option was used to invert the depth map in Godot 3.x, in which case [member heightmap_flip_texture] should remain `false`.  
         */
        get heightmapFlipTexture(): boolean
        set heightmapFlipTexture(value: boolean)
        
        /** If `true`, subsurface scattering is enabled. Emulates light that penetrates an object's surface, is scattered, and then emerges. Subsurface scattering quality is controlled by [member ProjectSettings.rendering/environment/subsurface_scattering/subsurface_scattering_quality].  
         *      
         *  **Note:** Subsurface scattering is not supported on viewports that have a transparent background (where [member Viewport.transparent_bg] is `true`).  
         */
        get subsurfScatterEnabled(): boolean
        set subsurfScatterEnabled(value: boolean)
        
        /** The strength of the subsurface scattering effect. The depth of the effect is also controlled by [member ProjectSettings.rendering/environment/subsurface_scattering/subsurface_scattering_scale], which is set globally. */
        get subsurfScatterStrength(): float64
        set subsurfScatterStrength(value: float64)
        
        /** If `true`, subsurface scattering will use a special mode optimized for the color and density of human skin, such as boosting the intensity of the red channel in subsurface scattering. */
        get subsurfScatterSkinMode(): boolean
        set subsurfScatterSkinMode(value: boolean)
        
        /** Texture used to control the subsurface scattering strength. Stored in the red texture channel. Multiplied by [member subsurf_scatter_strength]. */
        get subsurfScatterTexture(): null | Texture2D
        set subsurfScatterTexture(value: null | Texture2D)
        
        /** If `true`, enables subsurface scattering transmittance. Only effective if [member subsurf_scatter_enabled] is `true`. See also [member backlight_enabled]. */
        get subsurfScatterTransmittanceEnabled(): boolean
        set subsurfScatterTransmittanceEnabled(value: boolean)
        
        /** The color to multiply the subsurface scattering transmittance effect with. Ignored if [member subsurf_scatter_skin_mode] is `true`. */
        get subsurfScatterTransmittanceColor(): Color
        set subsurfScatterTransmittanceColor(value: Color)
        
        /** The texture to use for multiplying the intensity of the subsurface scattering transmittance intensity. See also [member subsurf_scatter_texture]. Ignored if [member subsurf_scatter_skin_mode] is `true`. */
        get subsurfScatterTransmittanceTexture(): null | Texture2D
        set subsurfScatterTransmittanceTexture(value: null | Texture2D)
        
        /** The depth of the subsurface scattering transmittance effect. */
        get subsurfScatterTransmittanceDepth(): float64
        set subsurfScatterTransmittanceDepth(value: float64)
        
        /** The intensity of the subsurface scattering transmittance effect. */
        get subsurfScatterTransmittanceBoost(): float64
        set subsurfScatterTransmittanceBoost(value: float64)
        
        /** If `true`, the backlight effect is enabled. See also [member subsurf_scatter_transmittance_enabled]. */
        get backlightEnabled(): boolean
        set backlightEnabled(value: boolean)
        
        /** The color used by the backlight effect. Represents the light passing through an object. */
        get backlight(): Color
        set backlight(value: Color)
        
        /** Texture used to control the backlight effect per-pixel. Added to [member backlight]. */
        get backlightTexture(): null | Texture2D
        set backlightTexture(value: null | Texture2D)
        
        /** If `true`, the refraction effect is enabled. Distorts transparency based on light from behind the object.  
         *      
         *  **Note:** Refraction is implemented using the screen texture. Only opaque materials will appear in the refraction, since transparent materials do not appear in the screen texture.  
         */
        get refractionEnabled(): boolean
        set refractionEnabled(value: boolean)
        
        /** The strength of the refraction effect. */
        get refractionScale(): float64
        set refractionScale(value: float64)
        
        /** Texture that controls the strength of the refraction per-pixel. Multiplied by [member refraction_scale]. */
        get refractionTexture(): null | Texture2D
        set refractionTexture(value: null | Texture2D)
        
        /** Specifies the channel of the [member refraction_texture] in which the refraction information is stored. This is useful when you store the information for multiple effects in a single texture. For example if you stored refraction in the red channel, roughness in the blue, and ambient occlusion in the green you could reduce the number of textures you use. */
        get refractionTextureChannel(): int64
        set refractionTextureChannel(value: int64)
        
        /** If `true`, enables the detail overlay. Detail is a second texture that gets mixed over the surface of the object based on [member detail_mask] and [member detail_albedo]'s alpha channel. This can be used to add variation to objects, or to blend between two different albedo/normal textures. */
        get detailEnabled(): boolean
        set detailEnabled(value: boolean)
        
        /** Texture used to specify how the detail textures get blended with the base textures. [member detail_mask] can be used together with [member detail_albedo]'s alpha channel (if any). */
        get detailMask(): null | Texture2D
        set detailMask(value: null | Texture2D)
        
        /** Specifies how the [member detail_albedo] should blend with the current `ALBEDO`. */
        get detailBlendMode(): int64
        set detailBlendMode(value: int64)
        
        /** Specifies whether to use `UV` or `UV2` for the detail layer. */
        get detailUVLayer(): int64
        set detailUVLayer(value: int64)
        
        /** Texture that specifies the color of the detail overlay. [member detail_albedo]'s alpha channel is used as a mask, even when the material is opaque. To use a dedicated texture as a mask, see [member detail_mask].  
         *      
         *  **Note:** [member detail_albedo] is  *not*  modulated by [member albedo_color].  
         */
        get detailAlbedo(): null | Texture2D
        set detailAlbedo(value: null | Texture2D)
        
        /** Texture that specifies the per-pixel normal of the detail overlay. The [member detail_normal] texture only uses the red and green channels; the blue and alpha channels are ignored. The normal read from [member detail_normal] is oriented around the surface normal provided by the [Mesh].  
         *      
         *  **Note:** Godot expects the normal map to use X+, Y+, and Z+ coordinates. See [url=http://wiki.polycount.com/wiki/Normal_Map_Technical_Details#Common_Swizzle_Coordinates]this page[/url] for a comparison of normal map coordinates expected by popular engines.  
         */
        get detailNormal(): null | Texture2D
        set detailNormal(value: null | Texture2D)
        
        /** How much to scale the `UV` coordinates. This is multiplied by `UV` in the vertex function. The Z component is used when [member uv1_triplanar] is enabled, but it is not used anywhere else. */
        get uv1Scale(): Vector3
        set uv1Scale(value: Vector3)
        
        /** How much to offset the `UV` coordinates. This amount will be added to `UV` in the vertex function. This can be used to offset a texture. The Z component is used when [member uv1_triplanar] is enabled, but it is not used anywhere else. */
        get uv1Offset(): Vector3
        set uv1Offset(value: Vector3)
        
        /** If `true`, instead of using `UV` textures will use a triplanar texture lookup to determine how to apply textures. Triplanar uses the orientation of the object's surface to blend between texture coordinates. It reads from the source texture 3 times, once for each axis and then blends between the results based on how closely the pixel aligns with each axis. This is often used for natural features to get a realistic blend of materials. Because triplanar texturing requires many more texture reads per-pixel it is much slower than normal UV texturing. Additionally, because it is blending the texture between the three axes, it is unsuitable when you are trying to achieve crisp texturing. */
        get uv1Triplanar(): boolean
        set uv1Triplanar(value: boolean)
        
        /** A lower number blends the texture more softly while a higher number blends the texture more sharply.  
         *      
         *  **Note:** [member uv1_triplanar_sharpness] is clamped between `0.0` and `150.0` (inclusive) as values outside that range can look broken depending on the mesh.  
         */
        get uv1TriplanarSharpness(): float64
        set uv1TriplanarSharpness(value: float64)
        
        /** If `true`, triplanar mapping for `UV` is calculated in world space rather than object local space. See also [member uv1_triplanar]. */
        get uv1WorldTriplanar(): boolean
        set uv1WorldTriplanar(value: boolean)
        
        /** How much to scale the `UV2` coordinates. This is multiplied by `UV2` in the vertex function. The Z component is used when [member uv2_triplanar] is enabled, but it is not used anywhere else. */
        get uV2Scale(): Vector3
        set uV2Scale(value: Vector3)
        
        /** How much to offset the `UV2` coordinates. This amount will be added to `UV2` in the vertex function. This can be used to offset a texture. The Z component is used when [member uv2_triplanar] is enabled, but it is not used anywhere else. */
        get uV2Offset(): Vector3
        set uV2Offset(value: Vector3)
        
        /** If `true`, instead of using `UV2` textures will use a triplanar texture lookup to determine how to apply textures. Triplanar uses the orientation of the object's surface to blend between texture coordinates. It reads from the source texture 3 times, once for each axis and then blends between the results based on how closely the pixel aligns with each axis. This is often used for natural features to get a realistic blend of materials. Because triplanar texturing requires many more texture reads per-pixel it is much slower than normal UV texturing. Additionally, because it is blending the texture between the three axes, it is unsuitable when you are trying to achieve crisp texturing. */
        get uV2Triplanar(): boolean
        set uV2Triplanar(value: boolean)
        
        /** A lower number blends the texture more softly while a higher number blends the texture more sharply.  
         *      
         *  **Note:** [member uv2_triplanar_sharpness] is clamped between `0.0` and `150.0` (inclusive) as values outside that range can look broken depending on the mesh.  
         */
        get uV2TriplanarSharpness(): float64
        set uV2TriplanarSharpness(value: float64)
        
        /** If `true`, triplanar mapping for `UV2` is calculated in world space rather than object local space. See also [member uv2_triplanar]. */
        get uV2WorldTriplanar(): boolean
        set uV2WorldTriplanar(value: boolean)
        
        /** Filter flags for the texture.  
         *      
         *  **Note:** [member heightmap_texture] is always sampled with linear filtering, even if nearest-neighbor filtering is selected here. This is to ensure the heightmap effect looks as intended. If you need sharper height transitions between pixels, resize the heightmap texture in an image editor with nearest-neighbor filtering.  
         */
        get textureFilter(): int64
        set textureFilter(value: int64)
        
        /** If `true`, the texture repeats when exceeding the texture's size. See [constant FLAG_USE_TEXTURE_REPEAT]. */
        get textureRepeat(): boolean
        set textureRepeat(value: boolean)
        
        /** If `true`, the object receives no shadow that would otherwise be cast onto it. */
        get disableReceiveShadows(): boolean
        set disableReceiveShadows(value: boolean)
        
        /** If `true`, enables the "shadow to opacity" render mode where lighting modifies the alpha so shadowed areas are opaque and non-shadowed areas are transparent. Useful for overlaying shadows onto a camera feed in AR. */
        get shadowToOpacity(): boolean
        set shadowToOpacity(value: boolean)
        
        /** Controls how the object faces the camera.  
         *      
         *  **Note:** Billboard mode is not suitable for VR because the left-right vector of the camera is not horizontal when the screen is attached to your head instead of on the table. See [url=https://github.com/godotengine/godot/issues/41567]GitHub issue #41567[/url] for details.  
         */
        get billboardMode(): int64
        set billboardMode(value: int64)
        
        /** If `true`, the shader will keep the scale set for the mesh. Otherwise, the scale is lost when billboarding. Only applies when [member billboard_mode] is not [constant BILLBOARD_DISABLED]. */
        get billboardKeepScale(): boolean
        set billboardKeepScale(value: boolean)
        
        /** If `true`, enables `particles_anim_*` properties. The [member ParticleProcessMaterial.anim_speed_min] or [member CPUParticles3D.anim_speed_min] should also be set to a value bigger than zero for the animation to play.  
         *      
         *  **Note:** For compatibility reasons, this property is ignored and always enabled when [member billboard_mode] is set to [constant BILLBOARD_PARTICLES].  
         */
        get particlesAnimEnabled(): boolean
        set particlesAnimEnabled(value: boolean)
        
        /** The number of horizontal frames in the particle sprite sheet.  
         *  Only enabled when [member particles_anim_enabled] is `true` or [member billboard_mode] is set to [constant BILLBOARD_PARTICLES].  
         */
        get particlesAnimHFrames(): int64
        set particlesAnimHFrames(value: int64)
        
        /** The number of vertical frames in the particle sprite sheet.  
         *  Only enabled when [member particles_anim_enabled] is `true` or [member billboard_mode] is set to [constant BILLBOARD_PARTICLES].  
         */
        get particlesAnimVFrames(): int64
        set particlesAnimVFrames(value: int64)
        
        /** If `true`, particle animations are looped.  
         *  Only enabled when [member particles_anim_enabled] is `true` or [member billboard_mode] is set to [constant BILLBOARD_PARTICLES].  
         */
        get particlesAnimLoop(): boolean
        set particlesAnimLoop(value: boolean)
        
        /** If `true`, enables the vertex grow setting. This can be used to create mesh-based outlines using a second material pass and its [member cull_mode] set to [constant CULL_FRONT]. See also [member grow_amount].  
         *      
         *  **Note:** Vertex growth cannot create new vertices, which means that visible gaps may occur in sharp corners. This can be alleviated by designing the mesh to use smooth normals exclusively using [url=http://wiki.polycount.com/wiki/Face_weighted_normals]face weighted normals[/url] in the 3D authoring software. In this case, grow will be able to join every outline together, just like in the original mesh.  
         */
        get grow(): boolean
        set grow(value: boolean)
        
        /** Grows object vertices in the direction of their normals. Only effective if [member grow] is `true`. */
        get growAmount(): float64
        set growAmount(value: float64)
        
        /** If `true`, the object is rendered at the same size regardless of distance. The object's size on screen is the same as if the camera was `1.0` units away from the object's origin, regardless of the actual distance from the camera. The [Camera3D]'s field of view (or [member Camera3D.size] when in orthogonal/frustum mode) still affects the size the object is drawn at. */
        get fixedSize(): boolean
        set fixedSize(value: boolean)
        
        /** If `true`, render point size can be changed.  
         *      
         *  **Note:** This is only effective for objects whose geometry is point-based rather than triangle-based. See also [member point_size].  
         */
        get usePointSize(): boolean
        set usePointSize(value: boolean)
        
        /** The point size in pixels. See [member use_point_size]. */
        get pointSize(): float64
        set pointSize(value: float64)
        
        /** If `true`, enables parts of the shader required for [GPUParticles3D] trails to function. This also requires using a mesh with appropriate skinning, such as [RibbonTrailMesh] or [TubeTrailMesh]. Enabling this feature outside of materials used in [GPUParticles3D] meshes will break material rendering. */
        get useParticleTrails(): boolean
        set useParticleTrails(value: boolean)
        
        /** If `true` use [member z_clip_scale] to scale the object being rendered towards the camera to avoid clipping into things like walls. */
        get useZClipScale(): boolean
        set useZClipScale(value: boolean)
        
        /** Scales the object being rendered towards the camera to avoid clipping into things like walls. This is intended to be used for objects that are fixed with respect to the camera like player arms, tools, etc. Lighting and shadows will continue to work correctly when this setting is adjusted, but screen-space effects like SSAO and SSR may break with lower scales. Therefore, try to keep this setting as close to `1.0` as possible. */
        get zClipScale(): float64
        set zClipScale(value: float64)
        
        /** If `true` use [member fov_override] to override the [Camera3D]'s field of view angle. */
        get useFovOverride(): boolean
        set useFovOverride(value: boolean)
        
        /** Overrides the [Camera3D]'s field of view angle (in degrees).  
         *      
         *  **Note:** This behaves as if the field of view is set on a [Camera3D] with [member Camera3D.keep_aspect] set to [constant Camera3D.KEEP_HEIGHT]. Additionally, it may not look correct on a non-perspective camera where the field of view setting is ignored.  
         */
        get fovOverride(): float64
        set fovOverride(value: float64)
        
        /** If `true`, the proximity fade effect is enabled. The proximity fade effect fades out each pixel based on its distance to another object. */
        get proximityFadeEnabled(): boolean
        set proximityFadeEnabled(value: boolean)
        
        /** Distance over which the fade effect takes place. The larger the distance the longer it takes for an object to fade. */
        get proximityFadeDistance(): float64
        set proximityFadeDistance(value: float64)
        
        /** The width of the range around the shape between the minimum and maximum representable signed distance. */
        get msdfPixelRange(): float64
        set msdfPixelRange(value: float64)
        
        /** The width of the shape outline. */
        get msdfOutlineSize(): float64
        set msdfOutlineSize(value: float64)
        
        /** Specifies which type of fade to use. Can be any of the [enum DistanceFadeMode]s. */
        get distanceFadeMode(): int64
        set distanceFadeMode(value: int64)
        
        /** Distance at which the object starts to become visible. If the object is less than this distance away, it will be invisible.  
         *      
         *  **Note:** If [member distance_fade_min_distance] is greater than [member distance_fade_max_distance], the behavior will be reversed. The object will start to fade away at [member distance_fade_max_distance] and will fully disappear once it reaches [member distance_fade_min_distance].  
         */
        get distanceFadeMinDistance(): float64
        set distanceFadeMinDistance(value: float64)
        
        /** Distance at which the object appears fully opaque.  
         *      
         *  **Note:** If [member distance_fade_max_distance] is less than [member distance_fade_min_distance], the behavior will be reversed. The object will start to fade away at [member distance_fade_max_distance] and will fully disappear once it reaches [member distance_fade_min_distance].  
         */
        get distanceFadeMaxDistance(): float64
        set distanceFadeMaxDistance(value: float64)
        
        /** The stencil effect mode. */
        get stencilMode(): int64
        set stencilMode(value: int64)
        
        /** The flags dictating how the stencil operation behaves. */
        get stencilFlags(): int64
        set stencilFlags(value: int64)
        
        /** The comparison operator to use for stencil masking operations. */
        get stencilCompare(): int64
        set stencilCompare(value: int64)
        
        /** The stencil reference value (0-255). Typically a power of 2. */
        get stencilReference(): int64
        set stencilReference(value: int64)
        
        /** The primary color of the stencil effect. */
        get stencilColor(): Color
        set stencilColor(value: Color)
        
        /** The outline thickness for [constant STENCIL_MODE_OUTLINE]. */
        get stencilOutlineThickness(): float64
        set stencilOutlineThickness(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBaseMaterial3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBaseMaterial3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBitmap extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBitmap extends __NameMapResource {
        create_from_image_alpha: "createFromImageAlpha";
        set_bitv: "setBitv";
        set_bit: "setBit";
        get_bitv: "getBitv";
        get_bit: "getBit";
        set_bit_rect: "setBitRect";
        get_true_bit_count: "getTrueBitCount";
        get_size: "getSize";
        grow_mask: "growMask";
        convert_to_image: "convertToImage";
        opaque_to_polygons: "opaqueToPolygons";
    }
    class Bitmap extends Resource {
        constructor(identifier?: any)
        create(size: Vector2I): void
        createFromImageAlpha(image: Image, threshold?: float64 /* = 0.1 */): void
        setBitv(position: Vector2I, bit: boolean): void
        setBit(x: int64, y: int64, bit: boolean): void
        getBitv(position: Vector2I): boolean
        getBit(x: int64, y: int64): boolean
        setBitRect(rect: Rect2I, bit: boolean): void
        getTrueBitCount(): int64
        getSize(): Vector2I
        resize(newSize: Vector2I): void
        growMask(pixels: int64, rect: Rect2I): void
        convertToImage(): null | Image
        opaqueToPolygons(rect: Rect2I, epsilon?: float64 /* = 2 */): GArray<PackedVector2Array>
        get data(): GDictionary
        set data(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBitmap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBitmap;
    }
    namespace BlitMaterial {
        enum BlendMode {
            BlendModeMix = 0,
            BlendModeAdd = 1,
            BlendModeSub = 2,
            BlendModeMul = 3,
            BlendModeDisabled = 4,
            BlendModePremultipliedAlpha = 5,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBlitMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBlitMaterial extends __NameMapMaterial {
        blend_mode: "blendMode";
    }
    /** A material that processes blit calls to a DrawableTexture.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_blitmaterial.html  
     */
    class BlitMaterial extends Material {
        constructor(identifier?: any)
        /** The manner in which the newly blitted texture is blended with the original DrawableTexture. */
        get blendMode(): int64
        set blendMode(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBlitMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBlitMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBone2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBone2D extends __NameMapNode2D {
        apply_rest: "applyRest";
        get_skeleton_rest: "getSkeletonRest";
        get_index_in_skeleton: "getIndexInSkeleton";
        set_autocalculate_length_and_angle: "setAutocalculateLengthAndAngle";
        get_autocalculate_length_and_angle: "getAutocalculateLengthAndAngle";
        set_length: "setLength";
        get_length: "getLength";
        set_bone_angle: "setBoneAngle";
        get_bone_angle: "getBoneAngle";
    }
    /** A joint used with [Skeleton2D] to control and animate other nodes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_bone2d.html  
     */
    class Bone2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Resets the bone to the rest pose. This is equivalent to setting [member Node2D.transform] to [member rest]. */
        applyRest(): void
        
        /** Returns the node's [member rest] [Transform2D] if it doesn't have a parent, or its rest pose relative to its parent. */
        getSkeletonRest(): Transform2D
        
        /** Returns the node's index as part of the entire skeleton. See [Skeleton2D]. */
        getIndexInSkeleton(): int64
        
        /** When set to `true`, the [Bone2D] node will attempt to automatically calculate the bone angle and length using the first child [Bone2D] node, if one exists. If none exist, the [Bone2D] cannot automatically calculate these values and will print a warning. */
        setAutocalculateLengthAndAngle(autoCalculate: boolean): void
        
        /** Returns whether this [Bone2D] is going to autocalculate its length and bone angle using its first [Bone2D] child node, if one exists. If there are no [Bone2D] children, then it cannot autocalculate these values and will print a warning. */
        getAutocalculateLengthAndAngle(): boolean
        
        /** Sets the length of the bone in the [Bone2D]. */
        setLength(length: float64): void
        
        /** Returns the length of the bone in the [Bone2D] node. */
        getLength(): float64
        
        /** Sets the bone angle for the [Bone2D]. This is typically set to the rotation from the [Bone2D] to a child [Bone2D] node.  
         *      
         *  **Note:** This is different from the [Bone2D]'s rotation. The bone's angle is the rotation of the bone shown by the gizmo, which is unaffected by the [Bone2D]'s [member Node2D.transform].  
         */
        setBoneAngle(angle: float64): void
        
        /** Returns the angle of the bone in the [Bone2D].  
         *      
         *  **Note:** This is different from the [Bone2D]'s rotation. The bone's angle is the rotation of the bone shown by the gizmo, which is unaffected by the [Bone2D]'s [member Node2D.transform].  
         */
        getBoneAngle(): float64
        
        /** Rest transform of the bone. You can reset the node's transforms to this value using [method apply_rest]. */
        get rest(): Transform2D
        set rest(value: Transform2D)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBone2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBone2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoneAttachment3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoneAttachment3D extends __NameMapNode3D {
        get_skeleton: "getSkeleton";
        on_skeleton_update: "onSkeletonUpdate";
        bone_name: "boneName";
        bone_idx: "boneIdx";
        override_pose: "overridePose";
        use_external_skeleton: "useExternalSkeleton";
        external_skeleton: "externalSkeleton";
    }
    /** А node that dynamically copies or overrides the 3D transform of a bone in its parent [Skeleton3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_boneattachment3d.html  
     */
    class BoneAttachment3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns the parent or external [Skeleton3D] node if it exists, otherwise returns `null`. */
        getSkeleton(): null | Skeleton3D
        
        /** A function that is called automatically when the [Skeleton3D] is updated. This function is where the [BoneAttachment3D] node updates its position so it is correctly bound when it is  *not*  set to override the bone pose. */
        onSkeletonUpdate(): void
        
        /** The name of the attached bone. */
        get boneName(): StringName
        set boneName(value: StringName)
        
        /** The index of the attached bone. */
        get boneIdx(): int64
        set boneIdx(value: int64)
        
        /** Whether the [BoneAttachment3D] node will override the bone pose of the bone it is attached to. When set to `true`, the [BoneAttachment3D] node can change the pose of the bone. When set to `false`, the [BoneAttachment3D] will always be set to the bone's transform.  
         *      
         *  **Note:** This override performs interruptively in the skeleton update process using signals due to the old design. It may cause unintended behavior when used at the same time with [SkeletonModifier3D].  
         */
        get overridePose(): boolean
        set overridePose(value: boolean)
        
        /** Whether the [BoneAttachment3D] node will use an external [Skeleton3D] node rather than attempting to use its parent node as the [Skeleton3D]. When set to `true`, the [BoneAttachment3D] node will use the external [Skeleton3D] node set in [member external_skeleton]. */
        get useExternalSkeleton(): boolean
        set useExternalSkeleton(value: boolean)
        
        /** The [NodePath] to the external [Skeleton3D] node. */
        get externalSkeleton(): NodePath
        set externalSkeleton(value: NodePath | string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoneAttachment3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoneAttachment3D;
    }
    namespace BoneConstraint3D {
        enum ReferenceType {
            ReferenceTypeBone = 0,
            ReferenceTypeNode = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoneConstraint3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoneConstraint3D extends __NameMapSkeletonModifier3D {
        set_amount: "setAmount";
        get_amount: "getAmount";
        set_apply_bone_name: "setApplyBoneName";
        get_apply_bone_name: "getApplyBoneName";
        set_apply_bone: "setApplyBone";
        get_apply_bone: "getApplyBone";
        set_reference_type: "setReferenceType";
        get_reference_type: "getReferenceType";
        set_reference_bone_name: "setReferenceBoneName";
        get_reference_bone_name: "getReferenceBoneName";
        set_reference_bone: "setReferenceBone";
        get_reference_bone: "getReferenceBone";
        set_reference_node: "setReferenceNode";
        get_reference_node: "getReferenceNode";
        set_setting_count: "setSettingCount";
        get_setting_count: "getSettingCount";
        clear_setting: "clearSetting";
    }
    /** A node that may modify Skeleton3D's bone with associating the two bones.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_boneconstraint3d.html  
     */
    class BoneConstraint3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Sets the apply amount of the setting at [param index] to [param amount]. */
        setAmount(index: int64, amount: float64): void
        
        /** Returns the apply amount of the setting at [param index]. */
        getAmount(index: int64): float64
        
        /** Sets the apply bone of the setting at [param index] to [param bone_name]. This bone will be modified. */
        setApplyBoneName(index: int64, boneName: string): void
        
        /** Returns the apply bone name of the setting at [param index]. This bone will be modified. */
        getApplyBoneName(index: int64): string
        
        /** Sets the apply bone of the setting at [param index] to [param bone]. This bone will be modified. */
        setApplyBone(index: int64, bone: int64): void
        
        /** Returns the apply bone of the setting at [param index]. This bone will be modified. */
        getApplyBone(index: int64): int64
        
        /** Sets the reference target type of the setting at [param index] to [param type]. See also [enum ReferenceType]. */
        setReferenceType(index: int64, type: BoneConstraint3D.ReferenceType): void
        
        /** Returns the reference target type of the setting at [param index]. See also [enum ReferenceType]. */
        getReferenceType(index: int64): BoneConstraint3D.ReferenceType
        
        /** Sets the reference bone of the setting at [param index] to [param bone_name].  
         *  This bone will only be referenced and not modified by this modifier.  
         */
        setReferenceBoneName(index: int64, boneName: string): void
        
        /** Returns the reference bone name of the setting at [param index].  
         *  This bone will be only referenced and not modified by this modifier.  
         */
        getReferenceBoneName(index: int64): string
        
        /** Sets the reference bone of the setting at [param index] to [param bone].  
         *  This bone will only be referenced and not modified by this modifier.  
         */
        setReferenceBone(index: int64, bone: int64): void
        
        /** Returns the reference bone of the setting at [param index].  
         *  This bone will be only referenced and not modified by this modifier.  
         */
        getReferenceBone(index: int64): int64
        
        /** Sets the reference node path of the setting at [param index] to [param node].  
         *  This node will only be referenced and not modified by this modifier.  
         */
        setReferenceNode(index: int64, node: NodePath | string): void
        
        /** Returns the reference node path of the setting at [param index].  
         *  This node will only be referenced and not modified by this modifier.  
         */
        getReferenceNode(index: int64): NodePath
        
        /** Sets the number of settings in the modifier. */
        setSettingCount(count: int64): void
        
        /** Returns the number of settings in the modifier. */
        getSettingCount(): int64
        
        /** Clear all settings. */
        clearSetting(): void
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoneConstraint3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoneConstraint3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoneMap extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoneMap extends __NameMapResource {
        get_skeleton_bone_name: "getSkeletonBoneName";
        set_skeleton_bone_name: "setSkeletonBoneName";
        find_profile_bone_name: "findProfileBoneName";
        bone_map_updated: "boneMapUpdated";
        profile_updated: "profileUpdated";
    }
    /** Describes a mapping of bone names for retargeting [Skeleton3D] into common names defined by a [SkeletonProfile].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_bonemap.html  
     */
    class BoneMap extends Resource {
        constructor(identifier?: any)
        /** Returns a skeleton bone name is mapped to [param profile_bone_name].  
         *  In the retargeting process, the returned bone name is the bone name of the source skeleton.  
         */
        getSkeletonBoneName(profileBoneName: StringName): StringName
        
        /** Maps a skeleton bone name to [param profile_bone_name].  
         *  In the retargeting process, the setting bone name is the bone name of the source skeleton.  
         */
        setSkeletonBoneName(profileBoneName: StringName, skeletonBoneName: StringName): void
        
        /** Returns a profile bone name having [param skeleton_bone_name]. If not found, an empty [StringName] will be returned.  
         *  In the retargeting process, the returned bone name is the bone name of the target skeleton.  
         */
        findProfileBoneName(skeletonBoneName: StringName): StringName
        
        /** A [SkeletonProfile] of the mapping target. Key names in the [BoneMap] are synchronized with it. */
        get profile(): null | SkeletonProfile
        set profile(value: null | SkeletonProfile)
        
        /** This signal is emitted when change the key value in the [BoneMap]. This is used to validate mapping and to update [BoneMap] editor. */
        readonly boneMapUpdated: Signal<() => void>
        
        /** This signal is emitted when change the value in profile or change the reference of profile. This is used to update key names in the [BoneMap] and to redraw the [BoneMap] editor. */
        readonly profileUpdated: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoneMap;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoneMap;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoneSpaceAdjuster3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoneSpaceAdjuster3D extends __NameMapSkeletonModifier3D {
        set_bone_name: "setBoneName";
        get_bone_name: "getBoneName";
        set_bone: "setBone";
        get_bone: "getBone";
        set_use_bone_skin_scale: "setUseBoneSkinScale";
        is_using_bone_skin_scale: "isUsingBoneSkinScale";
        set_bone_scale: "setBoneScale";
        get_bone_scale: "getBoneScale";
        clear_setting: "clearSetting";
        use_bone_skin_scale_for_all_bones: "useBoneSkinScaleForAllBones";
        setting_size: "settingSize";
    }
    /** Inputs a scale and converts it to the position of a child bone.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_bonespaceadjuster3d.html  
     */
    class BoneSpaceAdjuster3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Sets the scaled bone name of the setting at [param index]. */
        setBoneName(index: int64, boneName: StringName): void
        
        /** Returns the scaled bone name of the setting at [param index]. */
        getBoneName(index: int64): StringName
        
        /** Sets the scaled bone of the setting at [param index]. */
        setBone(index: int64, bone: int64): void
        
        /** Returns the scaled bone of the setting at [param index]. */
        getBone(index: int64): int64
        
        /** Sets whether to use the `skin_scale` property of a [Skeleton3D]'s bone of the setting at [param index]. */
        setUseBoneSkinScale(index: int64, enabled: boolean): void
        
        /** Returns whether to use the `skin_scale` property of a [Skeleton3D]'s bone of the setting at [param index]. */
        isUsingBoneSkinScale(index: int64): boolean
        
        /** When [method is_using_bone_skin_scale] returns `false`, sets the scale of the setting at [param index].  
         *      
         *  **Note:** The [param scale] value is recommended to be non-zero.  
         */
        setBoneScale(index: int64, scale: Vector3): void
        
        /** Returns the scale of the setting at [param index]. */
        getBoneScale(index: int64): Vector3
        
        /** Clears all settings. */
        clearSetting(): void
        
        /** If `true`, this modifier processes all bones for which [method Skeleton3D.get_bone_skin_scale] is not `Vector3(1, 1, 1)`.  
         *  If `false`, this modifier allows you to configure whether to process bone skin scaling individually in the settings.  
         */
        get useBoneSkinScaleForAllBones(): boolean
        set useBoneSkinScaleForAllBones(value: boolean)
        
        /** The number of settings in the modifier. */
        get settingSize(): int64
        set settingSize(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoneSpaceAdjuster3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoneSpaceAdjuster3D;
    }
    namespace BoneTwistDisperser3D {
        enum DisperseMode {
            DisperseModeEven = 0,
            DisperseModeWeighted = 1,
            DisperseModeCustom = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoneTwistDisperser3D extends __RPCMapSkeletonModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoneTwistDisperser3D extends __NameMapSkeletonModifier3D {
        clear_settings: "clearSettings";
        set_root_bone_name: "setRootBoneName";
        get_root_bone_name: "getRootBoneName";
        set_root_bone: "setRootBone";
        get_root_bone: "getRootBone";
        set_end_bone_name: "setEndBoneName";
        get_end_bone_name: "getEndBoneName";
        set_end_bone: "setEndBone";
        get_end_bone: "getEndBone";
        get_reference_bone_name: "getReferenceBoneName";
        get_reference_bone: "getReferenceBone";
        set_extend_end_bone: "setExtendEndBone";
        is_end_bone_extended: "isEndBoneExtended";
        set_end_bone_direction: "setEndBoneDirection";
        get_end_bone_direction: "getEndBoneDirection";
        set_twist_from_rest: "setTwistFromRest";
        is_twist_from_rest: "isTwistFromRest";
        set_twist_from: "setTwistFrom";
        get_twist_from: "getTwistFrom";
        set_disperse_mode: "setDisperseMode";
        get_disperse_mode: "getDisperseMode";
        set_weight_position: "setWeightPosition";
        get_weight_position: "getWeightPosition";
        set_damping_curve: "setDampingCurve";
        get_damping_curve: "getDampingCurve";
        get_joint_bone_name: "getJointBoneName";
        get_joint_bone: "getJointBone";
        get_joint_twist_amount: "getJointTwistAmount";
        set_joint_twist_amount: "setJointTwistAmount";
        get_joint_count: "getJointCount";
        mutable_bone_axes: "mutableBoneAxes";
        setting_count: "settingCount";
    }
    /** A node that propagates and disperses the child bone's twist to the parent bones.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_bonetwistdisperser3d.html  
     */
    class BoneTwistDisperser3D<Map extends NodePathMap = any> extends SkeletonModifier3D<Map> {
        constructor(identifier?: any)
        /** Clears all settings. */
        clearSettings(): void
        
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
         *  **Note:** The end bone must be a child of the root bone.  
         */
        setEndBoneName(index: int64, boneName: string): void
        
        /** Returns the end bone name of the bone chain. */
        getEndBoneName(index: int64): string
        
        /** Sets the end bone index of the bone chain. */
        setEndBone(index: int64, bone: int64): void
        
        /** Returns the end bone index of the bone chain. */
        getEndBone(index: int64): int64
        
        /** Returns the reference bone name to extract twist of the setting at [param index].  
         *  This bone is either the end of the chain or its parent, depending on [method is_end_bone_extended].  
         */
        getReferenceBoneName(index: int64): string
        
        /** Returns the reference bone to extract twist of the setting at [param index].  
         *  This bone is either the end of the chain or its parent, depending on [method is_end_bone_extended].  
         */
        getReferenceBone(index: int64): int64
        
        /** If [param enabled] is `true`, the end bone is extended to have a tail.  
         *  If [param enabled] is `false`, [method get_reference_bone] becomes a parent of the end bone and it uses the vector to the end bone as a twist axis.  
         */
        setExtendEndBone(index: int64, enabled: boolean): void
        
        /** Returns `true` if the end bone is extended to have a tail. */
        isEndBoneExtended(index: int64): boolean
        
        /** Sets the end bone tail direction of the bone chain when [method is_end_bone_extended] is `true`. */
        setEndBoneDirection(index: int64, boneDirection: SkeletonModifier3D.BoneDirection): void
        
        /** Returns the tail direction of the end bone of the bone chain when [method is_end_bone_extended] is `true`. */
        getEndBoneDirection(index: int64): SkeletonModifier3D.BoneDirection
        
        /** If [param enabled] is `true`, it extracts the twist amount from the difference between the bone rest and the current bone pose.  
         *  If [param enabled] is `false`, it extracts the twist amount from the difference between [method get_twist_from] and the current bone pose. See also [method set_twist_from].  
         */
        setTwistFromRest(index: int64, enabled: boolean): void
        
        /** Returns `true` if extracting the twist amount from the difference between the bone rest and the current bone pose. */
        isTwistFromRest(index: int64): boolean
        
        /** Sets the rotation to an arbitrary state before twisting for the current bone pose to extract the twist when [method is_twist_from_rest] is `false`.  
         *  In other words, by calling [method set_twist_from] by [signal SkeletonModifier3D.modification_processed] of a specific [SkeletonModifier3D], you can extract only the twists generated by modifiers processed after that but before this [BoneTwistDisperser3D].  
         */
        setTwistFrom(index: int64, from: Quaternion): void
        
        /** Returns the rotation to an arbitrary state before twisting for the current bone pose to extract the twist when [method is_twist_from_rest] is `false`. */
        getTwistFrom(index: int64): Quaternion
        
        /** Sets whether to use automatic amount assignment or to allow manual assignment. */
        setDisperseMode(index: int64, disperseMode: BoneTwistDisperser3D.DisperseMode): void
        
        /** Returns whether to use automatic amount assignment or to allow manual assignment. */
        getDisperseMode(index: int64): BoneTwistDisperser3D.DisperseMode
        
        /** Sets the position at which to divide the segment between joints for weight assignment when [method get_disperse_mode] is [constant DISPERSE_MODE_WEIGHTED].  
         *  For example, when [param weight_position] is `0.5`, if two bone segments with a length of `1.0` exist between three joints, weights are assigned to each joint from root to end at ratios of `0.5`, `1.0`, and `0.5`. Then amounts become `0.25`, `0.75`, and `1.0` respectively.  
         */
        setWeightPosition(index: int64, weightPosition: float64): void
        
        /** Returns the position at which to divide the segment between joints for weight assignment when [method get_disperse_mode] is [constant DISPERSE_MODE_WEIGHTED]. */
        getWeightPosition(index: int64): float64
        
        /** Sets the damping curve when [method get_disperse_mode] is [constant DISPERSE_MODE_CUSTOM]. */
        setDampingCurve(index: int64, curve: Curve): void
        
        /** Returns the damping curve when [method get_disperse_mode] is [constant DISPERSE_MODE_CUSTOM]. */
        getDampingCurve(index: int64): null | Curve
        
        /** Returns the bone name at [param joint] in the bone chain's joint list. */
        getJointBoneName(index: int64, joint: int64): string
        
        /** Returns the bone index at [param joint] in the bone chain's joint list. */
        getJointBone(index: int64, joint: int64): int64
        
        /** Returns the twist amount at [param joint] in the bone chain's joint list when [method get_disperse_mode] is [constant DISPERSE_MODE_CUSTOM]. */
        getJointTwistAmount(index: int64, joint: int64): float64
        
        /** Sets the twist amount at [param joint] in the bone chain's joint list when [method get_disperse_mode] is [constant DISPERSE_MODE_CUSTOM]. */
        setJointTwistAmount(index: int64, joint: int64, twistAmount: float64): void
        
        /** Returns the joint count of the bone chain's joint list. */
        getJointCount(index: int64): int64
        
        /** If `true`, the solver retrieves the bone axis from the bone pose every frame.  
         *  If `false`, the solver retrieves the bone axis from the bone rest and caches it.  
         */
        get mutableBoneAxes(): boolean
        set mutableBoneAxes(value: boolean)
        
        /** The number of settings. */
        get settingCount(): int64
        set settingCount(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoneTwistDisperser3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoneTwistDisperser3D;
    }
    namespace BoxContainer {
        enum AlignmentMode {
            AlignmentBegin = 0,
            AlignmentCenter = 1,
            AlignmentEnd = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoxContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoxContainer extends __NameMapContainer {
        add_spacer: "addSpacer";
        reverse_sort: "reverseSort";
    }
    /** A container that arranges its child controls horizontally or vertically.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_boxcontainer.html  
     */
    class BoxContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** Adds a [Control] node to the box as a spacer. If [param begin] is `true`, it will insert the [Control] node in front of all other children. */
        addSpacer(begin: boolean): null | Control
        
        /** The alignment of the container's children (must be one of [constant ALIGNMENT_BEGIN], [constant ALIGNMENT_CENTER], or [constant ALIGNMENT_END]). */
        get alignment(): int64
        set alignment(value: int64)
        
        /** If `true`, the [BoxContainer] will arrange its children vertically, rather than horizontally.  
         *  Can't be changed when using [HBoxContainer] and [VBoxContainer].  
         */
        get vertical(): boolean
        set vertical(value: boolean)
        
        /** If `true`, the [BoxContainer] will arrange its children in reverse order. */
        get reverseSort(): boolean
        set reverseSort(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoxContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoxContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoxMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoxMesh extends __NameMapPrimitiveMesh {
        subdivide_width: "subdivideWidth";
        subdivide_height: "subdivideHeight";
        subdivide_depth: "subdivideDepth";
    }
    /** Generate an axis-aligned box [PrimitiveMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_boxmesh.html  
     */
    class BoxMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** The box's width, height and depth. */
        get size(): Vector3
        set size(value: Vector3)
        
        /** Number of extra edge loops inserted along the X axis. */
        get subdivideWidth(): int64
        set subdivideWidth(value: int64)
        
        /** Number of extra edge loops inserted along the Y axis. */
        get subdivideHeight(): int64
        set subdivideHeight(value: int64)
        
        /** Number of extra edge loops inserted along the Z axis. */
        get subdivideDepth(): int64
        set subdivideDepth(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoxMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoxMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoxOccluder3D extends __RPCMapOccluder3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoxOccluder3D extends __NameMapOccluder3D {
    }
    /** Cuboid shape for use with occlusion culling in [OccluderInstance3D].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_boxoccluder3d.html  
     */
    class BoxOccluder3D extends Occluder3D {
        constructor(identifier?: any)
        /** The box's size in 3D units. */
        get size(): Vector3
        set size(value: Vector3)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoxOccluder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoxOccluder3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapBoxShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapBoxShape3D extends __NameMapShape3D {
    }
    /** A 3D box shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_boxshape3d.html  
     */
    class BoxShape3D extends Shape3D {
        constructor(identifier?: any)
        /** The box's width, height and depth. */
        get size(): Vector3
        set size(value: Vector3)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapBoxShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapBoxShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapButton extends __RPCMapBaseButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapButton extends __NameMapBaseButton {
        text_overrun_behavior: "textOverrunBehavior";
        autowrap_mode: "autowrapMode";
        autowrap_trim_flags: "autowrapTrimFlags";
        clip_text: "clipText";
        icon_alignment: "iconAlignment";
        vertical_icon_alignment: "verticalIconAlignment";
        expand_icon: "expandIcon";
        text_direction: "textDirection";
    }
    /** A themed button that can contain text and an icon.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_button.html  
     */
    class Button<Map extends NodePathMap = any> extends BaseButton<Map> {
        constructor(identifier?: any)
        /** The button's text that will be displayed inside the button's area. */
        get text(): string
        set text(value: string)
        
        /** Button's icon, if text is present the icon will be placed before the text.  
         *  To edit margin and spacing of the icon, use [theme_item h_separation] theme property and `content_margin_*` properties of the used [StyleBox]es.  
         */
        get icon(): null | Texture2D
        set icon(value: null | Texture2D)
        
        /** Flat buttons don't display decoration. */
        get flat(): boolean
        set flat(value: boolean)
        
        /** Text alignment policy for the button's text. */
        get alignment(): int64
        set alignment(value: int64)
        
        /** Sets the clipping behavior when the text exceeds the node's bounding rectangle. */
        get textOverrunBehavior(): int64
        set textOverrunBehavior(value: int64)
        
        /** If set to something other than [constant TextServer.AUTOWRAP_OFF], the text gets wrapped inside the node's bounding rectangle. */
        get autowrapMode(): int64
        set autowrapMode(value: int64)
        
        /** Autowrap space trimming flags. See [constant TextServer.BREAK_TRIM_START_EDGE_SPACES] and [constant TextServer.BREAK_TRIM_END_EDGE_SPACES] for more info. */
        get autowrapTrimFlags(): int64
        set autowrapTrimFlags(value: int64)
        
        /** If `true`, text that is too large to fit the button is clipped horizontally. If `false`, the button will always be wide enough to hold the text. The text is not vertically clipped, and the button's height is not affected by this property. */
        get clipText(): boolean
        set clipText(value: boolean)
        
        /** Specifies if the icon should be aligned horizontally to the left, right, or center of a button. Uses the same [enum HorizontalAlignment] constants as the text alignment. If centered horizontally and vertically, text will draw on top of the icon. */
        get iconAlignment(): int64
        set iconAlignment(value: int64)
        
        /** Specifies if the icon should be aligned vertically to the top, bottom, or center of a button. Uses the same [enum VerticalAlignment] constants as the text alignment. If centered horizontally and vertically, text will draw on top of the icon. */
        get verticalIconAlignment(): int64
        set verticalIconAlignment(value: int64)
        
        /** When enabled, the button's icon will expand/shrink to fit the button's size while keeping its aspect. See also [theme_item icon_max_width]. */
        get expandIcon(): boolean
        set expandIcon(value: boolean)
        
        /** Base text writing direction. */
        get textDirection(): int64
        set textDirection(value: int64)
        
        /** Language code used for line-breaking and text shaping algorithms. If left empty, the current locale is used instead. */
        get language(): string
        set language(value: string)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapButton;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapButtonGroup extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapButtonGroup extends __NameMapResource {
        get_pressed_button: "getPressedButton";
        get_buttons: "getButtons";
        allow_unpress: "allowUnpress";
    }
    /** A group of buttons that doesn't allow more than one button to be pressed at a time.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_buttongroup.html  
     */
    class ButtonGroup extends Resource {
        constructor(identifier?: any)
        /** Returns the current pressed button. */
        getPressedButton(): null | BaseButton
        
        /** Returns an [Array] of [Button]s who have this as their [ButtonGroup] (see [member BaseButton.button_group]). */
        getButtons(): GArray<BaseButton>
        
        /** If `true`, it is possible to unpress all buttons in this [ButtonGroup]. */
        get allowUnpress(): boolean
        set allowUnpress(value: boolean)
        
        /** Emitted when one of the buttons of the group is pressed. */
        readonly pressed: Signal<(button: BaseButton) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapButtonGroup;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapButtonGroup;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCcdik3D extends __RPCMapIterateIK3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCcdik3D extends __NameMapIterateIK3D {
    }
    class Ccdik3D<Map extends NodePathMap = any> extends IterateIK3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCcdik3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCcdik3D;
    }
    namespace CpuParticles2D {
        enum DrawOrder {
            DrawOrderIndex = 0,
            DrawOrderLifetime = 1,
        }
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
            ParamMax = 12,
        }
        enum ParticleFlags {
            ParticleFlagAlignYToVelocity = 0,
            ParticleFlagRotateY = 1,
            ParticleFlagDisableZ = 2,
            ParticleFlagMax = 3,
        }
        enum EmissionShape {
            EmissionShapePoint = 0,
            EmissionShapeSphere = 1,
            EmissionShapeSphereSurface = 2,
            EmissionShapeRectangle = 3,
            EmissionShapePoints = 4,
            EmissionShapeDirectedPoints = 5,
            EmissionShapeRing = 6,
            EmissionShapeMax = 7,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCpuParticles2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCpuParticles2D extends __NameMapNode2D {
        request_particles_process: "requestParticlesProcess";
        set_param_min: "setParamMin";
        get_param_min: "getParamMin";
        set_param_max: "setParamMax";
        get_param_max: "getParamMax";
        set_param_curve: "setParamCurve";
        get_param_curve: "getParamCurve";
        set_particle_flag: "setParticleFlag";
        get_particle_flag: "getParticleFlag";
        convert_from_particles: "convertFromParticles";
        one_shot: "oneShot";
        speed_scale: "speedScale";
        use_fixed_seed: "useFixedSeed";
        lifetime_randomness: "lifetimeRandomness";
        fixed_fps: "fixedFps";
        fract_delta: "fractDelta";
        local_coords: "localCoords";
        draw_order: "drawOrder";
        emission_shape: "emissionShape";
        emission_sphere_radius: "emissionSphereRadius";
        emission_rect_extents: "emissionRectExtents";
        emission_points: "emissionPoints";
        emission_normals: "emissionNormals";
        emission_colors: "emissionColors";
        emission_ring_inner_radius: "emissionRingInnerRadius";
        emission_ring_radius: "emissionRingRadius";
        particle_flag_align_y: "particleFlagAlignY";
        initial_velocity_min: "initialVelocityMin";
        initial_velocity_max: "initialVelocityMax";
        angular_velocity_min: "angularVelocityMin";
        angular_velocity_max: "angularVelocityMax";
        angular_velocity_curve: "angularVelocityCurve";
        orbit_velocity_min: "orbitVelocityMin";
        orbit_velocity_max: "orbitVelocityMax";
        orbit_velocity_curve: "orbitVelocityCurve";
        linear_accel_min: "linearAccelMin";
        linear_accel_max: "linearAccelMax";
        linear_accel_curve: "linearAccelCurve";
        radial_accel_min: "radialAccelMin";
        radial_accel_max: "radialAccelMax";
        radial_accel_curve: "radialAccelCurve";
        tangential_accel_min: "tangentialAccelMin";
        tangential_accel_max: "tangentialAccelMax";
        tangential_accel_curve: "tangentialAccelCurve";
        damping_min: "dampingMin";
        damping_max: "dampingMax";
        damping_curve: "dampingCurve";
        angle_min: "angleMin";
        angle_max: "angleMax";
        angle_curve: "angleCurve";
        scale_amount_min: "scaleAmountMin";
        scale_amount_max: "scaleAmountMax";
        scale_amount_curve: "scaleAmountCurve";
        split_scale: "splitScale";
        scale_curve_x: "scaleCurveX";
        scale_curve_y: "scaleCurveY";
        color_ramp: "colorRamp";
        color_initial_ramp: "colorInitialRamp";
        hue_variation_min: "hueVariationMin";
        hue_variation_max: "hueVariationMax";
        hue_variation_curve: "hueVariationCurve";
        anim_speed_min: "animSpeedMin";
        anim_speed_max: "animSpeedMax";
        anim_speed_curve: "animSpeedCurve";
        anim_offset_min: "animOffsetMin";
        anim_offset_max: "animOffsetMax";
        anim_offset_curve: "animOffsetCurve";
    }
    class CpuParticles2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        requestParticlesProcess(processTime: float64, processTimeResidual?: float64 /* = 0 */): void
        restart(keepSeed?: boolean /* = false */): void
        setParamMin(param: CpuParticles2D.Parameter, value: float64): void
        getParamMin(param: CpuParticles2D.Parameter): float64
        setParamMax(param: CpuParticles2D.Parameter, value: float64): void
        getParamMax(param: CpuParticles2D.Parameter): float64
        setParamCurve(param: CpuParticles2D.Parameter, curve: Curve): void
        getParamCurve(param: CpuParticles2D.Parameter): null | Curve
        setParticleFlag(particleFlag: CpuParticles2D.ParticleFlags, enable: boolean): void
        getParticleFlag(particleFlag: CpuParticles2D.ParticleFlags): boolean
        convertFromParticles(particles: Node): void
        get emitting(): boolean
        set emitting(value: boolean)
        get amount(): int64
        set amount(value: int64)
        get texture(): null | Texture2D
        set texture(value: null | Texture2D)
        get lifetime(): float64
        set lifetime(value: float64)
        get oneShot(): boolean
        set oneShot(value: boolean)
        get preprocess(): float64
        set preprocess(value: float64)
        get speedScale(): float64
        set speedScale(value: float64)
        get explosiveness(): float64
        set explosiveness(value: float64)
        get randomness(): float64
        set randomness(value: float64)
        get useFixedSeed(): boolean
        set useFixedSeed(value: boolean)
        get seed(): int64
        set seed(value: int64)
        get lifetimeRandomness(): float64
        set lifetimeRandomness(value: float64)
        get fixedFps(): int64
        set fixedFps(value: int64)
        get fractDelta(): boolean
        set fractDelta(value: boolean)
        get localCoords(): boolean
        set localCoords(value: boolean)
        get drawOrder(): int64
        set drawOrder(value: int64)
        get emissionShape(): int64
        set emissionShape(value: int64)
        get emissionSphereRadius(): float64
        set emissionSphereRadius(value: float64)
        get emissionRectExtents(): Vector2
        set emissionRectExtents(value: Vector2)
        get emissionPoints(): PackedVector2Array
        set emissionPoints(value: PackedVector2Array | Vector2[])
        get emissionNormals(): PackedVector2Array
        set emissionNormals(value: PackedVector2Array | Vector2[])
        get emissionColors(): PackedColorArray
        set emissionColors(value: PackedColorArray | Color[])
        get emissionRingInnerRadius(): float64
        set emissionRingInnerRadius(value: float64)
        get emissionRingRadius(): float64
        set emissionRingRadius(value: float64)
        get particleFlagAlignY(): boolean
        set particleFlagAlignY(value: boolean)
        get direction(): Vector2
        set direction(value: Vector2)
        get spread(): float64
        set spread(value: float64)
        get gravity(): Vector2
        set gravity(value: Vector2)
        get initialVelocityMin(): float64
        set initialVelocityMin(value: float64)
        get initialVelocityMax(): float64
        set initialVelocityMax(value: float64)
        get angularVelocityMin(): float64
        set angularVelocityMin(value: float64)
        get angularVelocityMax(): float64
        set angularVelocityMax(value: float64)
        get angularVelocityCurve(): null | Curve
        set angularVelocityCurve(value: null | Curve)
        get orbitVelocityMin(): float64
        set orbitVelocityMin(value: float64)
        get orbitVelocityMax(): float64
        set orbitVelocityMax(value: float64)
        get orbitVelocityCurve(): null | Curve
        set orbitVelocityCurve(value: null | Curve)
        get linearAccelMin(): float64
        set linearAccelMin(value: float64)
        get linearAccelMax(): float64
        set linearAccelMax(value: float64)
        get linearAccelCurve(): null | Curve
        set linearAccelCurve(value: null | Curve)
        get radialAccelMin(): float64
        set radialAccelMin(value: float64)
        get radialAccelMax(): float64
        set radialAccelMax(value: float64)
        get radialAccelCurve(): null | Curve
        set radialAccelCurve(value: null | Curve)
        get tangentialAccelMin(): float64
        set tangentialAccelMin(value: float64)
        get tangentialAccelMax(): float64
        set tangentialAccelMax(value: float64)
        get tangentialAccelCurve(): null | Curve
        set tangentialAccelCurve(value: null | Curve)
        get dampingMin(): float64
        set dampingMin(value: float64)
        get dampingMax(): float64
        set dampingMax(value: float64)
        get dampingCurve(): null | Curve
        set dampingCurve(value: null | Curve)
        get angleMin(): float64
        set angleMin(value: float64)
        get angleMax(): float64
        set angleMax(value: float64)
        get angleCurve(): null | Curve
        set angleCurve(value: null | Curve)
        get scaleAmountMin(): float64
        set scaleAmountMin(value: float64)
        get scaleAmountMax(): float64
        set scaleAmountMax(value: float64)
        get scaleAmountCurve(): null | Curve
        set scaleAmountCurve(value: null | Curve)
        get splitScale(): boolean
        set splitScale(value: boolean)
        get scaleCurveX(): null | Curve
        set scaleCurveX(value: null | Curve)
        get scaleCurveY(): null | Curve
        set scaleCurveY(value: null | Curve)
        get color(): Color
        set color(value: Color)
        get colorRamp(): null | Gradient
        set colorRamp(value: null | Gradient)
        get colorInitialRamp(): null | Gradient
        set colorInitialRamp(value: null | Gradient)
        get hueVariationMin(): float64
        set hueVariationMin(value: float64)
        get hueVariationMax(): float64
        set hueVariationMax(value: float64)
        get hueVariationCurve(): null | Curve
        set hueVariationCurve(value: null | Curve)
        get animSpeedMin(): float64
        set animSpeedMin(value: float64)
        get animSpeedMax(): float64
        set animSpeedMax(value: float64)
        get animSpeedCurve(): null | Curve
        set animSpeedCurve(value: null | Curve)
        get animOffsetMin(): float64
        set animOffsetMin(value: float64)
        get animOffsetMax(): float64
        set animOffsetMax(value: float64)
        get animOffsetCurve(): null | Curve
        set animOffsetCurve(value: null | Curve)
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCpuParticles2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCpuParticles2D;
    }
    namespace CpuParticles3D {
        enum DrawOrder {
            DrawOrderIndex = 0,
            DrawOrderLifetime = 1,
            DrawOrderViewDepth = 2,
        }
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
            ParamMax = 12,
        }
        enum ParticleFlags {
            ParticleFlagAlignYToVelocity = 0,
            ParticleFlagRotateY = 1,
            ParticleFlagDisableZ = 2,
            ParticleFlagMax = 3,
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
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCpuParticles3D extends __RPCMapGeometryInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCpuParticles3D extends __NameMapGeometryInstance3D {
        request_particles_process: "requestParticlesProcess";
        capture_aabb: "captureAabb";
        set_param_min: "setParamMin";
        get_param_min: "getParamMin";
        set_param_max: "setParamMax";
        get_param_max: "getParamMax";
        set_param_curve: "setParamCurve";
        get_param_curve: "getParamCurve";
        set_particle_flag: "setParticleFlag";
        get_particle_flag: "getParticleFlag";
        convert_from_particles: "convertFromParticles";
        one_shot: "oneShot";
        speed_scale: "speedScale";
        use_fixed_seed: "useFixedSeed";
        lifetime_randomness: "lifetimeRandomness";
        fixed_fps: "fixedFps";
        fract_delta: "fractDelta";
        visibility_aabb: "visibilityAabb";
        local_coords: "localCoords";
        draw_order: "drawOrder";
        emission_shape: "emissionShape";
        emission_sphere_radius: "emissionSphereRadius";
        emission_box_extents: "emissionBoxExtents";
        emission_points: "emissionPoints";
        emission_normals: "emissionNormals";
        emission_colors: "emissionColors";
        emission_ring_axis: "emissionRingAxis";
        emission_ring_height: "emissionRingHeight";
        emission_ring_radius: "emissionRingRadius";
        emission_ring_inner_radius: "emissionRingInnerRadius";
        emission_ring_cone_angle: "emissionRingConeAngle";
        particle_flag_align_y: "particleFlagAlignY";
        particle_flag_rotate_y: "particleFlagRotateY";
        particle_flag_disable_z: "particleFlagDisableZ";
        initial_velocity_min: "initialVelocityMin";
        initial_velocity_max: "initialVelocityMax";
        angular_velocity_min: "angularVelocityMin";
        angular_velocity_max: "angularVelocityMax";
        angular_velocity_curve: "angularVelocityCurve";
        orbit_velocity_min: "orbitVelocityMin";
        orbit_velocity_max: "orbitVelocityMax";
        orbit_velocity_curve: "orbitVelocityCurve";
        linear_accel_min: "linearAccelMin";
        linear_accel_max: "linearAccelMax";
        linear_accel_curve: "linearAccelCurve";
        radial_accel_min: "radialAccelMin";
        radial_accel_max: "radialAccelMax";
        radial_accel_curve: "radialAccelCurve";
        tangential_accel_min: "tangentialAccelMin";
        tangential_accel_max: "tangentialAccelMax";
        tangential_accel_curve: "tangentialAccelCurve";
        damping_min: "dampingMin";
        damping_max: "dampingMax";
        damping_curve: "dampingCurve";
        angle_min: "angleMin";
        angle_max: "angleMax";
        angle_curve: "angleCurve";
        scale_amount_min: "scaleAmountMin";
        scale_amount_max: "scaleAmountMax";
        scale_amount_curve: "scaleAmountCurve";
        split_scale: "splitScale";
        scale_curve_x: "scaleCurveX";
        scale_curve_y: "scaleCurveY";
        scale_curve_z: "scaleCurveZ";
        color_ramp: "colorRamp";
        color_initial_ramp: "colorInitialRamp";
        hue_variation_min: "hueVariationMin";
        hue_variation_max: "hueVariationMax";
        hue_variation_curve: "hueVariationCurve";
        anim_speed_min: "animSpeedMin";
        anim_speed_max: "animSpeedMax";
        anim_speed_curve: "animSpeedCurve";
        anim_offset_min: "animOffsetMin";
        anim_offset_max: "animOffsetMax";
        anim_offset_curve: "animOffsetCurve";
    }
    class CpuParticles3D<Map extends NodePathMap = any> extends GeometryInstance3D<Map> {
        constructor(identifier?: any)
        restart(keepSeed?: boolean /* = false */): void
        requestParticlesProcess(processTime: float64, processTimeResidual?: float64 /* = 0 */): void
        captureAabb(): Aabb
        setParamMin(param: CpuParticles3D.Parameter, value: float64): void
        getParamMin(param: CpuParticles3D.Parameter): float64
        setParamMax(param: CpuParticles3D.Parameter, value: float64): void
        getParamMax(param: CpuParticles3D.Parameter): float64
        setParamCurve(param: CpuParticles3D.Parameter, curve: Curve): void
        getParamCurve(param: CpuParticles3D.Parameter): null | Curve
        setParticleFlag(particleFlag: CpuParticles3D.ParticleFlags, enable: boolean): void
        getParticleFlag(particleFlag: CpuParticles3D.ParticleFlags): boolean
        convertFromParticles(particles: Node): void
        get emitting(): boolean
        set emitting(value: boolean)
        get amount(): int64
        set amount(value: int64)
        get lifetime(): float64
        set lifetime(value: float64)
        get oneShot(): boolean
        set oneShot(value: boolean)
        get preprocess(): float64
        set preprocess(value: float64)
        get speedScale(): float64
        set speedScale(value: float64)
        get explosiveness(): float64
        set explosiveness(value: float64)
        get randomness(): float64
        set randomness(value: float64)
        get useFixedSeed(): boolean
        set useFixedSeed(value: boolean)
        get seed(): int64
        set seed(value: int64)
        get lifetimeRandomness(): float64
        set lifetimeRandomness(value: float64)
        get fixedFps(): int64
        set fixedFps(value: int64)
        get fractDelta(): boolean
        set fractDelta(value: boolean)
        get visibilityAabb(): Aabb
        set visibilityAabb(value: Aabb)
        get localCoords(): boolean
        set localCoords(value: boolean)
        get drawOrder(): int64
        set drawOrder(value: int64)
        get mesh(): null | QuadMesh | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh
        set mesh(value: null | QuadMesh | BoxMesh | SphereMesh | CapsuleMesh | CylinderMesh | PrismMesh | TorusMesh | PlaneMesh | TextMesh | RibbonTrailMesh | TubeTrailMesh | PointMesh | ArrayMesh | ImmediateMesh | PlaceholderMesh | Mesh)
        get emissionShape(): int64
        set emissionShape(value: int64)
        get emissionSphereRadius(): float64
        set emissionSphereRadius(value: float64)
        get emissionBoxExtents(): Vector3
        set emissionBoxExtents(value: Vector3)
        get emissionPoints(): PackedVector3Array
        set emissionPoints(value: PackedVector3Array | Vector3[])
        get emissionNormals(): PackedVector3Array
        set emissionNormals(value: PackedVector3Array | Vector3[])
        get emissionColors(): PackedColorArray
        set emissionColors(value: PackedColorArray | Color[])
        get emissionRingAxis(): Vector3
        set emissionRingAxis(value: Vector3)
        get emissionRingHeight(): float64
        set emissionRingHeight(value: float64)
        get emissionRingRadius(): float64
        set emissionRingRadius(value: float64)
        get emissionRingInnerRadius(): float64
        set emissionRingInnerRadius(value: float64)
        get emissionRingConeAngle(): float64
        set emissionRingConeAngle(value: float64)
        get particleFlagAlignY(): boolean
        set particleFlagAlignY(value: boolean)
        get particleFlagRotateY(): boolean
        set particleFlagRotateY(value: boolean)
        get particleFlagDisableZ(): boolean
        set particleFlagDisableZ(value: boolean)
        get direction(): Vector3
        set direction(value: Vector3)
        get spread(): float64
        set spread(value: float64)
        get flatness(): float64
        set flatness(value: float64)
        get gravity(): Vector3
        set gravity(value: Vector3)
        get initialVelocityMin(): float64
        set initialVelocityMin(value: float64)
        get initialVelocityMax(): float64
        set initialVelocityMax(value: float64)
        get angularVelocityMin(): float64
        set angularVelocityMin(value: float64)
        get angularVelocityMax(): float64
        set angularVelocityMax(value: float64)
        get angularVelocityCurve(): null | Curve
        set angularVelocityCurve(value: null | Curve)
        get orbitVelocityMin(): float64
        set orbitVelocityMin(value: float64)
        get orbitVelocityMax(): float64
        set orbitVelocityMax(value: float64)
        get orbitVelocityCurve(): null | Curve
        set orbitVelocityCurve(value: null | Curve)
        get linearAccelMin(): float64
        set linearAccelMin(value: float64)
        get linearAccelMax(): float64
        set linearAccelMax(value: float64)
        get linearAccelCurve(): null | Curve
        set linearAccelCurve(value: null | Curve)
        get radialAccelMin(): float64
        set radialAccelMin(value: float64)
        get radialAccelMax(): float64
        set radialAccelMax(value: float64)
        get radialAccelCurve(): null | Curve
        set radialAccelCurve(value: null | Curve)
        get tangentialAccelMin(): float64
        set tangentialAccelMin(value: float64)
        get tangentialAccelMax(): float64
        set tangentialAccelMax(value: float64)
        get tangentialAccelCurve(): null | Curve
        set tangentialAccelCurve(value: null | Curve)
        get dampingMin(): float64
        set dampingMin(value: float64)
        get dampingMax(): float64
        set dampingMax(value: float64)
        get dampingCurve(): null | Curve
        set dampingCurve(value: null | Curve)
        get angleMin(): float64
        set angleMin(value: float64)
        get angleMax(): float64
        set angleMax(value: float64)
        get angleCurve(): null | Curve
        set angleCurve(value: null | Curve)
        get scaleAmountMin(): float64
        set scaleAmountMin(value: float64)
        get scaleAmountMax(): float64
        set scaleAmountMax(value: float64)
        get scaleAmountCurve(): null | Curve
        set scaleAmountCurve(value: null | Curve)
        get splitScale(): boolean
        set splitScale(value: boolean)
        get scaleCurveX(): null | Curve
        set scaleCurveX(value: null | Curve)
        get scaleCurveY(): null | Curve
        set scaleCurveY(value: null | Curve)
        get scaleCurveZ(): null | Curve
        set scaleCurveZ(value: null | Curve)
        get color(): Color
        set color(value: Color)
        get colorRamp(): null | Gradient
        set colorRamp(value: null | Gradient)
        get colorInitialRamp(): null | Gradient
        set colorInitialRamp(value: null | Gradient)
        get hueVariationMin(): float64
        set hueVariationMin(value: float64)
        get hueVariationMax(): float64
        set hueVariationMax(value: float64)
        get hueVariationCurve(): null | Curve
        set hueVariationCurve(value: null | Curve)
        get animSpeedMin(): float64
        set animSpeedMin(value: float64)
        get animSpeedMax(): float64
        set animSpeedMax(value: float64)
        get animSpeedCurve(): null | Curve
        set animSpeedCurve(value: null | Curve)
        get animOffsetMin(): float64
        set animOffsetMin(value: float64)
        get animOffsetMax(): float64
        set animOffsetMax(value: float64)
        get animOffsetCurve(): null | Curve
        set animOffsetCurve(value: null | Curve)
        readonly finished: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCpuParticles3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCpuParticles3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgBox3D extends __RPCMapCsgPrimitive3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgBox3D extends __NameMapCsgPrimitive3D {
    }
    class CsgBox3D<Map extends NodePathMap = any> extends CsgPrimitive3D<Map> {
        constructor(identifier?: any)
        get size(): Vector3
        set size(value: Vector3)
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgBox3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgBox3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgCombiner3D extends __RPCMapCsgShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgCombiner3D extends __NameMapCsgShape3D {
    }
    class CsgCombiner3D<Map extends NodePathMap = any> extends CsgShape3D<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgCombiner3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgCombiner3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgCylinder3D extends __RPCMapCsgPrimitive3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgCylinder3D extends __NameMapCsgPrimitive3D {
        smooth_faces: "smoothFaces";
    }
    class CsgCylinder3D<Map extends NodePathMap = any> extends CsgPrimitive3D<Map> {
        constructor(identifier?: any)
        get radius(): float64
        set radius(value: float64)
        get height(): float64
        set height(value: float64)
        get sides(): int64
        set sides(value: int64)
        get cone(): boolean
        set cone(value: boolean)
        get smoothFaces(): boolean
        set smoothFaces(value: boolean)
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgCylinder3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgCylinder3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgMesh3D extends __RPCMapCsgPrimitive3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgMesh3D extends __NameMapCsgPrimitive3D {
    }
    class CsgMesh3D<Map extends NodePathMap = any> extends CsgPrimitive3D<Map> {
        constructor(identifier?: any)
        get mesh(): null | Mesh | PlaneMesh | PointMesh | QuadMesh | RibbonTrailMesh
        set mesh(value: null | Mesh | PlaneMesh | PointMesh | QuadMesh | RibbonTrailMesh)
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgMesh3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgMesh3D;
    }
    namespace CsgPolygon3D {
        enum Mode {
            ModeDepth = 0,
            ModeSpin = 1,
            ModePath = 2,
        }
        enum PathRotation {
            PathRotationPolygon = 0,
            PathRotationPath = 1,
            PathRotationPathFollow = 2,
        }
        enum PathIntervalType {
            PathIntervalDistance = 0,
            PathIntervalSubdivide = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgPolygon3D extends __RPCMapCsgPrimitive3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgPolygon3D extends __NameMapCsgPrimitive3D {
        _is_editable_3d_polygon: "_isEditable3DPolygon";
        _has_editable_3d_polygon_no_depth: "_hasEditable3DPolygonNoDepth";
        spin_degrees: "spinDegrees";
        spin_sides: "spinSides";
        path_node: "pathNode";
        path_interval_type: "pathIntervalType";
        path_interval: "pathInterval";
        path_simplify_angle: "pathSimplifyAngle";
        path_rotation: "pathRotation";
        path_rotation_accurate: "pathRotationAccurate";
        path_local: "pathLocal";
        path_continuous_u: "pathContinuousU";
        path_u_distance: "pathUDistance";
        path_joined: "pathJoined";
        smooth_faces: "smoothFaces";
    }
    class CsgPolygon3D<Map extends NodePathMap = any> extends CsgPrimitive3D<Map> {
        constructor(identifier?: any)
        _isEditable3DPolygon(): boolean
        _hasEditable3DPolygonNoDepth(): boolean
        get polygon(): PackedVector2Array
        set polygon(value: PackedVector2Array | Vector2[])
        get mode(): int64
        set mode(value: int64)
        get depth(): float64
        set depth(value: float64)
        get spinDegrees(): float64
        set spinDegrees(value: float64)
        get spinSides(): int64
        set spinSides(value: int64)
        get pathNode(): NodePath
        set pathNode(value: NodePath | string)
        get pathIntervalType(): int64
        set pathIntervalType(value: int64)
        get pathInterval(): float64
        set pathInterval(value: float64)
        get pathSimplifyAngle(): float64
        set pathSimplifyAngle(value: float64)
        get pathRotation(): int64
        set pathRotation(value: int64)
        get pathRotationAccurate(): boolean
        set pathRotationAccurate(value: boolean)
        get pathLocal(): boolean
        set pathLocal(value: boolean)
        get pathContinuousU(): boolean
        set pathContinuousU(value: boolean)
        get pathUDistance(): float64
        set pathUDistance(value: float64)
        get pathJoined(): boolean
        set pathJoined(value: boolean)
        get smoothFaces(): boolean
        set smoothFaces(value: boolean)
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgPolygon3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgPolygon3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgPrimitive3D extends __RPCMapCsgShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgPrimitive3D extends __NameMapCsgShape3D {
        flip_faces: "flipFaces";
    }
    class CsgPrimitive3D<Map extends NodePathMap = any> extends CsgShape3D<Map> {
        constructor(identifier?: any)
        get flipFaces(): boolean
        set flipFaces(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgPrimitive3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgPrimitive3D;
    }
    namespace CsgShape3D {
        enum Operation {
            OperationUnion = 0,
            OperationIntersection = 1,
            OperationSubtraction = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgShape3D extends __RPCMapGeometryInstance3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgShape3D extends __NameMapGeometryInstance3D {
        is_root_shape: "isRootShape";
        _update_shape: "_updateShape";
        set_collision_mask_value: "setCollisionMaskValue";
        get_collision_mask_value: "getCollisionMaskValue";
        _get_root_collision_instance: "_getRootCollisionInstance";
        set_collision_layer_value: "setCollisionLayerValue";
        get_collision_layer_value: "getCollisionLayerValue";
        bake_collision_shape: "bakeCollisionShape";
        get_meshes: "getMeshes";
        bake_static_mesh: "bakeStaticMesh";
        smoothing_angle: "smoothingAngle";
        calculate_tangents: "calculateTangents";
        use_collision: "useCollision";
        collision_layer: "collisionLayer";
        collision_mask: "collisionMask";
        collision_priority: "collisionPriority";
    }
    class CsgShape3D<Map extends NodePathMap = any> extends GeometryInstance3D<Map> {
        constructor(identifier?: any)
        isRootShape(): boolean
        _updateShape(): void
        setCollisionMaskValue(layerNumber: int64, value: boolean): void
        getCollisionMaskValue(layerNumber: int64): boolean
        _getRootCollisionInstance(): Rid
        setCollisionLayerValue(layerNumber: int64, value: boolean): void
        getCollisionLayerValue(layerNumber: int64): boolean
        bakeCollisionShape(): null | ConcavePolygonShape3D
        getMeshes(): GArray
        bakeStaticMesh(): null | ArrayMesh
        get autosmooth(): boolean
        set autosmooth(value: boolean)
        get smoothingAngle(): float64
        set smoothingAngle(value: float64)
        get operation(): int64
        set operation(value: int64)
        get snap(): float64
        set snap(value: float64)
        get calculateTangents(): boolean
        set calculateTangents(value: boolean)
        get useCollision(): boolean
        set useCollision(value: boolean)
        get collisionLayer(): int64
        set collisionLayer(value: int64)
        get collisionMask(): int64
        set collisionMask(value: int64)
        get collisionPriority(): float64
        set collisionPriority(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgSphere3D extends __RPCMapCsgPrimitive3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgSphere3D extends __NameMapCsgPrimitive3D {
        radial_segments: "radialSegments";
        smooth_faces: "smoothFaces";
    }
    class CsgSphere3D<Map extends NodePathMap = any> extends CsgPrimitive3D<Map> {
        constructor(identifier?: any)
        get radius(): float64
        set radius(value: float64)
        get radialSegments(): int64
        set radialSegments(value: int64)
        get rings(): int64
        set rings(value: int64)
        get smoothFaces(): boolean
        set smoothFaces(value: boolean)
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgSphere3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgSphere3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCsgTorus3D extends __RPCMapCsgPrimitive3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCsgTorus3D extends __NameMapCsgPrimitive3D {
        inner_radius: "innerRadius";
        outer_radius: "outerRadius";
        ring_sides: "ringSides";
        smooth_faces: "smoothFaces";
    }
    class CsgTorus3D<Map extends NodePathMap = any> extends CsgPrimitive3D<Map> {
        constructor(identifier?: any)
        get innerRadius(): float64
        set innerRadius(value: float64)
        get outerRadius(): float64
        set outerRadius(value: float64)
        get sides(): int64
        set sides(value: int64)
        get ringSides(): int64
        set ringSides(value: int64)
        get smoothFaces(): boolean
        set smoothFaces(value: boolean)
        get material(): null | BaseMaterial3D | ShaderMaterial
        set material(value: null | BaseMaterial3D | ShaderMaterial)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCsgTorus3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCsgTorus3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCallbackTweener extends __RPCMapTweener {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCallbackTweener extends __NameMapTweener {
        set_delay: "setDelay";
    }
    /** Calls the specified method after optional delay.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_callbacktweener.html  
     */
    class CallbackTweener extends Tweener {
        constructor(identifier?: any)
        /** Makes the callback call delayed by given time in seconds.  
         *  **Example:** Call [method Node.queue_free] after 2 seconds:  
         *    
         */
        setDelay(delay: float64): null | CallbackTweener
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCallbackTweener;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCallbackTweener;
    }
    namespace Camera2D {
        enum AnchorMode {
            AnchorModeFixedTopLeft = 0,
            AnchorModeDragCenter = 1,
        }
        enum Camera2DProcessCallback {
            Camera2DProcessPhysics = 0,
            Camera2DProcessIdle = 1,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCamera2D extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCamera2D extends __NameMapNode2D {
        _update_scroll: "_updateScroll";
        make_current: "makeCurrent";
        is_current: "isCurrent";
        _make_current: "_makeCurrent";
        set_limit: "setLimit";
        get_limit: "getLimit";
        _set_limit_rect: "_setLimitRect";
        set_drag_margin: "setDragMargin";
        get_drag_margin: "getDragMargin";
        get_target_position: "getTargetPosition";
        get_screen_center_position: "getScreenCenterPosition";
        get_screen_rotation: "getScreenRotation";
        force_update_scroll: "forceUpdateScroll";
        reset_smoothing: "resetSmoothing";
        anchor_mode: "anchorMode";
        ignore_rotation: "ignoreRotation";
        custom_viewport: "customViewport";
        process_callback: "processCallback";
        limit_enabled: "limitEnabled";
        limit_left: "limitLeft";
        limit_top: "limitTop";
        limit_right: "limitRight";
        limit_bottom: "limitBottom";
        limit_smoothed: "limitSmoothed";
        position_smoothing_enabled: "positionSmoothingEnabled";
        position_smoothing_speed: "positionSmoothingSpeed";
        rotation_smoothing_enabled: "rotationSmoothingEnabled";
        rotation_smoothing_speed: "rotationSmoothingSpeed";
        drag_horizontal_enabled: "dragHorizontalEnabled";
        drag_vertical_enabled: "dragVerticalEnabled";
        drag_horizontal_offset: "dragHorizontalOffset";
        drag_vertical_offset: "dragVerticalOffset";
        drag_left_margin: "dragLeftMargin";
        drag_top_margin: "dragTopMargin";
        drag_right_margin: "dragRightMargin";
        drag_bottom_margin: "dragBottomMargin";
        editor_draw_screen: "editorDrawScreen";
        editor_draw_limits: "editorDrawLimits";
        editor_draw_drag_margin: "editorDrawDragMargin";
    }
    /** Camera node for 2D scenes.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_camera2d.html  
     */
    class Camera2D<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        _updateScroll(): void
        
        /** Forces this [Camera2D] to become the current active one. [member enabled] must be `true`. */
        makeCurrent(): void
        
        /** Returns `true` if this [Camera2D] is the active camera (see [method Viewport.get_camera_2d]). */
        isCurrent(): boolean
        _makeCurrent(_unnamedArg0: GObject): void
        
        /** Sets the camera limit for the specified [enum Side]. See also [member limit_bottom], [member limit_top], [member limit_left], and [member limit_right]. */
        setLimit(margin: Side, limit: int64): void
        
        /** Returns the camera limit for the specified [enum Side]. See also [member limit_bottom], [member limit_top], [member limit_left], and [member limit_right]. */
        getLimit(margin: Side): int64
        _setLimitRect(rect: Rect2I): void
        
        /** Sets the specified [enum Side]'s margin. See also [member drag_bottom_margin], [member drag_top_margin], [member drag_left_margin], and [member drag_right_margin]. */
        setDragMargin(margin: Side, dragMargin: float64): void
        
        /** Returns the specified [enum Side]'s margin. See also [member drag_bottom_margin], [member drag_top_margin], [member drag_left_margin], and [member drag_right_margin]. */
        getDragMargin(margin: Side): float64
        
        /** Returns this camera's target position, in global coordinates.  
         *      
         *  **Note:** The returned value is not the same as [member Node2D.global_position], as it is affected by the drag properties. It is also not the same as the current position if [member position_smoothing_enabled] is `true` (see [method get_screen_center_position]).  
         */
        getTargetPosition(): Vector2
        
        /** Returns the center of the screen from this camera's point of view, in global coordinates.  
         *      
         *  **Note:** The exact targeted position of the camera may be different. See [method get_target_position].  
         */
        getScreenCenterPosition(): Vector2
        
        /** Returns the current screen rotation from this camera's point of view.  
         *      
         *  **Note:** The screen rotation can be different from [member Node2D.global_rotation] if the camera is rotating smoothly due to [member rotation_smoothing_enabled].  
         */
        getScreenRotation(): float64
        
        /** Forces the camera to update scroll immediately. */
        forceUpdateScroll(): void
        
        /** Sets the camera's position immediately to its current smoothing destination.  
         *  This method has no effect if [member position_smoothing_enabled] is `false`.  
         */
        resetSmoothing(): void
        
        /** Aligns the camera to the tracked node.  
         *      
         *  **Note:** Calling [method force_update_scroll] after this method is not required.  
         */
        align(): void
        
        /** The camera's relative offset. Useful for looking around or camera shake animations. The offsetted camera can go past the limits defined in [member limit_top], [member limit_bottom], [member limit_left] and [member limit_right]. */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** The Camera2D's anchor point. */
        get anchorMode(): int64
        set anchorMode(value: int64)
        
        /** If `true`, the camera's rendered view is not affected by its [member Node2D.rotation] and [member Node2D.global_rotation]. */
        get ignoreRotation(): boolean
        set ignoreRotation(value: boolean)
        
        /** Controls whether the camera can be active or not. If `true`, the [Camera2D] will become the main camera when it enters the scene tree and there is no active camera currently (see [method Viewport.get_camera_2d]).  
         *  When the camera is currently active and [member enabled] is set to `false`, the next enabled [Camera2D] in the scene tree will become active.  
         */
        get enabled(): boolean
        set enabled(value: boolean)
        
        /** The camera's zoom. Higher values are more zoomed in. For example, a zoom of `Vector2(2.0, 2.0)` will be twice as zoomed in on each axis (the view covers an area four times smaller). In contrast, a zoom of `Vector2(0.5, 0.5)` will be twice as zoomed out on each axis (the view covers an area four times larger). The X and Y components should generally always be set to the same value, unless you wish to stretch the camera view.  
         *      
         *  **Note:** [member FontFile.oversampling] does  *not*  take [Camera2D] zoom into account. This means that zooming in/out will cause bitmap fonts and rasterized (non-MSDF) dynamic fonts to appear blurry or pixelated unless the font is part of a [CanvasLayer] that makes it ignore camera zoom. To ensure text remains crisp regardless of zoom, you can enable MSDF font rendering by enabling [member ProjectSettings.gui/theme/default_font_multichannel_signed_distance_field] (applies to the default project font only), or enabling **Multichannel Signed Distance Field** in the import options of a DynamicFont for custom fonts. On system fonts, [member SystemFont.multichannel_signed_distance_field] can be enabled in the inspector.  
         */
        get zoom(): Vector2
        set zoom(value: Vector2)
        
        /** The custom [Viewport] node attached to the [Camera2D]. If `null` or not a [Viewport], uses the default viewport instead. */
        get customViewport(): null | Viewport
        set customViewport(value: null | Viewport)
        
        /** The camera's process callback. */
        get processCallback(): int64
        set processCallback(value: int64)
        
        /** If `true`, the limits will be enabled. Disabling this will allow the camera to focus anywhere, when the four `limit_*` properties will not work. */
        get limitEnabled(): boolean
        set limitEnabled(value: boolean)
        
        /** Left scroll limit in pixels. The camera stops moving when reaching this value, but [member offset] can push the view past the limit. */
        get limitLeft(): int64
        set limitLeft(value: int64)
        
        /** Top scroll limit in pixels. The camera stops moving when reaching this value, but [member offset] can push the view past the limit. */
        get limitTop(): int64
        set limitTop(value: int64)
        
        /** Right scroll limit in pixels. The camera stops moving when reaching this value, but [member offset] can push the view past the limit. */
        get limitRight(): int64
        set limitRight(value: int64)
        
        /** Bottom scroll limit in pixels. The camera stops moving when reaching this value, but [member offset] can push the view past the limit. */
        get limitBottom(): int64
        set limitBottom(value: int64)
        
        /** If `true`, the camera smoothly stops when reaches its limits.  
         *  This property has no effect if [member position_smoothing_enabled] is `false`.  
         *      
         *  **Note:** To immediately update the camera's position to be within limits without smoothing, even with this setting enabled, invoke [method reset_smoothing].  
         */
        get limitSmoothed(): boolean
        set limitSmoothed(value: boolean)
        
        /** If `true`, the camera's view smoothly moves towards its target position at [member position_smoothing_speed]. */
        get positionSmoothingEnabled(): boolean
        set positionSmoothingEnabled(value: boolean)
        
        /** Speed in pixels per second of the camera's smoothing effect when [member position_smoothing_enabled] is `true`. */
        get positionSmoothingSpeed(): float64
        set positionSmoothingSpeed(value: float64)
        
        /** If `true`, the camera's view smoothly rotates, via asymptotic smoothing, to align with its target rotation at [member rotation_smoothing_speed].  
         *      
         *  **Note:** This property has no effect if [member ignore_rotation] is `true`.  
         */
        get rotationSmoothingEnabled(): boolean
        set rotationSmoothingEnabled(value: boolean)
        
        /** The angular, asymptotic speed of the camera's rotation smoothing effect when [member rotation_smoothing_enabled] is `true`. */
        get rotationSmoothingSpeed(): float64
        set rotationSmoothingSpeed(value: float64)
        
        /** If `true`, the camera only moves when reaching the horizontal (left and right) drag margins. If `false`, the camera moves horizontally regardless of margins. */
        get dragHorizontalEnabled(): boolean
        set dragHorizontalEnabled(value: boolean)
        
        /** If `true`, the camera only moves when reaching the vertical (top and bottom) drag margins. If `false`, the camera moves vertically regardless of the drag margins. */
        get dragVerticalEnabled(): boolean
        set dragVerticalEnabled(value: boolean)
        
        /** The relative horizontal drag offset of the camera between the right (`-1`) and left (`1`) drag margins.  
         *      
         *  **Note:** Used to set the initial horizontal drag offset; determine the current offset; or force the current offset. It's not automatically updated when [member drag_horizontal_enabled] is `true` or the drag margins are changed.  
         */
        get dragHorizontalOffset(): float64
        set dragHorizontalOffset(value: float64)
        
        /** The relative vertical drag offset of the camera between the bottom (`-1`) and top (`1`) drag margins.  
         *      
         *  **Note:** Used to set the initial vertical drag offset; determine the current offset; or force the current offset. It's not automatically updated when [member drag_vertical_enabled] is `true` or the drag margins are changed.  
         */
        get dragVerticalOffset(): float64
        set dragVerticalOffset(value: float64)
        
        /** Left margin needed to drag the camera. A value of `1` makes the camera move only when reaching the left edge of the screen. */
        get dragLeftMargin(): float64
        set dragLeftMargin(value: float64)
        
        /** Top margin needed to drag the camera. A value of `1` makes the camera move only when reaching the top edge of the screen. */
        get dragTopMargin(): float64
        set dragTopMargin(value: float64)
        
        /** Right margin needed to drag the camera. A value of `1` makes the camera move only when reaching the right edge of the screen. */
        get dragRightMargin(): float64
        set dragRightMargin(value: float64)
        
        /** Bottom margin needed to drag the camera. A value of `1` makes the camera move only when reaching the bottom edge of the screen. */
        get dragBottomMargin(): float64
        set dragBottomMargin(value: float64)
        
        /** If `true`, draws the camera's screen rectangle in the editor. */
        get editorDrawScreen(): boolean
        set editorDrawScreen(value: boolean)
        
        /** If `true`, draws the camera's limits rectangle in the editor. */
        get editorDrawLimits(): boolean
        set editorDrawLimits(value: boolean)
        
        /** If `true`, draws the camera's drag margin rectangle in the editor. */
        get editorDrawDragMargin(): boolean
        set editorDrawDragMargin(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCamera2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCamera2D;
    }
    namespace Camera3D {
        enum ProjectionType {
            ProjectionPerspective = 0,
            ProjectionOrthogonal = 1,
            ProjectionFrustum = 2,
        }
        enum KeepAspect {
            KeepWidth = 0,
            KeepHeight = 1,
        }
        enum DopplerTracking {
            DopplerTrackingDisabled = 0,
            DopplerTrackingIdleStep = 1,
            DopplerTrackingPhysicsStep = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCamera3D extends __RPCMapNode3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCamera3D extends __NameMapNode3D {
        project_ray_normal: "projectRayNormal";
        project_local_ray_normal: "projectLocalRayNormal";
        project_ray_origin: "projectRayOrigin";
        unproject_position: "unprojectPosition";
        is_position_behind: "isPositionBehind";
        project_position: "projectPosition";
        set_perspective: "setPerspective";
        set_orthogonal: "setOrthogonal";
        set_frustum: "setFrustum";
        make_current: "makeCurrent";
        clear_current: "clearCurrent";
        get_camera_transform: "getCameraTransform";
        get_camera_projection: "getCameraProjection";
        get_frustum: "getFrustum";
        is_position_in_frustum: "isPositionInFrustum";
        get_camera_rid: "getCameraRid";
        get_pyramid_shape_rid: "getPyramidShapeRid";
        set_cull_mask_value: "setCullMaskValue";
        get_cull_mask_value: "getCullMaskValue";
        keep_aspect: "keepAspect";
        cull_mask: "cullMask";
        h_offset: "hOffset";
        v_offset: "vOffset";
        doppler_tracking: "dopplerTracking";
        frustum_offset: "frustumOffset";
    }
    /** Camera node, displays from a point of view.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_camera3d.html  
     */
    class Camera3D<Map extends NodePathMap = any> extends Node3D<Map> {
        constructor(identifier?: any)
        /** Returns a normal vector in world space, that is the result of projecting a point on the [Viewport] rectangle by the inverse camera projection. This is useful for casting rays in the form of (origin, normal) for object intersection or picking. */
        projectRayNormal(screenPoint: Vector2): Vector3
        
        /** Returns a normal vector from the screen point location directed along the camera. Orthogonal cameras are normalized. Perspective cameras account for perspective, screen width/height, etc. */
        projectLocalRayNormal(screenPoint: Vector2): Vector3
        
        /** Returns a 3D position in world space, that is the result of projecting a point on the [Viewport] rectangle by the inverse camera projection. This is useful for casting rays in the form of (origin, normal) for object intersection or picking. */
        projectRayOrigin(screenPoint: Vector2): Vector3
        
        /** Returns the 2D coordinate in the [Viewport] rectangle that maps to the given 3D point in world space.  
         *      
         *  **Note:** When using this to position GUI elements over a 3D viewport, use [method is_position_behind] to prevent them from appearing if the 3D point is behind the camera:  
         *    
         */
        unprojectPosition(worldPoint: Vector3): Vector2
        
        /** Returns `true` if the given position is behind the camera (the blue part of the linked diagram). [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/camera3d_position_frustum.png]See this diagram[/url] for an overview of position query methods.  
         *      
         *  **Note:** A position which returns `false` may still be outside the camera's field of view.  
         */
        isPositionBehind(worldPoint: Vector3): boolean
        
        /** Returns the 3D point in world space that maps to the given 2D coordinate in the [Viewport] rectangle on a plane that is the given [param z_depth] distance into the scene away from the camera. */
        projectPosition(screenPoint: Vector2, zDepth: float64): Vector3
        
        /** Sets the camera projection to perspective mode (see [constant PROJECTION_PERSPECTIVE]), by specifying a [param fov] (field of view) angle in degrees, and the [param z_near] and [param z_far] clip planes in world space units. */
        setPerspective(fov: float64, zNear: float64, zFar: float64): void
        
        /** Sets the camera projection to orthogonal mode (see [constant PROJECTION_ORTHOGONAL]), by specifying a [param size], and the [param z_near] and [param z_far] clip planes in world space units.  
         *  As a hint, 3D games that look 2D often use this projection, with [param size] specified in pixels.  
         */
        setOrthogonal(size: float64, zNear: float64, zFar: float64): void
        
        /** Sets the camera projection to frustum mode (see [constant PROJECTION_FRUSTUM]), by specifying a [param size], an [param offset], and the [param z_near] and [param z_far] clip planes in world space units. The [param size] parameter represents the size of the near plane, either its width or height depending on the value of [member keep_aspect]. See also [member frustum_offset]. */
        setFrustum(size: float64, offset: Vector2, zNear: float64, zFar: float64): void
        
        /** Makes this camera the current camera for the [Viewport] (see class description). If the camera node is outside the scene tree, it will attempt to become current once it's added. */
        makeCurrent(): void
        
        /** If this is the current camera, remove it from being current. If [param enable_next] is `true`, request to make the next camera current, if any. */
        clearCurrent(enableNext?: boolean /* = true */): void
        
        /** Returns the transform of the camera plus the vertical ([member v_offset]) and horizontal ([member h_offset]) offsets; and any other adjustments made to the position and orientation of the camera by subclassed cameras such as [XRCamera3D]. */
        getCameraTransform(): Transform3D
        
        /** Returns the projection matrix that this camera uses to render to its associated viewport. The camera must be part of the scene tree to function. */
        getCameraProjection(): Projection
        
        /** Returns the camera's frustum planes in world space units as an array of [Plane]s in the following order: near, far, left, top, right, bottom. Not to be confused with [member frustum_offset]. */
        getFrustum(): GArray<Plane>
        
        /** Returns `true` if the given position is inside the camera's frustum (the green part of the linked diagram). [url=https://raw.githubusercontent.com/godotengine/godot-docs/master/img/camera3d_position_frustum.png]See this diagram[/url] for an overview of position query methods. */
        isPositionInFrustum(worldPoint: Vector3): boolean
        
        /** Returns the camera's RID from the [RenderingServer]. */
        getCameraRid(): Rid
        
        /** Returns the RID of a pyramid shape encompassing the camera's view frustum, ignoring the camera's near plane. The tip of the pyramid represents the position of the camera. */
        getPyramidShapeRid(): Rid
        
        /** Based on [param value], enables or disables the specified layer in the [member cull_mask], given a [param layer_number] between 1 and 20. */
        setCullMaskValue(layerNumber: int64, value: boolean): void
        
        /** Returns whether or not the specified layer of the [member cull_mask] is enabled, given a [param layer_number] between 1 and 20. */
        getCullMaskValue(layerNumber: int64): boolean
        
        /** The axis to lock during [member fov]/[member size] adjustments. Can be either [constant KEEP_WIDTH] or [constant KEEP_HEIGHT]. */
        get keepAspect(): int64
        set keepAspect(value: int64)
        
        /** The culling mask that describes which [member VisualInstance3D.layers] are rendered by this camera. By default, all 20 user-visible layers are rendered.  
         *      
         *  **Note:** Since the [member cull_mask] allows for 32 layers to be stored in total, there are an additional 12 layers that are only used internally by the engine and aren't exposed in the editor. Setting [member cull_mask] using a script allows you to toggle those reserved layers, which can be useful for editor plugins.  
         *  To adjust [member cull_mask] more easily using a script, use [method get_cull_mask_value] and [method set_cull_mask_value].  
         *      
         *  **Note:** [VoxelGI], SDFGI and [LightmapGI] will always take all layers into account to determine what contributes to global illumination. If this is an issue, set [member GeometryInstance3D.gi_mode] to [constant GeometryInstance3D.GI_MODE_DISABLED] for meshes and [member Light3D.light_bake_mode] to [constant Light3D.BAKE_DISABLED] for lights to exclude them from global illumination.  
         */
        get cullMask(): int64
        set cullMask(value: int64)
        
        /** The [Environment] to use for this camera. */
        get environment(): null | Environment
        set environment(value: null | Environment)
        
        /** The [CameraAttributes] to use for this camera. */
        get attributes(): null | CameraAttributesPractical | CameraAttributesPhysical
        set attributes(value: null | CameraAttributesPractical | CameraAttributesPhysical)
        
        /** The [Compositor] to use for this camera. */
        get compositor(): null | Compositor
        set compositor(value: null | Compositor)
        
        /** The horizontal (X) offset of the camera viewport. */
        get hOffset(): float64
        set hOffset(value: float64)
        
        /** The vertical (Y) offset of the camera viewport. */
        get vOffset(): float64
        set vOffset(value: float64)
        
        /** If not [constant DOPPLER_TRACKING_DISABLED], this camera will simulate the [url=https://en.wikipedia.org/wiki/Doppler_effect]Doppler effect[/url] for objects changed in particular `_process` methods.  
         *      
         *  **Note:** The Doppler effect will only be heard on [AudioStreamPlayer3D]s if [member AudioStreamPlayer3D.doppler_tracking] is not set to [constant AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED].  
         */
        get dopplerTracking(): int64
        set dopplerTracking(value: int64)
        
        /** The camera's projection mode. In [constant PROJECTION_PERSPECTIVE] mode, objects' Z distance from the camera's local space scales their perceived size. */
        get projection(): int64
        set projection(value: int64)
        
        /** If `true`, the ancestor [Viewport] is currently using this camera.  
         *  If multiple cameras are in the scene, one will always be made current. For example, if two [Camera3D] nodes are present in the scene and only one is current, setting one camera's [member current] to `false` will cause the other camera to be made current.  
         */
        get current(): boolean
        set current(value: boolean)
        
        /** The camera's field of view (also known as FOV), as an angle in degrees. Only applicable in perspective mode. Since [member keep_aspect] locks one axis, this property sets the field of view on the other axis.  
         *  For reference, the default angle for the vertical FOV (`75.0`) is equivalent to a horizontal FOV of:  
         *  - ~91.31 degrees in a 4:3 viewport  
         *  - ~101.67 degrees in a 16:10 viewport  
         *  - ~107.51 degrees in a 16:9 viewport  
         *  - ~121.63 degrees in a 21:9 viewport  
         */
        get fov(): float64
        set fov(value: float64)
        
        /** The camera's size in meters measured as the diameter of the width or height, depending on [member keep_aspect]. Only applicable in orthogonal and frustum modes. */
        get size(): float64
        set size(value: float64)
        
        /** The camera's frustum offset. This can be changed from the default to create "tilted frustum" effects such as [url=https://zdoom.org/wiki/Y-shearing]Y-shearing[/url].  
         *      
         *  **Note:** Only effective if [member projection] is [constant PROJECTION_FRUSTUM].  
         */
        get frustumOffset(): Vector2
        set frustumOffset(value: Vector2)
        
        /** The distance to the near culling boundary for this camera relative to its local Z axis. Lower values allow the camera to see objects more up close to its origin, at the cost of lower precision across the  *entire*  range. Values lower than the default can lead to increased Z-fighting. */
        get near(): float64
        set near(value: float64)
        
        /** The distance to the far culling boundary for this camera relative to its local Z axis. Higher values allow the camera to see further away, while decreasing [member far] can improve performance if it results in objects being partially or fully culled. */
        get far(): float64
        set far(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCamera3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCamera3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCameraAttributes extends __RPCMapResource {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCameraAttributes extends __NameMapResource {
        exposure_sensitivity: "exposureSensitivity";
        exposure_multiplier: "exposureMultiplier";
        auto_exposure_enabled: "autoExposureEnabled";
        auto_exposure_scale: "autoExposureScale";
        auto_exposure_speed: "autoExposureSpeed";
    }
    /** Parent class for camera settings.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cameraattributes.html  
     */
    class CameraAttributes extends Resource {
        constructor(identifier?: any)
        /** Sensitivity of camera sensors, measured in ISO. A higher sensitivity results in a brighter image.  
         *  If [member auto_exposure_enabled] is `true`, this can be used as a method of exposure compensation, doubling the value will increase the exposure value (measured in EV100) by 1 stop.  
         *      
         *  **Note:** Only available when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is enabled.  
         */
        get exposureSensitivity(): float64
        set exposureSensitivity(value: float64)
        
        /** Multiplier for the exposure amount. A higher value results in a brighter image. */
        get exposureMultiplier(): float64
        set exposureMultiplier(value: float64)
        
        /** If `true`, enables the tonemapping auto exposure mode of the scene renderer. If `true`, the renderer will automatically determine the exposure setting to adapt to the scene's illumination and the observed light.  
         *      
         *  **Note:** Auto-exposure is only supported in the Forward+ rendering method, not Mobile or Compatibility.  
         */
        get autoExposureEnabled(): boolean
        set autoExposureEnabled(value: boolean)
        
        /** The scale of the auto exposure effect. Affects the intensity of auto exposure. */
        get autoExposureScale(): float64
        set autoExposureScale(value: float64)
        
        /** The speed of the auto exposure effect. Affects the time needed for the camera to perform auto exposure. */
        get autoExposureSpeed(): float64
        set autoExposureSpeed(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCameraAttributes;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCameraAttributes;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCameraAttributesPhysical extends __RPCMapCameraAttributes {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCameraAttributesPhysical extends __NameMapCameraAttributes {
        get_fov: "getFov";
        frustum_focus_distance: "frustumFocusDistance";
        frustum_focal_length: "frustumFocalLength";
        frustum_near: "frustumNear";
        frustum_far: "frustumFar";
        exposure_aperture: "exposureAperture";
        exposure_shutter_speed: "exposureShutterSpeed";
        auto_exposure_min_exposure_value: "autoExposureMinExposureValue";
        auto_exposure_max_exposure_value: "autoExposureMaxExposureValue";
    }
    /** Physically-based camera settings.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cameraattributesphysical.html  
     */
    class CameraAttributesPhysical extends CameraAttributes {
        constructor(identifier?: any)
        /** Returns the vertical field of view that corresponds to the [member frustum_focal_length]. This value is calculated internally whenever [member frustum_focal_length] is changed. */
        getFov(): float64
        
        /** Distance from camera of object that will be in focus, measured in meters. Internally this will be clamped to be at least 1 millimeter larger than [member frustum_focal_length]. */
        get frustumFocusDistance(): float64
        set frustumFocusDistance(value: float64)
        
        /** Distance between camera lens and camera aperture, measured in millimeters. Controls field of view and depth of field. A larger focal length will result in a smaller field of view and a narrower depth of field meaning fewer objects will be in focus. A smaller focal length will result in a wider field of view and a larger depth of field meaning more objects will be in focus. When attached to a [Camera3D] as its [member Camera3D.attributes], it will override the [member Camera3D.fov] property and the [member Camera3D.keep_aspect] property. */
        get frustumFocalLength(): float64
        set frustumFocalLength(value: float64)
        
        /** Override value for [member Camera3D.near]. Used internally when calculating depth of field. When attached to a [Camera3D] as its [member Camera3D.attributes], it will override the [member Camera3D.near] property. */
        get frustumNear(): float64
        set frustumNear(value: float64)
        
        /** Override value for [member Camera3D.far]. Used internally when calculating depth of field. When attached to a [Camera3D] as its [member Camera3D.attributes], it will override the [member Camera3D.far] property. */
        get frustumFar(): float64
        set frustumFar(value: float64)
        
        /** Size of the aperture of the camera, measured in f-stops. An f-stop is a unitless ratio between the focal length of the camera and the diameter of the aperture. A high aperture setting will result in a smaller aperture which leads to a dimmer image and sharper focus. A low aperture results in a wide aperture which lets in more light resulting in a brighter, less-focused image. Default is appropriate for outdoors at daytime (i.e. for use with a default [DirectionalLight3D]), for indoor lighting, a value between 2 and 4 is more appropriate.  
         *  Only available when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is enabled.  
         */
        get exposureAperture(): float64
        set exposureAperture(value: float64)
        
        /** Time for shutter to open and close, evaluated as `1 / shutter_speed` seconds. A higher value will allow less light (leading to a darker image), while a lower value will allow more light (leading to a brighter image).  
         *  Only available when [member ProjectSettings.rendering/lights_and_shadows/use_physical_light_units] is enabled.  
         */
        get exposureShutterSpeed(): float64
        set exposureShutterSpeed(value: float64)
        
        /** The minimum luminance (in EV100) used when calculating auto exposure. When calculating scene average luminance, color values will be clamped to at least this value. This limits the auto-exposure from exposing above a certain brightness, resulting in a cut off point where the scene will remain dark. */
        get autoExposureMinExposureValue(): float64
        set autoExposureMinExposureValue(value: float64)
        
        /** The maximum luminance (in EV100) used when calculating auto exposure. When calculating scene average luminance, color values will be clamped to at least this value. This limits the auto-exposure from exposing below a certain brightness, resulting in a cut off point where the scene will remain bright. */
        get autoExposureMaxExposureValue(): float64
        set autoExposureMaxExposureValue(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCameraAttributesPhysical;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCameraAttributesPhysical;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCameraAttributesPractical extends __RPCMapCameraAttributes {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCameraAttributesPractical extends __NameMapCameraAttributes {
        dof_blur_far_enabled: "dofBlurFarEnabled";
        dof_blur_far_distance: "dofBlurFarDistance";
        dof_blur_far_transition: "dofBlurFarTransition";
        dof_blur_near_enabled: "dofBlurNearEnabled";
        dof_blur_near_distance: "dofBlurNearDistance";
        dof_blur_near_transition: "dofBlurNearTransition";
        dof_blur_amount: "dofBlurAmount";
        auto_exposure_min_sensitivity: "autoExposureMinSensitivity";
        auto_exposure_max_sensitivity: "autoExposureMaxSensitivity";
    }
    /** Camera settings in an easy to use format.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cameraattributespractical.html  
     */
    class CameraAttributesPractical extends CameraAttributes {
        constructor(identifier?: any)
        /** Enables depth of field blur for objects further than [member dof_blur_far_distance]. Strength of blur is controlled by [member dof_blur_amount] and modulated by [member dof_blur_far_transition].  
         *      
         *  **Note:** Depth of field blur is only supported in the Forward+ and Mobile rendering methods, not Compatibility.  
         *      
         *  **Note:** Depth of field blur is not supported on viewports that have a transparent background (where [member Viewport.transparent_bg] is `true`).  
         */
        get dofBlurFarEnabled(): boolean
        set dofBlurFarEnabled(value: boolean)
        
        /** Objects further from the [Camera3D] by this amount will be blurred by the depth of field effect. Measured in meters. */
        get dofBlurFarDistance(): float64
        set dofBlurFarDistance(value: float64)
        
        /** When positive, distance over which (starting from [member dof_blur_far_distance]) blur effect will scale from 0 to [member dof_blur_amount]. When negative, uses physically-based scaling so depth of field effect will scale from 0 at [member dof_blur_far_distance] and will increase in a physically accurate way as objects get further from the [Camera3D]. */
        get dofBlurFarTransition(): float64
        set dofBlurFarTransition(value: float64)
        
        /** Enables depth of field blur for objects closer than [member dof_blur_near_distance]. Strength of blur is controlled by [member dof_blur_amount] and modulated by [member dof_blur_near_transition].  
         *      
         *  **Note:** Depth of field blur is only supported in the Forward+ and Mobile rendering methods, not Compatibility.  
         *      
         *  **Note:** Depth of field blur is not supported on viewports that have a transparent background (where [member Viewport.transparent_bg] is `true`).  
         */
        get dofBlurNearEnabled(): boolean
        set dofBlurNearEnabled(value: boolean)
        
        /** Objects closer from the [Camera3D] by this amount will be blurred by the depth of field effect. Measured in meters. */
        get dofBlurNearDistance(): float64
        set dofBlurNearDistance(value: float64)
        
        /** When positive, distance over which blur effect will scale from 0 to [member dof_blur_amount], ending at [member dof_blur_near_distance]. When negative, uses physically-based scaling so depth of field effect will scale from 0 at [member dof_blur_near_distance] and will increase in a physically accurate way as objects get closer to the [Camera3D]. */
        get dofBlurNearTransition(): float64
        set dofBlurNearTransition(value: float64)
        
        /** Sets the maximum amount of blur. When using physically-based blur amounts, will instead act as a multiplier. High values lead to an increased amount of blurriness, but can be much more expensive to calculate. It is best to keep this as low as possible for a given art style. */
        get dofBlurAmount(): float64
        set dofBlurAmount(value: float64)
        
        /** The minimum sensitivity (in ISO) used when calculating auto exposure. When calculating scene average luminance, color values will be clamped to at least this value. This limits the auto-exposure from exposing above a certain brightness, resulting in a cut off point where the scene will remain dark. */
        get autoExposureMinSensitivity(): float64
        set autoExposureMinSensitivity(value: float64)
        
        /** The maximum sensitivity (in ISO) used when calculating auto exposure. When calculating scene average luminance, color values will be clamped to at least this value. This limits the auto-exposure from exposing below a certain brightness, resulting in a cut off point where the scene will remain bright. */
        get autoExposureMaxSensitivity(): float64
        set autoExposureMaxSensitivity(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCameraAttributesPractical;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCameraAttributesPractical;
    }
    namespace CameraFeed {
        enum FeedDataType {
            FeedNoimage = 0,
            FeedRgb = 1,
            FeedYcbcr = 2,
            FeedYcbcrSep = 3,
            FeedExternal = 4,
        }
        enum FeedPosition {
            FeedUnspecified = 0,
            FeedFront = 1,
            FeedBack = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCameraFeed extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCameraFeed extends __NameMapRefCounted {
        _activate_feed: "_activateFeed";
        _deactivate_feed: "_deactivateFeed";
        _set_format: "_setFormat";
        _get_formats: "_getFormats";
        get_id: "getId";
        get_name: "getName";
        set_name: "setName";
        get_position: "getPosition";
        set_position: "setPosition";
        set_rgb_image: "setRgbImage";
        set_ycbcr_image: "setYcbcrImage";
        set_ycbcr_images: "setYcbcrImages";
        set_external: "setExternal";
        get_texture_tex_id: "getTextureTexId";
        get_datatype: "getDatatype";
        set_format: "setFormat";
        feed_is_active: "feedIsActive";
        feed_transform: "feedTransform";
        frame_changed: "frameChanged";
        format_changed: "formatChanged";
    }
    namespace CameraFeed {
        type FeedFormat = GDictionary<{
            width: int64
            height: int64
            format: string
            frame_numerator?: int64
            frame_denominator?: int64
            pixel_format?: uint32
        }>
    }
    
    /** A camera feed gives you access to a single physical camera attached to your device.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_camerafeed.html  
     */
    class CameraFeed extends RefCounted {
        constructor(identifier?: any)
        /** Called when the camera feed is activated. */
        /* gdvirtual */ _activateFeed(): boolean
        
        /** Called when the camera feed is deactivated. */
        /* gdvirtual */ _deactivateFeed(): void
        
        /** Override this method to set the format of the camera feed. */
        /* gdvirtual */ _setFormat(index: int64, parameters: GDictionary): boolean
        
        /** Override this method to define supported formats of the camera feed. */
        /* gdvirtual */ _getFormats(): GArray
        
        /** Returns the unique ID for this feed. */
        getId(): int64
        
        /** Returns the camera's name. */
        getName(): string
        
        /** Sets the camera's name. */
        setName(name: string): void
        
        /** Returns the position of camera on the device. */
        getPosition(): CameraFeed.FeedPosition
        
        /** Sets the position of this camera. */
        setPosition(position: CameraFeed.FeedPosition): void
        
        /** Sets RGB image for this feed. */
        setRgbImage(rgbImage: Image): void
        
        /** Sets YCbCr image for this feed. */
        setYcbcrImage(ycbcrImage: Image): void
        
        /** Sets Y and CbCr images for this feed. */
        setYcbcrImages(yImage: Image, cbcrImage: Image): void
        
        /** Sets the feed as external feed provided by another library. */
        setExternal(width: int64, height: int64): void
        
        /** Returns the texture backend ID (usable by some external libraries that need a handle to a texture to write data). */
        getTextureTexId(feedImageType: CameraServer.FeedImage): int64
        
        /** Returns feed image data type. */
        getDatatype(): CameraFeed.FeedDataType
        
        /** Sets the feed format parameters for the given [param index] in the [member formats] array. Returns `true` on success. By default, the YUYV encoded stream is transformed to [constant FEED_RGB]. The YUYV encoded stream output format can be changed by setting [param parameters]'s `output` entry to one of the following:  
         *  - `"separate"` will result in [constant FEED_YCBCR_SEP];  
         *  - `"grayscale"` will result in desaturated [constant FEED_RGB];  
         *  - `"copy"` will result in [constant FEED_YCBCR].  
         */
        setFormat(index: int64, parameters: GDictionary): boolean
        
        /** If `true`, the feed is active. */
        get feedIsActive(): boolean
        set feedIsActive(value: boolean)
        
        /** The transform applied to the camera's image. */
        get feedTransform(): Transform2D
        set feedTransform(value: Transform2D)
        
        /** Formats supported by the feed. Each entry is a [Dictionary] describing format parameters. */
        get formats(): GArray<CameraFeed.FeedFormat>
        set formats(value: GArray<CameraFeed.FeedFormat>)
        
        /** Emitted when a new frame is available. */
        readonly frameChanged: Signal<() => void>
        
        /** Emitted when the format has changed. */
        readonly formatChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCameraFeed;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCameraFeed;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCameraTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCameraTexture extends __NameMapTexture2D {
        camera_feed_id: "cameraFeedId";
        which_feed: "whichFeed";
        camera_is_active: "cameraIsActive";
    }
    /** Texture provided by a [CameraFeed].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_cameratexture.html  
     */
    class CameraTexture extends Texture2D {
        constructor(identifier?: any)
        /** The ID of the [CameraFeed] for which we want to display the image. */
        get cameraFeedId(): int64
        set cameraFeedId(value: int64)
        
        /** Which image within the [CameraFeed] we want access to, important if the camera image is split in a Y and CbCr component. */
        get whichFeed(): int64
        set whichFeed(value: int64)
        
        /** Convenience property that gives access to the active property of the [CameraFeed]. */
        get cameraIsActive(): boolean
        set cameraIsActive(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCameraTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCameraTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCanvasGroup extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCanvasGroup extends __NameMapNode2D {
        fit_margin: "fitMargin";
        clear_margin: "clearMargin";
        use_mipmaps: "useMipmaps";
    }
    /** Merges several 2D nodes into a single draw operation.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_canvasgroup.html  
     */
    class CanvasGroup<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** Sets the size of a margin used to expand the drawable rect of this [CanvasGroup]. The size of the [CanvasGroup] is determined by fitting a rect around its children then expanding that rect by [member fit_margin]. This increases both the backbuffer area used and the area covered by the [CanvasGroup] both of which can reduce performance. This should be kept as small as possible and should only be expanded when an increased size is needed (e.g. for custom shader effects). */
        get fitMargin(): float64
        set fitMargin(value: float64)
        
        /** Sets the size of the margin used to expand the clearing rect of this [CanvasGroup]. This expands the area of the backbuffer that will be used by the [CanvasGroup]. A smaller margin will reduce the area of the backbuffer used which can increase performance, however if [member use_mipmaps] is enabled, a small margin may result in mipmap errors at the edge of the [CanvasGroup]. Accordingly, this should be left as small as possible, but should be increased if artifacts appear along the edges of the canvas group. */
        get clearMargin(): float64
        set clearMargin(value: float64)
        
        /** If `true`, calculates mipmaps for the backbuffer before drawing the [CanvasGroup] so that mipmaps can be used in a custom [ShaderMaterial] attached to the [CanvasGroup]. Generating mipmaps has a performance cost so this should not be enabled unless required. */
        get useMipmaps(): boolean
        set useMipmaps(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCanvasGroup;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCanvasGroup;
    }
    namespace CanvasItem {
        enum TextureFilter {
            TextureFilterParentNode = 0,
            TextureFilterNearest = 1,
            TextureFilterLinear = 2,
            TextureFilterNearestWithMipmaps = 3,
            TextureFilterLinearWithMipmaps = 4,
            TextureFilterNearestWithMipmapsAnisotropic = 5,
            TextureFilterLinearWithMipmapsAnisotropic = 6,
            TextureFilterMax = 7,
        }
        enum TextureRepeat {
            TextureRepeatParentNode = 0,
            TextureRepeatDisabled = 1,
            TextureRepeatEnabled = 2,
            TextureRepeatMirror = 3,
            TextureRepeatMax = 4,
        }
        enum ClipChildrenMode {
            ClipChildrenDisabled = 0,
            ClipChildrenOnly = 1,
            ClipChildrenAndDraw = 2,
            ClipChildrenMax = 3,
        }
        enum OversamplingWithScale {
            OversamplingWithScaleParentNode = 0,
            OversamplingWithScaleDisabled = 1,
            OversamplingWithScaleEnabled = 2,
            OversamplingWithScaleMax = 3,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCanvasItem extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCanvasItem extends __NameMapNode {
        _top_level_raise_self: "_topLevelRaiseSelf";
        _edit_set_state: "_editSetState";
        _edit_get_state: "_editGetState";
        _edit_set_position: "_editSetPosition";
        _edit_get_position: "_editGetPosition";
        _edit_set_scale: "_editSetScale";
        _edit_get_scale: "_editGetScale";
        _edit_set_rect: "_editSetRect";
        _edit_get_rect: "_editGetRect";
        _edit_use_rect: "_editUseRect";
        _edit_set_rotation: "_editSetRotation";
        _edit_get_rotation: "_editGetRotation";
        _edit_use_rotation: "_editUseRotation";
        _edit_set_pivot: "_editSetPivot";
        _edit_get_pivot: "_editGetPivot";
        _edit_use_pivot: "_editUsePivot";
        _edit_get_transform: "_editGetTransform";
        get_canvas_item: "getCanvasItem";
        is_visible_in_tree: "isVisibleInTree";
        queue_redraw: "queueRedraw";
        move_to_front: "moveToFront";
        draw_line: "drawLine";
        draw_dashed_line: "drawDashedLine";
        draw_polyline: "drawPolyline";
        draw_polyline_colors: "drawPolylineColors";
        draw_ellipse_arc: "drawEllipseArc";
        draw_arc: "drawArc";
        draw_multiline: "drawMultiline";
        draw_multiline_colors: "drawMultilineColors";
        draw_rect: "drawRect";
        draw_circle: "drawCircle";
        draw_ellipse: "drawEllipse";
        draw_texture: "drawTexture";
        draw_texture_rect: "drawTextureRect";
        draw_texture_rect_region: "drawTextureRectRegion";
        draw_msdf_texture_rect_region: "drawMsdfTextureRectRegion";
        draw_lcd_texture_rect_region: "drawLcdTextureRectRegion";
        draw_style_box: "drawStyleBox";
        draw_primitive: "drawPrimitive";
        draw_polygon: "drawPolygon";
        draw_colored_polygon: "drawColoredPolygon";
        draw_string: "drawString";
        draw_multiline_string: "drawMultilineString";
        draw_string_outline: "drawStringOutline";
        draw_multiline_string_outline: "drawMultilineStringOutline";
        draw_char: "drawChar";
        draw_char_outline: "drawCharOutline";
        draw_mesh: "drawMesh";
        draw_multimesh: "drawMultimesh";
        draw_set_transform: "drawSetTransform";
        draw_set_transform_matrix: "drawSetTransformMatrix";
        draw_animation_slice: "drawAnimationSlice";
        draw_end_animation: "drawEndAnimation";
        get_transform: "getTransform";
        get_global_transform: "getGlobalTransform";
        get_global_transform_with_canvas: "getGlobalTransformWithCanvas";
        get_viewport_transform: "getViewportTransform";
        get_viewport_rect: "getViewportRect";
        get_canvas_transform: "getCanvasTransform";
        get_screen_transform: "getScreenTransform";
        get_local_mouse_position: "getLocalMousePosition";
        get_global_mouse_position: "getGlobalMousePosition";
        get_canvas: "getCanvas";
        get_canvas_layer_node: "getCanvasLayerNode";
        get_world_2d: "getWorld2D";
        set_instance_shader_parameter: "setInstanceShaderParameter";
        get_instance_shader_parameter: "getInstanceShaderParameter";
        set_notify_local_transform: "setNotifyLocalTransform";
        is_local_transform_notification_enabled: "isLocalTransformNotificationEnabled";
        set_notify_transform: "setNotifyTransform";
        is_transform_notification_enabled: "isTransformNotificationEnabled";
        force_update_transform: "forceUpdateTransform";
        make_canvas_position_local: "makeCanvasPositionLocal";
        make_input_local: "makeInputLocal";
        set_visibility_layer_bit: "setVisibilityLayerBit";
        get_visibility_layer_bit: "getVisibilityLayerBit";
        self_modulate: "selfModulate";
        show_behind_parent: "showBehindParent";
        top_level: "topLevel";
        clip_children: "clipChildren";
        oversampling_with_scale: "oversamplingWithScale";
        light_mask: "lightMask";
        visibility_layer: "visibilityLayer";
        z_index: "zIndex";
        z_as_relative: "zAsRelative";
        y_sort_enabled: "ySortEnabled";
        texture_filter: "textureFilter";
        texture_repeat: "textureRepeat";
        use_parent_material: "useParentMaterial";
        visibility_changed: "visibilityChanged";
        item_rect_changed: "itemRectChanged";
    }
    /** Abstract base class for everything in 2D space.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_canvasitem.html  
     */
    class CanvasItem<Map extends NodePathMap = any> extends Node<Map> {
        /** Notification received when this node's global transform changes, if [method is_transform_notification_enabled] is `true`. See also [method set_notify_transform] and [method get_transform].  
         *      
         *  **Note:** Many canvas items such as [Camera2D] or [CollisionObject2D] automatically enable this in order to function correctly.  
         */
        static readonly NOTIFICATION_TRANSFORM_CHANGED = 2000
        
        /** Notification received when this node's transform changes, if [method is_local_transform_notification_enabled] is `true`. This is not received when a parent [Node2D]'s transform changes. See also [method set_notify_local_transform].  
         *      
         *  **Note:** Many canvas items such as [Camera2D] or [CollisionShape2D] automatically enable this in order to function correctly.  
         */
        static readonly NOTIFICATION_LOCAL_TRANSFORM_CHANGED = 35
        
        /** The [CanvasItem] is requested to draw (see [method _draw]). */
        static readonly NOTIFICATION_DRAW = 30
        
        /** Notification received when this node's visibility changes (see [member visible] and [method is_visible_in_tree]).  
         *  This notification is received  *before*  the related [signal visibility_changed] signal.  
         */
        static readonly NOTIFICATION_VISIBILITY_CHANGED = 31
        
        /** The [CanvasItem] has entered the canvas. */
        static readonly NOTIFICATION_ENTER_CANVAS = 32
        
        /** The [CanvasItem] has exited the canvas.  
         *  This notification is sent in reversed order.  
         */
        static readonly NOTIFICATION_EXIT_CANVAS = 33
        
        /** Notification received when this [CanvasItem] is registered to a new [World2D] (see [method get_world_2d]). */
        static readonly NOTIFICATION_WORLD_2D_CHANGED = 36
        constructor(identifier?: any)
        
        /** Called when [CanvasItem] has been requested to redraw (after [method queue_redraw] is called, either manually or by the engine).  
         *  Corresponds to the [constant NOTIFICATION_DRAW] notification in [method Object._notification].  
         */
        /* gdvirtual */ _draw(): void
        _topLevelRaiseSelf(): void
        _editSetState(state: GDictionary): void
        _editGetState(): GDictionary
        _editSetPosition(position: Vector2): void
        _editGetPosition(): Vector2
        _editSetScale(scale: Vector2): void
        _editGetScale(): Vector2
        _editSetRect(rect: Rect2): void
        _editGetRect(): Rect2
        _editUseRect(): boolean
        _editSetRotation(degrees: float64): void
        _editGetRotation(): float64
        _editUseRotation(): boolean
        _editSetPivot(pivot: Vector2): void
        _editGetPivot(): Vector2
        _editUsePivot(): boolean
        _editGetTransform(): Transform2D
        
        /** Returns the internal canvas item [RID] used by the [RenderingServer] for this node. */
        getCanvasItem(): Rid
        
        /** Returns `true` if the node is present in the [SceneTree], its [member visible] property is `true` and all its ancestors are also visible. If any ancestor is hidden, this node will not be visible in the scene tree, and is therefore not drawn (see [method _draw]).  
         *  Visibility is checked only in parent nodes that inherit from [CanvasItem], [CanvasLayer], and [Window]. If the parent is of any other type (such as [Node], [AnimationPlayer], or [Node3D]), it is assumed to be visible.  
         *      
         *  **Note:** This method does not take [member visibility_layer] into account, so even if this method returns `true`, the node might end up not being rendered.  
         */
        isVisibleInTree(): boolean
        
        /** Show the [CanvasItem] if it's currently hidden. This is equivalent to setting [member visible] to `true`.  
         *      
         *  **Note:** For controls that inherit [Popup], the correct way to make them visible is to call one of the multiple `popup*()` functions instead.  
         */
        show(): void
        
        /** Hide the [CanvasItem] if it's currently visible. This is equivalent to setting [member visible] to `false`. */
        hide(): void
        
        /** Queues the [CanvasItem] to redraw. During idle time, if [CanvasItem] is visible, [constant NOTIFICATION_DRAW] is sent and [method _draw] is called. This only occurs **once** per frame, even if this method has been called multiple times. */
        queueRedraw(): void
        
        /** Moves this node below its siblings, usually causing the node to draw on top of its siblings. Does nothing if this node does not have a parent. See also [method Node.move_child]. */
        moveToFront(): void
        
        /** Draws a line from a 2D point to another, with a given color and width. It can be optionally antialiased. The [param from] and [param to] positions are defined in local space. See also [method draw_dashed_line], [method draw_multiline], and [method draw_polyline].  
         *  If [param width] is negative, then a two-point primitive will be drawn instead of a four-point one. This means that when the CanvasItem is scaled, the line will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         */
        drawLine(from: Vector2, to: Vector2, color: Color, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a dashed line from a 2D point to another, with a given color and width. The [param from] and [param to] positions are defined in local space. See also [method draw_line], [method draw_multiline], and [method draw_polyline].  
         *  If [param width] is negative, then two-point primitives will be drawn instead of four-point ones. This means that when the CanvasItem is scaled, the line parts will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *  [param dash] is the length of each dash in pixels, with the gap between each dash being the same length. If [param aligned] is `true`, the length of the first and last dashes may be shortened or lengthened to allow the line to begin and end at the precise points defined by [param from] and [param to]. Both ends are always symmetrical when [param aligned] is `true`. If [param aligned] is `false`, all dashes will have the same length, but the line may appear incomplete at the end due to the dash length not dividing evenly into the line length. Only full dashes are drawn when [param aligned] is `false`.  
         *  If [param antialiased] is `true`, half transparent "feathers" will be attached to the boundary, making outlines smooth.  
         *      
         *  **Note:** [param antialiased] is only effective if [param width] is greater than `0.0`.  
         */
        drawDashedLine(from: Vector2, to: Vector2, color: Color, width?: float64 /* = -1 */, dash?: float64 /* = 2 */, aligned?: boolean /* = true */, antialiased?: boolean /* = false */): void
        
        /** Draws interconnected line segments with a uniform [param color] and [param width] and optional antialiasing (supported only for positive [param width]). The [param points] array is defined in local space. When drawing large amounts of lines, this is faster than using individual [method draw_line] calls. To draw disconnected lines, use [method draw_multiline] instead. See also [method draw_polygon].  
         *  If [param width] is negative, it will be ignored and the polyline will be drawn using [constant RenderingServer.PRIMITIVE_LINE_STRIP]. This means that when the CanvasItem is scaled, the polyline will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         */
        drawPolyline(points: PackedVector2Array | Vector2[], color: Color, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws interconnected line segments with a uniform [param width], point-by-point coloring, and optional antialiasing (supported only for positive [param width]). Colors assigned to line points match by index between [param points] and [param colors], i.e. each line segment is filled with a gradient between the colors of the endpoints. The [param points] array is defined in local space. When drawing large amounts of lines, this is faster than using individual [method draw_line] calls. To draw disconnected lines, use [method draw_multiline_colors] instead. See also [method draw_polygon].  
         *  If [param width] is negative, it will be ignored and the polyline will be drawn using [constant RenderingServer.PRIMITIVE_LINE_STRIP]. This means that when the CanvasItem is scaled, the polyline will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         */
        drawPolylineColors(points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws an unfilled elliptical arc between the given angles with a uniform [param color] and [param width] and optional antialiasing (supported only for positive [param width]). The larger the value of [param point_count], the smoother the curve. For circular arcs, see [method draw_arc]. See also [method draw_ellipse].  
         *  If [param width] is negative, it will be ignored and the arc will be drawn using [constant RenderingServer.PRIMITIVE_LINE_STRIP]. This means that when the CanvasItem is scaled, the arc will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *  The arc is drawn from [param start_angle] towards the value of [param end_angle] so in clockwise direction if `start_angle < end_angle` and counter-clockwise otherwise. Passing the same angles but in reversed order will produce the same arc. If absolute difference of [param start_angle] and [param end_angle] is greater than [constant @GDScript.TAU] radians, then a full ellipse is drawn (i.e. arc will not overlap itself).  
         */
        drawEllipseArc(center: Vector2, major: float64, minor: float64, startAngle: float64, endAngle: float64, pointCount: int64, color: Color, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws an unfilled arc between the given angles with a uniform [param color] and [param width] and optional antialiasing (supported only for positive [param width]). The larger the value of [param point_count], the smoother the curve. [param center] is defined in local space. For elliptical arcs, see [method draw_ellipse_arc]. See also [method draw_circle].  
         *  If [param width] is negative, it will be ignored and the arc will be drawn using [constant RenderingServer.PRIMITIVE_LINE_STRIP]. This means that when the CanvasItem is scaled, the arc will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *  The arc is drawn from [param start_angle] towards the value of [param end_angle] so in clockwise direction if `start_angle < end_angle` and counter-clockwise otherwise. Passing the same angles but in reversed order will produce the same arc. If absolute difference of [param start_angle] and [param end_angle] is greater than [constant @GDScript.TAU] radians, then a full circle arc is drawn (i.e. arc will not overlap itself).  
         */
        drawArc(center: Vector2, radius: float64, startAngle: float64, endAngle: float64, pointCount: int64, color: Color, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws multiple disconnected lines with a uniform [param width] and [param color]. Each line is defined by two consecutive points from [param points] array in local space, i.e. i-th segment consists of `points[2 * i]`, `points[2 * i + 1]` endpoints. When drawing large amounts of lines, this is faster than using individual [method draw_line] calls. To draw interconnected lines, use [method draw_polyline] instead.  
         *  If [param width] is negative, then two-point primitives will be drawn instead of four-point ones. This means that when the CanvasItem is scaled, the lines will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *      
         *  **Note:** [param antialiased] is only effective if [param width] is greater than `0.0`.  
         */
        drawMultiline(points: PackedVector2Array | Vector2[], color: Color, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws multiple disconnected lines with a uniform [param width] and segment-by-segment coloring. Each segment is defined by two consecutive points from [param points] array in local space and a corresponding color from [param colors] array, i.e. i-th segment consists of `points[2 * i]`, `points[2 * i + 1]` endpoints and has `colors *` color. When drawing large amounts of lines, this is faster than using individual [method draw_line] calls. To draw interconnected lines, use [method draw_polyline_colors] instead.  
         *  If [param width] is negative, then two-point primitives will be drawn instead of four-point ones. This means that when the CanvasItem is scaled, the lines will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *      
         *  **Note:** [param antialiased] is only effective if [param width] is greater than `0.0`.  
         */
        drawMultilineColors(points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a rectangle. If [param filled] is `true`, the rectangle will be filled with the [param color] specified. If [param filled] is `false`, the rectangle will be drawn as a stroke with the [param color] and [param width] specified. The [param rect] is specified in local space. See also [method draw_texture_rect].  
         *  If [param width] is negative, then two-point primitives will be drawn instead of four-point ones. This means that when the CanvasItem is scaled, the lines will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *  If [param antialiased] is `true`, half transparent "feathers" will be attached to the boundary, making outlines smooth.  
         *      
         *  **Note:** [param width] is only effective if [param filled] is `false`.  
         *      
         *  **Note:** Unfilled rectangles drawn with a negative [param width] may not display perfectly. For example, corners may be missing or brighter due to overlapping lines (for a translucent [param color]).  
         */
        drawRect(rect: Rect2, color: Color, filled?: boolean /* = true */, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a circle, with [param position] defined in local space. See also [method draw_ellipse], [method draw_arc], [method draw_polyline], and [method draw_polygon].  
         *  If [param filled] is `true`, the circle will be filled with the [param color] specified. If [param filled] is `false`, the circle will be drawn as a stroke with the [param color] and [param width] specified.  
         *  If [param width] is negative, then two-point primitives will be drawn instead of four-point ones. This means that when the CanvasItem is scaled, the lines will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *  If [param antialiased] is `true`, half transparent "feathers" will be attached to the boundary, making outlines smooth.  
         *      
         *  **Note:** [param width] is only effective if [param filled] is `false`.  
         */
        drawCircle(position: Vector2, radius: float64, color: Color, filled?: boolean /* = true */, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws an ellipse with semi-major axis [param major] and semi-minor axis [param minor]. See also [method draw_circle], [method draw_ellipse_arc], [method draw_polyline], and [method draw_polygon].  
         *  If [param filled] is `true`, the ellipse will be filled with the [param color] specified. If [param filled] is `false`, the ellipse will be drawn as a stroke with the [param color] and [param width] specified.  
         *  If [param width] is negative, then two-point primitives will be drawn instead of four-point ones. This means that when the CanvasItem is scaled, the lines will remain thin. If this behavior is not desired, then pass a positive [param width] like `1.0`.  
         *  If [param antialiased] is `true`, half transparent "feathers" will be attached to the boundary, making outlines smooth.  
         *      
         *  **Note:** [param width] is only effective if [param filled] is `false`.  
         */
        drawEllipse(position: Vector2, major: float64, minor: float64, color: Color, filled?: boolean /* = true */, width?: float64 /* = -1 */, antialiased?: boolean /* = false */): void
        
        /** Draws a texture at a given position. The [param position] is defined in local space.  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawTexture(texture: Texture2D, position: Vector2, modulate?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Draws a textured rectangle at a given position, optionally modulated by a color. The [param rect] is defined in local space. If [param transpose] is `true`, the texture will have its X and Y coordinates swapped. See also [method draw_rect] and [method draw_texture_rect_region].  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawTextureRect(texture: Texture2D, rect: Rect2, tile: boolean, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */): void
        
        /** Draws a textured rectangle from a texture's region (specified by [param src_rect]) at a given position in local space, optionally modulated by a color. If [param transpose] is `true`, the texture will have its X and Y coordinates swapped. See also [method draw_texture_rect].  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawTextureRectRegion(texture: Texture2D, rect: Rect2, srcRect: Rect2, modulate?: Color /* = new Color(1, 1, 1, 1) */, transpose?: boolean /* = false */, clipUV?: boolean /* = true */): void
        
        /** Draws a textured rectangle region of the multichannel signed distance field texture at a given position, optionally modulated by a color. The [param rect] is defined in local space. See [member FontFile.multichannel_signed_distance_field] for more information and caveats about MSDF font rendering.  
         *  If [param outline] is positive, each alpha channel value of pixel in region is set to maximum value of true distance in the [param outline] radius.  
         *  Value of the [param pixel_range] should the same that was used during distance field texture generation.  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawMsdfTextureRectRegion(texture: Texture2D, rect: Rect2, srcRect: Rect2, modulate?: Color /* = new Color(1, 1, 1, 1) */, outline?: float64 /* = 0 */, pixelRange?: float64 /* = 4 */, scale?: float64 /* = 1 */): void
        
        /** Draws a textured rectangle region of the font texture with LCD subpixel anti-aliasing at a given position, optionally modulated by a color. The [param rect] is defined in local space.  
         *  Texture is drawn using the following blend operation, blend mode of the [CanvasItemMaterial] is ignored:  
         *    
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawLcdTextureRectRegion(texture: Texture2D, rect: Rect2, srcRect: Rect2, modulate?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Draws a styled rectangle. The [param rect] is defined in local space.  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawStyleBox(styleBox: StyleBox, rect: Rect2): void
        
        /** Draws a custom primitive. 1 point for a point, 2 points for a line, 3 points for a triangle, and 4 points for a quad. If 0 points or more than 4 points are specified, nothing will be drawn and an error message will be printed. The [param points] array is defined in local space. See also [method draw_line], [method draw_polyline], [method draw_polygon], and [method draw_rect].  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawPrimitive(points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], uvs: PackedVector2Array | Vector2[], texture?: Texture2D): void
        
        /** Draws a solid polygon of any number of points, convex or concave. Unlike [method draw_colored_polygon], each point's color can be changed individually. The [param points] array is defined in local space. See also [method draw_polyline] and [method draw_polyline_colors]. If you need more flexibility (such as being able to use bones), use [method RenderingServer.canvas_item_add_triangle_array] instead.  
         *      
         *  **Note:** If you frequently redraw the same polygon with a large number of vertices, consider pre-calculating the triangulation with [method Geometry2D.triangulate_polygon] and using [method draw_mesh], [method draw_multimesh], or [method RenderingServer.canvas_item_add_triangle_array].  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawPolygon(points: PackedVector2Array | Vector2[], colors: PackedColorArray | Color[], uvs?: PackedVector2Array | Vector2[] /* = [] */, texture?: Texture2D): void
        
        /** Draws a colored polygon of any number of points, convex or concave. The points in the [param points] array are defined in local space. Unlike [method draw_polygon], a single color must be specified for the whole polygon.  
         *      
         *  **Note:** If you frequently redraw the same polygon with a large number of vertices, consider pre-calculating the triangulation with [method Geometry2D.triangulate_polygon] and using [method draw_mesh], [method draw_multimesh], or [method RenderingServer.canvas_item_add_triangle_array].  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawColoredPolygon(points: PackedVector2Array | Vector2[], color: Color, uvs?: PackedVector2Array | Vector2[] /* = [] */, texture?: Texture2D): void
        
        /** Draws [param text] using the specified [param font] at the [param pos] in local space (bottom-left corner using the baseline of the font). The text will have its color multiplied by [param modulate]. If [param width] is greater than or equal to 0, the text will be clipped if it exceeds the specified width. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used.  
         *  **Example:** Draw "Hello world", using the project's default font:  
         *    
         *  See also [method Font.draw_string].  
         */
        drawString(font: Font, pos: Vector2, text: string, alignment?: HorizontalAlignment /* = 0 */, width?: float64 /* = -1 */, fontSize?: int64 /* = 16 */, modulate?: Color /* = new Color(1, 1, 1, 1) */, justificationFlags?: TextServer.JustificationFlag /* = 3 */, direction?: TextServer.Direction /* = 0 */, orientation?: TextServer.Orientation /* = 0 */, oversampling?: float64 /* = 0 */): void
        
        /** Breaks [param text] into lines and draws it using the specified [param font] at the [param pos] in local space (top-left corner). The text will have its color multiplied by [param modulate]. If [param width] is greater than or equal to 0, the text will be clipped if it exceeds the specified width. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawMultilineString(font: Font, pos: Vector2, text: string, alignment?: HorizontalAlignment /* = 0 */, width?: float64 /* = -1 */, fontSize?: int64 /* = 16 */, maxLines?: int64 /* = -1 */, modulate?: Color /* = new Color(1, 1, 1, 1) */, brkFlags?: TextServer.LineBreakFlag /* = 3 */, justificationFlags?: TextServer.JustificationFlag /* = 3 */, direction?: TextServer.Direction /* = 0 */, orientation?: TextServer.Orientation /* = 0 */, oversampling?: float64 /* = 0 */): void
        
        /** Draws [param text] outline using the specified [param font] at the [param pos] in local space (bottom-left corner using the baseline of the font). The text will have its color multiplied by [param modulate]. If [param width] is greater than or equal to 0, the text will be clipped if it exceeds the specified width. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawStringOutline(font: Font, pos: Vector2, text: string, alignment?: HorizontalAlignment /* = 0 */, width?: float64 /* = -1 */, fontSize?: int64 /* = 16 */, size?: int64 /* = 1 */, modulate?: Color /* = new Color(1, 1, 1, 1) */, justificationFlags?: TextServer.JustificationFlag /* = 3 */, direction?: TextServer.Direction /* = 0 */, orientation?: TextServer.Orientation /* = 0 */, oversampling?: float64 /* = 0 */): void
        
        /** Breaks [param text] to the lines and draws text outline using the specified [param font] at the [param pos] in local space (top-left corner). The text will have its color multiplied by [param modulate]. If [param width] is greater than or equal to 0, the text will be clipped if it exceeds the specified width. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. */
        drawMultilineStringOutline(font: Font, pos: Vector2, text: string, alignment?: HorizontalAlignment /* = 0 */, width?: float64 /* = -1 */, fontSize?: int64 /* = 16 */, maxLines?: int64 /* = -1 */, size?: int64 /* = 1 */, modulate?: Color /* = new Color(1, 1, 1, 1) */, brkFlags?: TextServer.LineBreakFlag /* = 3 */, justificationFlags?: TextServer.JustificationFlag /* = 3 */, direction?: TextServer.Direction /* = 0 */, orientation?: TextServer.Orientation /* = 0 */, oversampling?: float64 /* = 0 */): void
        
        /** Draws a string first character using a custom font. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. [param pos] is defined in local space. */
        drawChar(font: Font, pos: Vector2, char: string, fontSize?: int64 /* = 16 */, modulate?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draws a string first character outline using a custom font. If [param oversampling] is greater than zero, it is used as font oversampling factor, otherwise viewport oversampling settings are used. [param pos] is defined in local space. */
        drawCharOutline(font: Font, pos: Vector2, char: string, fontSize?: int64 /* = 16 */, size?: int64 /* = -1 */, modulate?: Color /* = new Color(1, 1, 1, 1) */, oversampling?: float64 /* = 0 */): void
        
        /** Draws a [Mesh] in 2D, using the provided texture. See [MeshInstance2D] for related documentation. The [param transform] is defined in local space.  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawMesh(mesh: Mesh, texture: Texture2D, transform?: Transform2D /* = new Transform2D() */, modulate?: Color /* = new Color(1, 1, 1, 1) */): void
        
        /** Draws a [MultiMesh] in 2D with the provided texture. See [MultiMeshInstance2D] for related documentation.  
         *      
         *  **Note:** Styleboxes, textures, and meshes stored only inside local variables should **not** be used with this method in GDScript, because the drawing operation doesn't begin immediately once this method is called. In GDScript, when the function with the local variables ends, the local variables get destroyed before the rendering takes place.  
         */
        drawMultimesh(multimesh: MultiMesh, texture: Texture2D): void
        
        /** Sets a custom local transform for drawing via components. Anything drawn afterwards will be transformed by this.  
         *      
         *  **Note:** [member FontFile.oversampling] does  *not*  take [param scale] into account. This means that scaling up/down will cause bitmap fonts and rasterized (non-MSDF) dynamic fonts to appear blurry or pixelated. To ensure text remains crisp regardless of scale, you can enable MSDF font rendering by enabling [member ProjectSettings.gui/theme/default_font_multichannel_signed_distance_field] (applies to the default project font only), or enabling **Multichannel Signed Distance Field** in the import options of a DynamicFont for custom fonts. On system fonts, [member SystemFont.multichannel_signed_distance_field] can be enabled in the inspector.  
         */
        drawSetTransform(position: Vector2, rotation?: float64 /* = 0 */, scale?: Vector2 /* = Vector2.ONE */): void
        
        /** Sets a custom local transform for drawing via matrix. Anything drawn afterwards will be transformed by this. */
        drawSetTransformMatrix(xform: Transform2D): void
        
        /** Subsequent drawing commands will be ignored unless they fall within the specified animation slice. This is a faster way to implement animations that loop on background rather than redrawing constantly. */
        drawAnimationSlice(animationLength: float64, sliceBegin: float64, sliceEnd: float64, offset?: float64 /* = 0 */): void
        
        /** After submitting all animations slices via [method draw_animation_slice], this function can be used to revert drawing to its default state (all subsequent drawing commands will be visible). If you don't care about this particular use case, usage of this function after submitting the slices is not required. */
        drawEndAnimation(): void
        
        /** Returns the transform matrix of this [CanvasItem]. */
        getTransform(): Transform2D
        
        /** Returns the global transform matrix of this item, i.e. the combined transform up to the topmost [CanvasItem] node. The topmost item is a [CanvasItem] that either has no parent, has non-[CanvasItem] parent or it has [member top_level] enabled. */
        getGlobalTransform(): Transform2D
        
        /** Returns the transform from the local coordinate system of this [CanvasItem] to the [Viewport]'s coordinate system. */
        getGlobalTransformWithCanvas(): Transform2D
        
        /** Returns the transform of this node, converted from its registered canvas's coordinate system to its viewport embedder's coordinate system. See also [method Viewport.get_final_transform] and [method Node.get_viewport]. */
        getViewportTransform(): Transform2D
        
        /** Returns this node's viewport boundaries as a [Rect2]. See also [method Node.get_viewport]. */
        getViewportRect(): Rect2
        
        /** Returns the transform of this node, converted from its registered canvas's coordinate system to its viewport's coordinate system. See also [method Node.get_viewport]. */
        getCanvasTransform(): Transform2D
        
        /** Returns the transform of this [CanvasItem] in global screen coordinates (i.e. taking window position into account). Mostly useful for editor plugins.  
         *  Equivalent to [method get_global_transform_with_canvas] if the window is embedded (see [member Viewport.gui_embed_subwindows]).  
         */
        getScreenTransform(): Transform2D
        
        /** Returns the mouse's position in this [CanvasItem] using the local coordinate system of this [CanvasItem]. */
        getLocalMousePosition(): Vector2
        
        /** Returns mouse cursor's global position relative to the [CanvasLayer] that contains this node.  
         *      
         *  **Note:** For screen-space coordinates (e.g. when using a non-embedded [Popup]), you can use [method DisplayServer.mouse_get_position].  
         */
        getGlobalMousePosition(): Vector2
        
        /** Returns the [RID] of the [World2D] canvas where this node is registered to, used by the [RenderingServer]. */
        getCanvas(): Rid
        
        /** Returns the [CanvasLayer] that contains this node, or `null` if the node is not in any [CanvasLayer]. */
        getCanvasLayerNode(): null | CanvasLayer
        
        /** Returns the [World2D] this node is registered to.  
         *  Usually, this is the same as this node's viewport (see [method Node.get_viewport] and [method Viewport.find_world_2d]).  
         */
        getWorld2D(): null | World2D
        
        /** Set the value of a shader uniform for this instance only ([url=https://docs.godotengine.org/en/latest/tutorials/shaders/shader_reference/shading_language.html#per-instance-uniforms]per-instance uniform[/url]). See also [method ShaderMaterial.set_shader_parameter] to assign a uniform on all instances using the same [ShaderMaterial].  
         *      
         *  **Note:** For a shader uniform to be assignable on a per-instance basis, it  *must*  be defined with `instance uniform ...` rather than `uniform ...` in the shader code.  
         *      
         *  **Note:** [param name] is case-sensitive and must match the name of the uniform in the code exactly (not the capitalized name in the inspector).  
         */
        setInstanceShaderParameter(name: StringName, value: any): void
        
        /** Get the value of a shader parameter as set on this instance. */
        getInstanceShaderParameter(name: StringName): any
        
        /** If `true`, the node will receive [constant NOTIFICATION_LOCAL_TRANSFORM_CHANGED] whenever its local transform changes.  
         *      
         *  **Note:** Many canvas items such as [Bone2D] or [CollisionShape2D] automatically enable this in order to function correctly.  
         */
        setNotifyLocalTransform(enable: boolean): void
        
        /** Returns `true` if the node receives [constant NOTIFICATION_LOCAL_TRANSFORM_CHANGED] whenever its local transform changes. This is enabled with [method set_notify_local_transform]. */
        isLocalTransformNotificationEnabled(): boolean
        
        /** If `true`, the node will receive [constant NOTIFICATION_TRANSFORM_CHANGED] whenever its global transform changes.  
         *      
         *  **Note:** Many canvas items such as [Camera2D] or [Light2D] automatically enable this in order to function correctly.  
         */
        setNotifyTransform(enable: boolean): void
        
        /** Returns `true` if the node receives [constant NOTIFICATION_TRANSFORM_CHANGED] whenever its global transform changes. This is enabled with [method set_notify_transform]. */
        isTransformNotificationEnabled(): boolean
        
        /** Forces the node's transform to update. Fails if the node is not inside the tree. See also [method get_transform].  
         *      
         *  **Note:** For performance reasons, transform changes are usually accumulated and applied  *once*  at the end of the frame. The update propagates through [CanvasItem] children, as well. Therefore, use this method only when you need an up-to-date transform (such as during physics operations).  
         */
        forceUpdateTransform(): void
        
        /** Transforms [param viewport_point] from the viewport's coordinates to this node's local coordinates.  
         *  For the opposite operation, use [method get_global_transform_with_canvas].  
         *    
         */
        makeCanvasPositionLocal(viewportPoint: Vector2): Vector2
        
        /** Returns a copy of the given [param event] with its coordinates converted from global space to this [CanvasItem]'s local space. If not possible, returns the same [InputEvent] unchanged. */
        makeInputLocal(event: InputEvent): null | InputEvent
        
        /** Set/clear individual bits on the rendering visibility layer ([param layer] is between `0` and `31`). This simplifies editing this [CanvasItem]'s visibility layer compared to assigning the [member visibility_layer] property directly. */
        setVisibilityLayerBit(layer: int64, enabled: boolean): void
        
        /** Returns `true` if the layer at the given index is set in [member visibility_layer]. */
        getVisibilityLayerBit(layer: int64): boolean
        
        /** If `true`, this [CanvasItem] may be drawn. Whether this [CanvasItem] is actually drawn depends on the visibility of all of its [CanvasItem] ancestors. In other words: this [CanvasItem] will be drawn when [method is_visible_in_tree] returns `true` and all [CanvasItem] ancestors share at least one [member visibility_layer] with this [CanvasItem].  
         *      
         *  **Note:** For controls that inherit [Popup], the correct way to make them visible is to call one of the multiple `popup*()` functions instead.  
         */
        get visible(): boolean
        set visible(value: boolean)
        
        /** The color applied to this [CanvasItem]. This property does affect child [CanvasItem]s, unlike [member self_modulate] which only affects the node itself. */
        get modulate(): Color
        set modulate(value: Color)
        
        /** The color applied to this [CanvasItem]. This property does **not** affect child [CanvasItem]s, unlike [member modulate] which affects both the node itself and its children.  
         *      
         *  **Note:** Internal children are also not affected by this property (see the `include_internal` parameter in [method Node.add_child]). For built-in nodes this includes sliders in [ColorPicker], and the tab bar in [TabContainer].  
         */
        get selfModulate(): Color
        set selfModulate(value: Color)
        
        /** If `true`, this node draws behind its parent. */
        get showBehindParent(): boolean
        set showBehindParent(value: boolean)
        
        /** If `true`, this [CanvasItem] will  *not*  inherit its transform from parent [CanvasItem]s. Its draw order will also be changed to make it draw on top of other [CanvasItem]s that do not have [member top_level] set to `true`. The [CanvasItem] will effectively act as if it was placed as a child of a bare [Node]. */
        get topLevel(): boolean
        set topLevel(value: boolean)
        
        /** The mode in which this node clips its children, acting as a mask.  
         *      
         *  **Note:** Clipping nodes cannot be nested or placed within a [CanvasGroup]. If an ancestor of this node clips its children or is a [CanvasGroup], then this node's clip mode should be set to [constant CLIP_CHILDREN_DISABLED] to avoid unexpected behavior.  
         */
        get clipChildren(): int64
        set clipChildren(value: int64)
        
        /** If enabled, oversampling for this [CanvasItem] is automatically adjusted with scale. This makes fonts and [DPITexture] images automatically re-render to match the actual scale they are drawn at, for crisper visuals. This has a performance impact on the CPU every time the node's scale changes, so it is disabled by default.  
         *      
         *  **Note:** For [Control] nodes with [member Control.offset_transform_enabled] set to `true`, scale-based oversampling is only effective if [member Control.offset_transform_visual_only] is `false`. This ensures there is no performance overhead when using visual-only offset transforms (as often used in animations).  
         */
        get oversamplingWithScale(): int64
        set oversamplingWithScale(value: int64)
        
        /** The rendering layers in which this [CanvasItem] responds to [Light2D] nodes. */
        get lightMask(): int64
        set lightMask(value: int64)
        
        /** The rendering layer in which this [CanvasItem] is rendered by [Viewport] nodes. A [Viewport] will render a [CanvasItem] if it and all its parents share a layer with the [Viewport]'s canvas cull mask. For an easier way to change this value from a script, see [method set_visibility_layer_bit].  
         *      
         *  **Note:** A [CanvasItem] does not inherit its parents' visibility layers. This means that if a parent [CanvasItem] does not have all the same layers as its child, the child may not be visible even if both the parent and child have [member visible] set to `true`. For example, if a parent has layer 1 and a child has layer 2, the child will not be visible in a [Viewport] with the canvas cull mask set to layer 1 or 2 (see [member Viewport.canvas_cull_mask]). To ensure that both the parent and child are visible, the parent must have both layers 1 and 2, or the child must have [member top_level] set to `true`.  
         */
        get visibilityLayer(): int64
        set visibilityLayer(value: int64)
        
        /** The order in which this node is drawn. A node with a higher Z index will display in front of others. Must be between [constant RenderingServer.CANVAS_ITEM_Z_MIN] and [constant RenderingServer.CANVAS_ITEM_Z_MAX] (inclusive).  
         *      
         *  **Note:** The Z index does **not** affect the order in which [CanvasItem] nodes are processed, or the way input events are handled. This is especially important to keep in mind for [Control] nodes.  
         */
        get zIndex(): int64
        set zIndex(value: int64)
        
        /** If `true`, this node's final Z index is relative to its parent's Z index.  
         *  For example, if [member z_index] is `2` and its parent's final Z index is `3`, then this node's final Z index will be `5` (`2 + 3`).  
         */
        get zAsRelative(): boolean
        set zAsRelative(value: boolean)
        
        /** If `true`, this and child [CanvasItem] nodes with a higher Y position are rendered in front of nodes with a lower Y position. If `false`, this and child [CanvasItem] nodes are rendered normally in scene tree order.  
         *  With Y-sorting enabled on a parent node ('A') but disabled on a child node ('B'), the child node ('B') is sorted but its children ('C1', 'C2', etc.) render together on the same Y position as the child node ('B'). This allows you to organize the render order of a scene without changing the scene tree.  
         *  Nodes sort relative to each other only if they are on the same [member z_index].  
         *      
         *  **Note:** Y-sorting does **not** affect the order in which [CanvasItem] nodes are processed, or the way input events are handled. This is especially important to keep in mind for [Control] nodes.  
         */
        get ySortEnabled(): boolean
        set ySortEnabled(value: boolean)
        
        /** The filtering mode used to render this [CanvasItem]'s texture(s). */
        get textureFilter(): int64
        set textureFilter(value: int64)
        
        /** The repeating mode used to render this [CanvasItem]'s texture(s). It affects what happens when the texture is sampled outside its extents, for example by setting a [member Sprite2D.region_rect] that is larger than the texture or assigning [Polygon2D] UV points outside the texture.  
         *      
         *  **Note:** [TextureRect] is not affected by [member texture_repeat], as it uses its own texture repeating implementation.  
         */
        get textureRepeat(): int64
        set textureRepeat(value: int64)
        
        /** The material applied to this [CanvasItem]. */
        get material(): null | CanvasItemMaterial | ShaderMaterial
        set material(value: null | CanvasItemMaterial | ShaderMaterial)
        
        /** If `true`, the parent [CanvasItem]'s [member material] is used as this node's material. */
        get useParentMaterial(): boolean
        set useParentMaterial(value: boolean)
        
        /** Emitted when the [CanvasItem] must redraw,  *after*  the related [constant NOTIFICATION_DRAW] notification, and  *before*  [method _draw] is called.  
         *      
         *  **Note:** Deferred connections do not allow drawing through the `draw_*` methods.  
         */
        readonly draw: Signal<() => void>
        
        /** Emitted when the [CanvasItem]'s visibility changes, either because its own [member visible] property changed or because its visibility in the tree changed (see [method is_visible_in_tree]).  
         *  This signal is emitted  *after*  the related [constant NOTIFICATION_VISIBILITY_CHANGED] notification.  
         */
        readonly visibilityChanged: Signal<() => void>
        
        /** Emitted when this node becomes hidden, i.e. it's no longer visible in the tree (see [method is_visible_in_tree]). */
        readonly hidden: Signal<() => void>
        
        /** Emitted when the [CanvasItem]'s boundaries (position or size) change, or when an action took place that may have affected these boundaries (e.g. changing [member Sprite2D.texture]). */
        readonly itemRectChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCanvasItem;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCanvasItem;
    }
    namespace CanvasItemMaterial {
        enum BlendMode {
            BlendModeMix = 0,
            BlendModeAdd = 1,
            BlendModeSub = 2,
            BlendModeMul = 3,
            BlendModePremultAlpha = 4,
        }
        enum LightMode {
            LightModeNormal = 0,
            LightModeUnshaded = 1,
            LightModeLightOnly = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCanvasItemMaterial extends __RPCMapMaterial {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCanvasItemMaterial extends __NameMapMaterial {
        blend_mode: "blendMode";
        light_mode: "lightMode";
        particles_animation: "particlesAnimation";
        particles_anim_h_frames: "particlesAnimHFrames";
        particles_anim_v_frames: "particlesAnimVFrames";
        particles_anim_loop: "particlesAnimLoop";
    }
    /** A material for [CanvasItem]s.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_canvasitemmaterial.html  
     */
    class CanvasItemMaterial extends Material {
        constructor(identifier?: any)
        /** The manner in which a material's rendering is applied to underlying textures. */
        get blendMode(): int64
        set blendMode(value: int64)
        
        /** The manner in which material reacts to lighting. */
        get lightMode(): int64
        set lightMode(value: int64)
        
        /** If `true`, enable spritesheet-based animation features when assigned to [GPUParticles2D] and [CPUParticles2D] nodes. The [member ParticleProcessMaterial.anim_speed_max] or [member CPUParticles2D.anim_speed_max] should also be set to a positive value for the animation to play.  
         *  This property (and other `particles_anim_*` properties that depend on it) has no effect on other types of nodes.  
         */
        get particlesAnimation(): boolean
        set particlesAnimation(value: boolean)
        
        /** The number of columns in the spritesheet assigned as [Texture2D] for a [GPUParticles2D] or [CPUParticles2D].  
         *      
         *  **Note:** This property is only used and visible in the editor if [member particles_animation] is `true`.  
         */
        get particlesAnimHFrames(): int64
        set particlesAnimHFrames(value: int64)
        
        /** The number of rows in the spritesheet assigned as [Texture2D] for a [GPUParticles2D] or [CPUParticles2D].  
         *      
         *  **Note:** This property is only used and visible in the editor if [member particles_animation] is `true`.  
         */
        get particlesAnimVFrames(): int64
        set particlesAnimVFrames(value: int64)
        
        /** If `true`, the particles animation will loop.  
         *      
         *  **Note:** This property is only used and visible in the editor if [member particles_animation] is `true`.  
         */
        get particlesAnimLoop(): boolean
        set particlesAnimLoop(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCanvasItemMaterial;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCanvasItemMaterial;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCanvasLayer extends __RPCMapNode {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCanvasLayer extends __NameMapNode {
        get_final_transform: "getFinalTransform";
        get_canvas: "getCanvas";
        custom_viewport: "customViewport";
        follow_viewport_enabled: "followViewportEnabled";
        follow_viewport_scale: "followViewportScale";
        visibility_changed: "visibilityChanged";
    }
    /** A node used for independent rendering of objects within a 2D scene.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_canvaslayer.html  
     */
    class CanvasLayer<Map extends NodePathMap = any> extends Node<Map> {
        constructor(identifier?: any)
        /** Shows any [CanvasItem] under this [CanvasLayer]. This is equivalent to setting [member visible] to `true`. */
        show(): void
        
        /** Hides any [CanvasItem] under this [CanvasLayer]. This is equivalent to setting [member visible] to `false`. */
        hide(): void
        
        /** Returns the transform from the [CanvasLayer]'s coordinate system to the [Viewport]'s coordinate system. */
        getFinalTransform(): Transform2D
        
        /** Returns the RID of the canvas used by this layer. */
        getCanvas(): Rid
        
        /** Layer index for draw order. Lower values are drawn behind higher values.  
         *      
         *  **Note:** If multiple CanvasLayers have the same layer index, [CanvasItem] children of one CanvasLayer are drawn behind the [CanvasItem] children of the other CanvasLayer. Which CanvasLayer is drawn in front is non-deterministic.  
         *      
         *  **Note:** The layer index should be between [constant RenderingServer.CANVAS_LAYER_MIN] and [constant RenderingServer.CANVAS_LAYER_MAX] (inclusive). Any other value will wrap around.  
         */
        get layer(): int64
        set layer(value: int64)
        
        /** If `false`, any [CanvasItem] under this [CanvasLayer] will be hidden.  
         *  Unlike [member CanvasItem.visible], visibility of a [CanvasLayer] isn't propagated to underlying layers.  
         */
        get visible(): boolean
        set visible(value: boolean)
        
        /** The layer's base offset. */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** The layer's rotation in radians. */
        get rotation(): float64
        set rotation(value: float64)
        
        /** The layer's scale. */
        get scale(): Vector2
        set scale(value: Vector2)
        
        /** The layer's transform. */
        get transform(): Transform2D
        set transform(value: Transform2D)
        
        /** The custom [Viewport] node assigned to the [CanvasLayer]. If `null`, uses the default viewport instead. */
        get customViewport(): null | Viewport
        set customViewport(value: null | Viewport)
        
        /** If enabled, the [CanvasLayer] maintains its position in world space. If disabled, the [CanvasLayer] stays in a fixed position on the screen.  
         *  Together with [member follow_viewport_scale], this can be used for a pseudo-3D effect.  
         */
        get followViewportEnabled(): boolean
        set followViewportEnabled(value: boolean)
        
        /** Scales the layer when using [member follow_viewport_enabled]. Layers moving into the foreground should have increasing scales, while layers moving into the background should have decreasing scales. */
        get followViewportScale(): float64
        set followViewportScale(value: float64)
        
        /** Emitted when visibility of the layer is changed. See [member visible]. */
        readonly visibilityChanged: Signal<() => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCanvasLayer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCanvasLayer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCanvasModulate extends __RPCMapNode2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCanvasModulate extends __NameMapNode2D {
    }
    /** A node that applies a color tint to a canvas.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_canvasmodulate.html  
     */
    class CanvasModulate<Map extends NodePathMap = any> extends Node2D<Map> {
        constructor(identifier?: any)
        /** The tint color to apply. */
        get color(): Color
        set color(value: Color)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCanvasModulate;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCanvasModulate;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCanvasTexture extends __RPCMapTexture2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCanvasTexture extends __NameMapTexture2D {
        diffuse_texture: "diffuseTexture";
        normal_texture: "normalTexture";
        specular_texture: "specularTexture";
        specular_color: "specularColor";
        specular_shininess: "specularShininess";
        texture_filter: "textureFilter";
        texture_repeat: "textureRepeat";
    }
    /** Texture with optional normal and specular maps for use in 2D rendering.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_canvastexture.html  
     */
    class CanvasTexture extends Texture2D {
        constructor(identifier?: any)
        /** The diffuse (color) texture to use. This is the main texture you want to set in most cases. */
        get diffuseTexture(): null | Texture2D
        set diffuseTexture(value: null | Texture2D)
        
        /** The normal map texture to use. Only has a visible effect if [Light2D]s are affecting this [CanvasTexture].  
         *      
         *  **Note:** Godot expects the normal map to use X+, Y+, and Z+ coordinates. See [url=http://wiki.polycount.com/wiki/Normal_Map_Technical_Details#Common_Swizzle_Coordinates]this page[/url] for a comparison of normal map coordinates expected by popular engines.  
         */
        get normalTexture(): null | Texture2D
        set normalTexture(value: null | Texture2D)
        
        /** The specular map to use for [Light2D] specular reflections. This should be a grayscale or colored texture, with brighter areas resulting in a higher [member specular_shininess] value. Using a colored [member specular_texture] allows controlling specular shininess on a per-channel basis. Only has a visible effect if [Light2D]s are affecting this [CanvasTexture]. */
        get specularTexture(): null | Texture2D
        set specularTexture(value: null | Texture2D)
        
        /** The multiplier for specular reflection colors. The [Light2D]'s color is also taken into account when determining the reflection color. Only has a visible effect if [Light2D]s are affecting this [CanvasTexture]. */
        get specularColor(): Color
        set specularColor(value: Color)
        
        /** The specular exponent for [Light2D] specular reflections. Higher values result in a more glossy/"wet" look, with reflections becoming more localized and less visible overall. The default value of `1.0` disables specular reflections entirely. Only has a visible effect if [Light2D]s are affecting this [CanvasTexture]. */
        get specularShininess(): float64
        set specularShininess(value: float64)
        
        /** The texture filtering mode to use when drawing this [CanvasTexture]. */
        get textureFilter(): int64
        set textureFilter(value: int64)
        
        /** The texture repeat mode to use when drawing this [CanvasTexture]. */
        get textureRepeat(): int64
        set textureRepeat(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCanvasTexture;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCanvasTexture;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCapsuleMesh extends __RPCMapPrimitiveMesh {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCapsuleMesh extends __NameMapPrimitiveMesh {
        radial_segments: "radialSegments";
    }
    /** Class representing a capsule-shaped [PrimitiveMesh].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_capsulemesh.html  
     */
    class CapsuleMesh extends PrimitiveMesh {
        constructor(identifier?: any)
        /** Radius of the capsule mesh.  
         *      
         *  **Note:** The [member radius] of a capsule cannot be greater than half of its [member height]. Otherwise, the capsule becomes a circle. If the [member radius] is greater than half of the [member height], the properties adjust to a valid value.  
         */
        get radius(): float64
        set radius(value: float64)
        
        /** Total height of the capsule mesh (including the hemispherical ends).  
         *      
         *  **Note:** The [member height] of a capsule must be at least twice its [member radius]. Otherwise, the capsule becomes a circle. If the [member height] is less than twice the [member radius], the properties adjust to a valid value.  
         */
        get height(): float64
        set height(value: float64)
        
        /** Number of radial segments on the capsule mesh. */
        get radialSegments(): int64
        set radialSegments(value: int64)
        
        /** Number of rings along the height of the capsule. */
        get rings(): int64
        set rings(value: int64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCapsuleMesh;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCapsuleMesh;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCapsuleShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCapsuleShape2D extends __NameMapShape2D {
        mid_height: "midHeight";
    }
    /** A 2D capsule shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_capsuleshape2d.html  
     */
    class CapsuleShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The capsule's radius.  
         *      
         *  **Note:** The [member radius] of a capsule cannot be greater than half of its [member height]. Otherwise, the capsule becomes a circle. If the [member radius] is greater than half of the [member height], the properties adjust to a valid value.  
         */
        get radius(): float64
        set radius(value: float64)
        
        /** The capsule's full height, including the semicircles.  
         *      
         *  **Note:** The [member height] of a capsule must be at least twice its [member radius]. Otherwise, the capsule becomes a circle. If the [member height] is less than twice the [member radius], the properties adjust to a valid value.  
         */
        get height(): float64
        set height(value: float64)
        
        /** The capsule's height, excluding the semicircles. This is the height of the central rectangular part in the middle of the capsule, and is the distance between the centers of the two semicircles. This is a wrapper for [member height]. */
        get midHeight(): float64
        set midHeight(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCapsuleShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCapsuleShape2D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCapsuleShape3D extends __RPCMapShape3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCapsuleShape3D extends __NameMapShape3D {
        mid_height: "midHeight";
    }
    /** A 3D capsule shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_capsuleshape3d.html  
     */
    class CapsuleShape3D extends Shape3D {
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
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCapsuleShape3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCapsuleShape3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCenterContainer extends __RPCMapContainer {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCenterContainer extends __NameMapContainer {
        use_top_left: "useTopLeft";
    }
    /** A container that keeps child controls in its center.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_centercontainer.html  
     */
    class CenterContainer<Map extends NodePathMap = any> extends Container<Map> {
        constructor(identifier?: any)
        /** If `true`, centers children relative to the [CenterContainer]'s top left corner. */
        get useTopLeft(): boolean
        set useTopLeft(value: boolean)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCenterContainer;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCenterContainer;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapChainIK3D extends __RPCMapIKModifier3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapChainIK3D extends __NameMapIKModifier3D {
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
        get_joint_bone_name: "getJointBoneName";
        get_joint_bone: "getJointBone";
        get_joint_count: "getJointCount";
    }
    /** A [SkeletonModifier3D] to apply inverse kinematics to bone chains containing an arbitrary number of bones.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_chainik3d.html  
     */
    class ChainIK3D<Map extends NodePathMap = any> extends IKModifier3D<Map> {
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
         *  **Note:** The end bone must be the root bone or a child of the root bone. If they are the same, the tail must be extended by [method set_extend_end_bone] to modify the bone.  
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
        
        /** Returns the bone name at [param joint] in the bone chain's joint list. */
        getJointBoneName(index: int64, joint: int64): string
        
        /** Returns the bone index at [param joint] in the bone chain's joint list. */
        getJointBone(index: int64, joint: int64): int64
        
        /** Returns the joint count of the bone chain's joint list. */
        getJointCount(index: int64): int64
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapChainIK3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapChainIK3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCharFXTransform extends __RPCMapRefCounted {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCharFXTransform extends __NameMapRefCounted {
        elapsed_time: "elapsedTime";
        glyph_index: "glyphIndex";
        glyph_count: "glyphCount";
        glyph_flags: "glyphFlags";
        relative_index: "relativeIndex";
    }
    /** Controls how an individual character will be displayed in a [RichTextEffect].  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_charfxtransform.html  
     */
    class CharFXTransform extends RefCounted {
        constructor(identifier?: any)
        /** The current transform of the current glyph. It can be overridden (for example, by driving the position and rotation from a curve). You can also alter the existing value to apply transforms on top of other effects. */
        get transform(): Transform2D
        set transform(value: Transform2D)
        
        /** Absolute character range in the string, corresponding to the glyph.  
         *      
         *  **Note:** Read-only. Setting this property won't affect drawing.  
         */
        get range(): Vector2I
        set range(value: Vector2I)
        
        /** The time elapsed since the [RichTextLabel] was added to the scene tree (in seconds). Time stops when the [RichTextLabel] is paused (see [member Node.process_mode]). Resets when the text in the [RichTextLabel] is changed.  
         *      
         *  **Note:** Time still passes while the [RichTextLabel] is hidden.  
         */
        get elapsedTime(): float64
        set elapsedTime(value: float64)
        
        /** If `true`, the character will be drawn. If `false`, the character will be hidden. Characters around hidden characters will reflow to take the space of hidden characters. If this is not desired, set their [member color] to `Color(1, 1, 1, 0)` instead. */
        get visible(): boolean
        set visible(value: boolean)
        
        /** If `true`, FX transform is called for outline drawing.  
         *      
         *  **Note:** Read-only. Setting this property won't affect drawing.  
         */
        get outline(): boolean
        set outline(value: boolean)
        
        /** The position offset the character will be drawn with (in pixels). */
        get offset(): Vector2
        set offset(value: Vector2)
        
        /** The color the character will be drawn with. */
        get color(): Color
        set color(value: Color)
        
        /** Contains the arguments passed in the opening BBCode tag. By default, arguments are strings; if their contents match a type such as [bool], [int] or [float], they will be converted automatically. Color codes in the form `#rrggbb` or `#rgb` will be converted to an opaque [Color]. String arguments may not contain spaces, even if they're quoted. If present, quotes will also be present in the final string.  
         *  For example, the opening BBCode tag `[example foo=hello bar=true baz=42 color=#ffffff]` will map to the following [Dictionary]:  
         *    
         */
        get env(): GDictionary
        set env(value: GDictionary)
        
        /** Glyph index specific to the [member font]. If you want to replace this glyph, use [method TextServer.font_get_glyph_index] with [member font] to get a new glyph index for a single character. */
        get glyphIndex(): int64
        set glyphIndex(value: int64)
        
        /** Number of glyphs in the grapheme cluster. This value is set in the first glyph of a cluster.  
         *      
         *  **Note:** Read-only. Setting this property won't affect drawing.  
         */
        get glyphCount(): int64
        set glyphCount(value: int64)
        
        /** Glyph flags. See [enum TextServer.GraphemeFlag] for more info.  
         *      
         *  **Note:** Read-only. Setting this property won't affect drawing.  
         */
        get glyphFlags(): int64
        set glyphFlags(value: int64)
        
        /** The character offset of the glyph, relative to the current [RichTextEffect] custom block.  
         *      
         *  **Note:** Read-only. Setting this property won't affect drawing.  
         */
        get relativeIndex(): int64
        set relativeIndex(value: int64)
        
        /** [TextServer] RID of the font used to render glyph, this value can be used with `TextServer.font_*` methods to retrieve font information.  
         *      
         *  **Note:** Read-only. Setting this property won't affect drawing.  
         */
        get font(): Rid
        set font(value: Rid)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCharFXTransform;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCharFXTransform;
    }
    namespace CharacterBody2D {
        enum MotionMode {
            MotionModeGrounded = 0,
            MotionModeFloating = 1,
        }
        enum PlatformOnLeave {
            PlatformOnLeaveAddVelocity = 0,
            PlatformOnLeaveAddUpwardVelocity = 1,
            PlatformOnLeaveDoNothing = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCharacterBody2D extends __RPCMapPhysicsBody2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCharacterBody2D extends __NameMapPhysicsBody2D {
        move_and_slide: "moveAndSlide";
        apply_floor_snap: "applyFloorSnap";
        is_on_floor: "isOnFloor";
        is_on_floor_only: "isOnFloorOnly";
        is_on_ceiling: "isOnCeiling";
        is_on_ceiling_only: "isOnCeilingOnly";
        is_on_wall: "isOnWall";
        is_on_wall_only: "isOnWallOnly";
        get_floor_normal: "getFloorNormal";
        get_wall_normal: "getWallNormal";
        get_last_motion: "getLastMotion";
        get_position_delta: "getPositionDelta";
        get_real_velocity: "getRealVelocity";
        get_floor_angle: "getFloorAngle";
        get_platform_velocity: "getPlatformVelocity";
        get_slide_collision_count: "getSlideCollisionCount";
        get_slide_collision: "getSlideCollision";
        get_last_slide_collision: "getLastSlideCollision";
        motion_mode: "motionMode";
        up_direction: "upDirection";
        slide_on_ceiling: "slideOnCeiling";
        max_slides: "maxSlides";
        wall_min_slide_angle: "wallMinSlideAngle";
        floor_stop_on_slope: "floorStopOnSlope";
        floor_constant_speed: "floorConstantSpeed";
        floor_block_on_wall: "floorBlockOnWall";
        floor_max_angle: "floorMaxAngle";
        floor_snap_length: "floorSnapLength";
        platform_on_leave: "platformOnLeave";
        platform_floor_layers: "platformFloorLayers";
        platform_wall_layers: "platformWallLayers";
        safe_margin: "safeMargin";
    }
    /** A 2D physics body specialized for characters moved by script.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_characterbody2d.html  
     */
    class CharacterBody2D<Map extends NodePathMap = any> extends PhysicsBody2D<Map> {
        constructor(identifier?: any)
        /** Moves the body based on [member velocity]. If the body collides with another, it will slide along the other body (by default only on floor) rather than stop immediately. If the other body is a [CharacterBody2D] or [RigidBody2D], it will also be affected by the motion of the other body. You can use this to make moving and rotating platforms, or to make nodes push other nodes.  
         *  This method should be used in [method Node._physics_process] (or in a method called by [method Node._physics_process]), as it uses the physics step's `delta` value automatically in calculations. Otherwise, the simulation will run at an incorrect speed.  
         *  Modifies [member velocity] if a slide collision occurred. To get the latest collision call [method get_last_slide_collision], for detailed information about collisions that occurred, use [method get_slide_collision].  
         *  When the body touches a moving platform, the platform's velocity is automatically added to the body motion. If a collision occurs due to the platform's motion, it will always be first in the slide collisions.  
         *  The general behavior and available properties change according to the [member motion_mode].  
         *  Returns `true` if the body collided, otherwise, returns `false`.  
         */
        moveAndSlide(): boolean
        
        /** Allows to manually apply a snap to the floor regardless of the body's velocity. This function does nothing when [method is_on_floor] returns `true`. */
        applyFloorSnap(): void
        
        /** Returns `true` if the body collided with the floor on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "floor" or not. */
        isOnFloor(): boolean
        
        /** Returns `true` if the body collided only with the floor on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "floor" or not. */
        isOnFloorOnly(): boolean
        
        /** Returns `true` if the body collided with the ceiling on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "ceiling" or not. */
        isOnCeiling(): boolean
        
        /** Returns `true` if the body collided only with the ceiling on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "ceiling" or not. */
        isOnCeilingOnly(): boolean
        
        /** Returns `true` if the body collided with a wall on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "wall" or not. */
        isOnWall(): boolean
        
        /** Returns `true` if the body collided only with a wall on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "wall" or not. */
        isOnWallOnly(): boolean
        
        /** Returns the collision normal of the floor at the last collision point. Only valid after calling [method move_and_slide] and when [method is_on_floor] returns `true`.  
         *  **Warning:** The collision normal is not always the same as the surface normal.  
         */
        getFloorNormal(): Vector2
        
        /** Returns the collision normal of the wall at the last collision point. Only valid after calling [method move_and_slide] and when [method is_on_wall] returns `true`.  
         *  **Warning:** The collision normal is not always the same as the surface normal.  
         */
        getWallNormal(): Vector2
        
        /** Returns the last motion applied to the [CharacterBody2D] during the last call to [method move_and_slide]. The movement can be split into multiple motions when sliding occurs, and this method return the last one, which is useful to retrieve the current direction of the movement. */
        getLastMotion(): Vector2
        
        /** Returns the travel (position delta) that occurred during the last call to [method move_and_slide]. */
        getPositionDelta(): Vector2
        
        /** Returns the current real velocity since the last call to [method move_and_slide]. For example, when you climb a slope, you will move diagonally even though the velocity is horizontal. This method returns the diagonal movement, as opposed to [member velocity] which returns the requested velocity. */
        getRealVelocity(): Vector2
        
        /** Returns the floor's collision angle at the last collision point according to [param up_direction], which is [constant Vector2.UP] by default. This value is always positive and only valid after calling [method move_and_slide] and when [method is_on_floor] returns `true`. */
        getFloorAngle(upDirection?: Vector2 /* = new Vector2(0, -1) */): float64
        
        /** Returns the linear velocity of the platform at the last collision point. Only valid after calling [method move_and_slide]. */
        getPlatformVelocity(): Vector2
        
        /** Returns the number of times the body collided and changed direction during the last call to [method move_and_slide]. */
        getSlideCollisionCount(): int64
        
        /** Returns a [KinematicCollision2D], which contains information about a collision that occurred during the last call to [method move_and_slide]. Since the body can collide several times in a single call to [method move_and_slide], you must specify the index of the collision in the range 0 to ([method get_slide_collision_count] - 1). See also [method get_last_slide_collision].  
         *  **Example:** Iterate through the collisions with a `for` loop:  
         *    
         */
        getSlideCollision(slideIdx: int64): null | KinematicCollision2D
        
        /** Returns a [KinematicCollision2D] if a collision occurred. The returned value contains information about the latest collision that occurred during the last call to [method move_and_slide]. Returns `null` if no collision occurred. See also [method get_slide_collision]. */
        getLastSlideCollision(): null | KinematicCollision2D
        
        /** Sets the motion mode which defines the behavior of [method move_and_slide]. */
        get motionMode(): int64
        set motionMode(value: int64)
        
        /** Vector pointing upwards, used to determine what is a wall and what is a floor (or a ceiling) when calling [method move_and_slide]. Defaults to [constant Vector2.UP]. As the vector will be normalized it can't be equal to [constant Vector2.ZERO], if you want all collisions to be reported as walls, consider using [constant MOTION_MODE_FLOATING] as [member motion_mode]. */
        get upDirection(): Vector2
        set upDirection(value: Vector2)
        
        /** Current velocity vector in pixels per second, used and modified during calls to [method move_and_slide].  
         *      
         *  **Note:** A common mistake is setting this property to the desired velocity multiplied by `delta`, which produces a motion vector in pixels.  
         */
        get velocity(): Vector2
        set velocity(value: Vector2)
        
        /** If `true`, during a jump against the ceiling, the body will slide, if `false` it will be stopped and will fall vertically. */
        get slideOnCeiling(): boolean
        set slideOnCeiling(value: boolean)
        
        /** Maximum number of times the body can change direction before it stops when calling [method move_and_slide]. Must be greater than zero. */
        get maxSlides(): int64
        set maxSlides(value: int64)
        
        /** Minimum angle (in radians) where the body is allowed to slide when it encounters a wall. The default value equals 15 degrees. This property only affects movement when [member motion_mode] is [constant MOTION_MODE_FLOATING]. */
        get wallMinSlideAngle(): float64
        set wallMinSlideAngle(value: float64)
        
        /** If `true`, the body will not slide on slopes when calling [method move_and_slide] when the body is standing still.  
         *  If `false`, the body will slide on floor's slopes when [member velocity] applies a downward force.  
         */
        get floorStopOnSlope(): boolean
        set floorStopOnSlope(value: boolean)
        
        /** If `false` (by default), the body will move faster on downward slopes and slower on upward slopes.  
         *  If `true`, the body will always move at the same speed on the ground no matter the slope. Note that you need to use [member floor_snap_length] to stick along a downward slope at constant speed.  
         */
        get floorConstantSpeed(): boolean
        set floorConstantSpeed(value: boolean)
        
        /** If `true`, the body will be able to move on the floor only. This option avoids to be able to walk on walls, it will however allow to slide down along them. */
        get floorBlockOnWall(): boolean
        set floorBlockOnWall(value: boolean)
        
        /** Maximum angle (in radians) where a slope is still considered a floor (or a ceiling), rather than a wall, when calling [method move_and_slide]. The default value equals 45 degrees. */
        get floorMaxAngle(): float64
        set floorMaxAngle(value: float64)
        
        /** Sets a snapping distance. When set to a value different from `0.0`, the body is kept attached to slopes when calling [method move_and_slide]. The snapping vector is determined by the given distance along the opposite direction of the [member up_direction].  
         *  As long as the snapping vector is in contact with the ground and the body moves against [member up_direction], the body will remain attached to the surface. Snapping is not applied if the body moves along [member up_direction], meaning it contains vertical rising velocity, so it will be able to detach from the ground when jumping or when the body is pushed up by something. If you want to apply a snap without taking into account the velocity, use [method apply_floor_snap].  
         */
        get floorSnapLength(): float64
        set floorSnapLength(value: float64)
        
        /** Sets the behavior to apply when you leave a moving platform. By default, to be physically accurate, when you leave the last platform velocity is applied. */
        get platformOnLeave(): int64
        set platformOnLeave(value: int64)
        
        /** Collision layers that will be included for detecting floor bodies that will act as moving platforms to be followed by the [CharacterBody2D]. By default, all floor bodies are detected and propagate their velocity. */
        get platformFloorLayers(): int64
        set platformFloorLayers(value: int64)
        
        /** Collision layers that will be included for detecting wall bodies that will act as moving platforms to be followed by the [CharacterBody2D]. By default, all wall bodies are ignored. */
        get platformWallLayers(): int64
        set platformWallLayers(value: int64)
        
        /** Extra margin used for collision recovery when calling [method move_and_slide].  
         *  If the body is at least this close to another body, it will consider them to be colliding and will be pushed away before performing the actual motion.  
         *  A higher value means it's more flexible for detecting collision, which helps with consistently detecting walls and floors.  
         *  A lower value forces the collision algorithm to use more exact detection, so it can be used in cases that specifically require precision, e.g at very low scale to avoid visible jittering, or for stability with a stack of character bodies.  
         */
        get safeMargin(): float64
        set safeMargin(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCharacterBody2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCharacterBody2D;
    }
    namespace CharacterBody3D {
        enum MotionMode {
            MotionModeGrounded = 0,
            MotionModeFloating = 1,
        }
        enum PlatformOnLeave {
            PlatformOnLeaveAddVelocity = 0,
            PlatformOnLeaveAddUpwardVelocity = 1,
            PlatformOnLeaveDoNothing = 2,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCharacterBody3D extends __RPCMapPhysicsBody3D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCharacterBody3D extends __NameMapPhysicsBody3D {
        move_and_slide: "moveAndSlide";
        apply_floor_snap: "applyFloorSnap";
        is_on_floor: "isOnFloor";
        is_on_floor_only: "isOnFloorOnly";
        is_on_ceiling: "isOnCeiling";
        is_on_ceiling_only: "isOnCeilingOnly";
        is_on_wall: "isOnWall";
        is_on_wall_only: "isOnWallOnly";
        get_floor_normal: "getFloorNormal";
        get_wall_normal: "getWallNormal";
        get_last_motion: "getLastMotion";
        get_position_delta: "getPositionDelta";
        get_real_velocity: "getRealVelocity";
        get_floor_angle: "getFloorAngle";
        get_platform_velocity: "getPlatformVelocity";
        get_platform_angular_velocity: "getPlatformAngularVelocity";
        get_slide_collision_count: "getSlideCollisionCount";
        get_slide_collision: "getSlideCollision";
        get_last_slide_collision: "getLastSlideCollision";
        motion_mode: "motionMode";
        up_direction: "upDirection";
        slide_on_ceiling: "slideOnCeiling";
        max_slides: "maxSlides";
        wall_min_slide_angle: "wallMinSlideAngle";
        floor_stop_on_slope: "floorStopOnSlope";
        floor_constant_speed: "floorConstantSpeed";
        floor_block_on_wall: "floorBlockOnWall";
        floor_max_angle: "floorMaxAngle";
        floor_snap_length: "floorSnapLength";
        platform_on_leave: "platformOnLeave";
        platform_floor_layers: "platformFloorLayers";
        platform_wall_layers: "platformWallLayers";
        safe_margin: "safeMargin";
    }
    /** A 3D physics body specialized for characters moved by script.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_characterbody3d.html  
     */
    class CharacterBody3D<Map extends NodePathMap = any> extends PhysicsBody3D<Map> {
        constructor(identifier?: any)
        /** Moves the body based on [member velocity]. If the body collides with another, it will slide along the other body rather than stop immediately. If the other body is a [CharacterBody3D] or [RigidBody3D], it will also be affected by the motion of the other body. You can use this to make moving and rotating platforms, or to make nodes push other nodes.  
         *  This method should be used in [method Node._physics_process] (or in a method called by [method Node._physics_process]), as it uses the physics step's `delta` value automatically in calculations. Otherwise, the simulation will run at an incorrect speed.  
         *  Modifies [member velocity] if a slide collision occurred. To get the latest collision call [method get_last_slide_collision], for more detailed information about collisions that occurred, use [method get_slide_collision].  
         *  When the body touches a moving platform, the platform's velocity is automatically added to the body motion. If a collision occurs due to the platform's motion, it will always be first in the slide collisions.  
         *  Returns `true` if the body collided, otherwise, returns `false`.  
         */
        moveAndSlide(): boolean
        
        /** Allows to manually apply a snap to the floor regardless of the body's velocity. This function does nothing when [method is_on_floor] returns `true`. */
        applyFloorSnap(): void
        
        /** Returns `true` if the body collided with the floor on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "floor" or not. */
        isOnFloor(): boolean
        
        /** Returns `true` if the body collided only with the floor on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "floor" or not. */
        isOnFloorOnly(): boolean
        
        /** Returns `true` if the body collided with the ceiling on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "ceiling" or not. */
        isOnCeiling(): boolean
        
        /** Returns `true` if the body collided only with the ceiling on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "ceiling" or not. */
        isOnCeilingOnly(): boolean
        
        /** Returns `true` if the body collided with a wall on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "wall" or not. */
        isOnWall(): boolean
        
        /** Returns `true` if the body collided only with a wall on the last call of [method move_and_slide]. Otherwise, returns `false`. The [member up_direction] and [member floor_max_angle] are used to determine whether a surface is "wall" or not. */
        isOnWallOnly(): boolean
        
        /** Returns the collision normal of the floor at the last collision point. Only valid after calling [method move_and_slide] and when [method is_on_floor] returns `true`.  
         *  **Warning:** The collision normal is not always the same as the surface normal.  
         */
        getFloorNormal(): Vector3
        
        /** Returns the collision normal of the wall at the last collision point. Only valid after calling [method move_and_slide] and when [method is_on_wall] returns `true`.  
         *  **Warning:** The collision normal is not always the same as the surface normal.  
         */
        getWallNormal(): Vector3
        
        /** Returns the last motion applied to the [CharacterBody3D] during the last call to [method move_and_slide]. The movement can be split into multiple motions when sliding occurs, and this method return the last one, which is useful to retrieve the current direction of the movement. */
        getLastMotion(): Vector3
        
        /** Returns the travel (position delta) that occurred during the last call to [method move_and_slide]. */
        getPositionDelta(): Vector3
        
        /** Returns the current real velocity since the last call to [method move_and_slide]. For example, when you climb a slope, you will move diagonally even though the velocity is horizontal. This method returns the diagonal movement, as opposed to [member velocity] which returns the requested velocity. */
        getRealVelocity(): Vector3
        
        /** Returns the floor's collision angle at the last collision point according to [param up_direction], which is [constant Vector3.UP] by default. This value is always positive and only valid after calling [method move_and_slide] and when [method is_on_floor] returns `true`. */
        getFloorAngle(upDirection?: Vector3 /* = Vector3.ZERO */): float64
        
        /** Returns the linear velocity of the platform at the last collision point. Only valid after calling [method move_and_slide]. */
        getPlatformVelocity(): Vector3
        
        /** Returns the angular velocity of the platform at the last collision point. Only valid after calling [method move_and_slide]. */
        getPlatformAngularVelocity(): Vector3
        
        /** Returns the number of times the body collided and changed direction during the last call to [method move_and_slide]. */
        getSlideCollisionCount(): int64
        
        /** Returns a [KinematicCollision3D], which contains information about a collision that occurred during the last call to [method move_and_slide]. Since the body can collide several times in a single call to [method move_and_slide], you must specify the index of the collision in the range 0 to ([method get_slide_collision_count] - 1). See also [method get_last_slide_collision]. */
        getSlideCollision(slideIdx: int64): null | KinematicCollision3D
        
        /** Returns a [KinematicCollision3D] if a collision occurred. The returned value contains information about the latest collision that occurred during the last call to [method move_and_slide]. Returns `null` if no collision occurred. See also [method get_slide_collision]. */
        getLastSlideCollision(): null | KinematicCollision3D
        
        /** Sets the motion mode which defines the behavior of [method move_and_slide]. */
        get motionMode(): int64
        set motionMode(value: int64)
        
        /** Vector pointing upwards, used to determine what is a wall and what is a floor (or a ceiling) when calling [method move_and_slide]. Defaults to [constant Vector3.UP]. As the vector will be normalized it can't be equal to [constant Vector3.ZERO], if you want all collisions to be reported as walls, consider using [constant MOTION_MODE_FLOATING] as [member motion_mode]. */
        get upDirection(): Vector3
        set upDirection(value: Vector3)
        
        /** If `true`, during a jump against the ceiling, the body will slide, if `false` it will be stopped and will fall vertically. */
        get slideOnCeiling(): boolean
        set slideOnCeiling(value: boolean)
        
        /** Current velocity vector (typically meters per second), used and modified during calls to [method move_and_slide].  
         *      
         *  **Note:** A common mistake is setting this property to the desired velocity multiplied by `delta`, which produces a motion vector (typically in meters).  
         */
        get velocity(): Vector3
        set velocity(value: Vector3)
        
        /** Maximum number of times the body can change direction before it stops when calling [method move_and_slide]. Must be greater than zero. */
        get maxSlides(): int64
        set maxSlides(value: int64)
        
        /** Minimum angle (in radians) where the body is allowed to slide when it encounters a wall. The default value equals 15 degrees. When [member motion_mode] is [constant MOTION_MODE_GROUNDED], it only affects movement if [member floor_block_on_wall] is `true`. */
        get wallMinSlideAngle(): float64
        set wallMinSlideAngle(value: float64)
        
        /** If `true`, the body will not slide on slopes when calling [method move_and_slide] when the body is standing still.  
         *  If `false`, the body will slide on floor's slopes when [member velocity] applies a downward force.  
         */
        get floorStopOnSlope(): boolean
        set floorStopOnSlope(value: boolean)
        
        /** If `false` (by default), the body will move faster on downward slopes and slower on upward slopes.  
         *  If `true`, the body will always move at the same speed on the ground no matter the slope. Note that you need to use [member floor_snap_length] to stick along a downward slope at constant speed.  
         */
        get floorConstantSpeed(): boolean
        set floorConstantSpeed(value: boolean)
        
        /** If `true`, the body will be able to move on the floor only. This option avoids to be able to walk on walls, it will however allow to slide down along them. */
        get floorBlockOnWall(): boolean
        set floorBlockOnWall(value: boolean)
        
        /** Maximum angle (in radians) where a slope is still considered a floor (or a ceiling), rather than a wall, when calling [method move_and_slide]. The default value equals 45 degrees. */
        get floorMaxAngle(): float64
        set floorMaxAngle(value: float64)
        
        /** Sets a snapping distance. When set to a value different from `0.0`, the body is kept attached to slopes when calling [method move_and_slide]. The snapping vector is determined by the given distance along the opposite direction of the [member up_direction].  
         *  As long as the snapping vector is in contact with the ground and the body moves against [member up_direction], the body will remain attached to the surface. Snapping is not applied if the body moves along [member up_direction], meaning it contains vertical rising velocity, so it will be able to detach from the ground when jumping or when the body is pushed up by something. If you want to apply a snap without taking into account the velocity, use [method apply_floor_snap].  
         */
        get floorSnapLength(): float64
        set floorSnapLength(value: float64)
        
        /** Sets the behavior to apply when you leave a moving platform. By default, to be physically accurate, when you leave the last platform velocity is applied. */
        get platformOnLeave(): int64
        set platformOnLeave(value: int64)
        
        /** Collision layers that will be included for detecting floor bodies that will act as moving platforms to be followed by the [CharacterBody3D]. By default, all floor bodies are detected and propagate their velocity. */
        get platformFloorLayers(): int64
        set platformFloorLayers(value: int64)
        
        /** Collision layers that will be included for detecting wall bodies that will act as moving platforms to be followed by the [CharacterBody3D]. By default, all wall bodies are ignored. */
        get platformWallLayers(): int64
        set platformWallLayers(value: int64)
        
        /** Extra margin used for collision recovery when calling [method move_and_slide].  
         *  If the body is at least this close to another body, it will consider them to be colliding and will be pushed away before performing the actual motion.  
         *  A higher value means it's more flexible for detecting collision, which helps with consistently detecting walls and floors.  
         *  A lower value forces the collision algorithm to use more exact detection, so it can be used in cases that specifically require precision, e.g at very low scale to avoid visible jittering, or for stability with a stack of character bodies.  
         */
        get safeMargin(): float64
        set safeMargin(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCharacterBody3D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCharacterBody3D;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCheckBox extends __RPCMapButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCheckBox extends __NameMapButton {
    }
    /** A button that represents a binary choice.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_checkbox.html  
     */
    class CheckBox<Map extends NodePathMap = any> extends Button<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCheckBox;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCheckBox;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCheckButton extends __RPCMapButton {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCheckButton extends __NameMapButton {
    }
    /** A button that represents a binary choice.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_checkbutton.html  
     */
    class CheckButton<Map extends NodePathMap = any> extends Button<Map> {
        constructor(identifier?: any)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCheckButton;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCheckButton;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCircleShape2D extends __RPCMapShape2D {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCircleShape2D extends __NameMapShape2D {
    }
    /** A 2D circle shape used for physics collision.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_circleshape2d.html  
     */
    class CircleShape2D extends Shape2D {
        constructor(identifier?: any)
        /** The circle's radius. */
        get radius(): float64
        set radius(value: float64)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCircleShape2D;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCircleShape2D;
    }
    namespace CodeEdit {
        enum CodeCompletionKind {
            KindClass = 0,
            KindFunction = 1,
            KindSignal = 2,
            KindVariable = 3,
            KindMember = 4,
            KindEnum = 5,
            KindConstant = 6,
            KindNodePath = 7,
            KindFilePath = 8,
            KindPlainText = 9,
            KindKeyword = 10,
        }
        enum CodeCompletionLocation {
            LocationLocal = 0,
            LocationParentMask = 256,
            LocationOtherUserCode = 512,
            LocationOther = 1024,
        }
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCodeEdit extends __RPCMapTextEdit {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCodeEdit extends __NameMapTextEdit {
        _confirm_code_completion: "_confirmCodeCompletion";
        _request_code_completion: "_requestCodeCompletion";
        _filter_code_completion_candidates: "_filterCodeCompletionCandidates";
        do_indent: "doIndent";
        indent_lines: "indentLines";
        unindent_lines: "unindentLines";
        convert_indent: "convertIndent";
        add_auto_brace_completion_pair: "addAutoBraceCompletionPair";
        has_auto_brace_completion_open_key: "hasAutoBraceCompletionOpenKey";
        has_auto_brace_completion_close_key: "hasAutoBraceCompletionCloseKey";
        get_auto_brace_completion_close_key: "getAutoBraceCompletionCloseKey";
        set_line_as_breakpoint: "setLineAsBreakpoint";
        is_line_breakpointed: "isLineBreakpointed";
        clear_breakpointed_lines: "clearBreakpointedLines";
        get_breakpointed_lines: "getBreakpointedLines";
        set_line_as_bookmarked: "setLineAsBookmarked";
        is_line_bookmarked: "isLineBookmarked";
        clear_bookmarked_lines: "clearBookmarkedLines";
        get_bookmarked_lines: "getBookmarkedLines";
        set_line_as_executing: "setLineAsExecuting";
        is_line_executing: "isLineExecuting";
        clear_executing_lines: "clearExecutingLines";
        get_executing_lines: "getExecutingLines";
        can_fold_line: "canFoldLine";
        fold_line: "foldLine";
        unfold_line: "unfoldLine";
        fold_all_lines: "foldAllLines";
        unfold_all_lines: "unfoldAllLines";
        toggle_foldable_line: "toggleFoldableLine";
        toggle_foldable_lines_at_carets: "toggleFoldableLinesAtCarets";
        is_line_folded: "isLineFolded";
        get_folded_lines: "getFoldedLines";
        create_code_region: "createCodeRegion";
        get_code_region_start_tag: "getCodeRegionStartTag";
        get_code_region_end_tag: "getCodeRegionEndTag";
        set_code_region_tags: "setCodeRegionTags";
        is_line_code_region_start: "isLineCodeRegionStart";
        is_line_code_region_end: "isLineCodeRegionEnd";
        add_string_delimiter: "addStringDelimiter";
        remove_string_delimiter: "removeStringDelimiter";
        has_string_delimiter: "hasStringDelimiter";
        clear_string_delimiters: "clearStringDelimiters";
        is_in_string: "isInString";
        add_comment_delimiter: "addCommentDelimiter";
        remove_comment_delimiter: "removeCommentDelimiter";
        has_comment_delimiter: "hasCommentDelimiter";
        clear_comment_delimiters: "clearCommentDelimiters";
        is_in_comment: "isInComment";
        get_delimiter_start_key: "getDelimiterStartKey";
        get_delimiter_end_key: "getDelimiterEndKey";
        get_delimiter_start_position: "getDelimiterStartPosition";
        get_delimiter_end_position: "getDelimiterEndPosition";
        set_code_hint: "setCodeHint";
        set_code_hint_draw_below: "setCodeHintDrawBelow";
        get_text_for_code_completion: "getTextForCodeCompletion";
        request_code_completion: "requestCodeCompletion";
        add_code_completion_option: "addCodeCompletionOption";
        update_code_completion_options: "updateCodeCompletionOptions";
        get_code_completion_options: "getCodeCompletionOptions";
        get_code_completion_option: "getCodeCompletionOption";
        get_code_completion_selected_index: "getCodeCompletionSelectedIndex";
        set_code_completion_selected_index: "setCodeCompletionSelectedIndex";
        confirm_code_completion: "confirmCodeCompletion";
        cancel_code_completion: "cancelCodeCompletion";
        get_text_for_symbol_lookup: "getTextForSymbolLookup";
        get_text_with_cursor_char: "getTextWithCursorChar";
        set_symbol_lookup_word_as_valid: "setSymbolLookupWordAsValid";
        move_lines_up: "moveLinesUp";
        move_lines_down: "moveLinesDown";
        delete_lines: "deleteLines";
        join_lines: "joinLines";
        duplicate_selection: "duplicateSelection";
        duplicate_lines: "duplicateLines";
        symbol_lookup_on_click: "symbolLookupOnClick";
        symbol_tooltip_on_hover: "symbolTooltipOnHover";
        line_folding: "lineFolding";
        line_length_guidelines: "lineLengthGuidelines";
        gutters_draw_breakpoints_gutter: "guttersDrawBreakpointsGutter";
        gutters_draw_bookmarks: "guttersDrawBookmarks";
        gutters_draw_executing_lines: "guttersDrawExecutingLines";
        gutters_draw_line_numbers: "guttersDrawLineNumbers";
        gutters_zero_pad_line_numbers: "guttersZeroPadLineNumbers";
        gutters_line_numbers_min_digits: "guttersLineNumbersMinDigits";
        gutters_draw_fold_gutter: "guttersDrawFoldGutter";
        delimiter_strings: "delimiterStrings";
        delimiter_comments: "delimiterComments";
        code_completion_enabled: "codeCompletionEnabled";
        code_completion_prefixes: "codeCompletionPrefixes";
        indent_size: "indentSize";
        indent_use_spaces: "indentUseSpaces";
        indent_automatic: "indentAutomatic";
        indent_automatic_prefixes: "indentAutomaticPrefixes";
        auto_brace_completion_enabled: "autoBraceCompletionEnabled";
        auto_brace_completion_highlight_matching: "autoBraceCompletionHighlightMatching";
        auto_brace_completion_pairs: "autoBraceCompletionPairs";
        breakpoint_toggled: "breakpointToggled";
        code_completion_requested: "codeCompletionRequested";
        symbol_lookup: "symbolLookup";
        symbol_validate: "symbolValidate";
        symbol_hovered: "symbolHovered";
    }
    /** A multiline text editor designed for editing code.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_codeedit.html  
     */
    class CodeEdit<Map extends NodePathMap = any> extends TextEdit<Map> {
        constructor(identifier?: any)
        /** Override this method to define how the selected entry should be inserted. If [param replace] is `true`, any existing text should be replaced. */
        /* gdvirtual */ _confirmCodeCompletion(replace: boolean): void
        
        /** Override this method to define what happens when the user requests code completion. If [param force] is `true`, any checks should be bypassed. */
        /* gdvirtual */ _requestCodeCompletion(force: boolean): void
        
        /** Override this method to define what items in [param candidates] should be displayed.  
         *  Both [param candidates] and the return is an [Array] of [Dictionary], see [method get_code_completion_option] for [Dictionary] content.  
         */
        /* gdvirtual */ _filterCodeCompletionCandidates(candidates: GArray<GDictionary>): GArray<GDictionary>
        
        /** If there is no selection, indentation is inserted at the caret. Otherwise, the selected lines are indented like [method indent_lines]. Equivalent to the [member ProjectSettings.input/ui_text_indent] action. The indentation characters used depend on [member indent_use_spaces] and [member indent_size]. */
        doIndent(): void
        
        /** Indents all lines that are selected or have a caret on them. Uses spaces or a tab depending on [member indent_use_spaces]. See [method unindent_lines]. */
        indentLines(): void
        
        /** Unindents all lines that are selected or have a caret on them. Uses spaces or a tab depending on [member indent_use_spaces]. Equivalent to the [member ProjectSettings.input/ui_text_dedent] action. See [method indent_lines]. */
        unindentLines(): void
        
        /** Converts the indents of lines between [param from_line] and [param to_line] to tabs or spaces as set by [member indent_use_spaces].  
         *  Values of `-1` convert the entire text.  
         */
        convertIndent(fromLine?: int64 /* = -1 */, toLine?: int64 /* = -1 */): void
        
        /** Adds a brace pair.  
         *  Both the start and end keys must be symbols. Only the start key has to be unique.  
         */
        addAutoBraceCompletionPair(startKey: string, endKey: string): void
        
        /** Returns `true` if open key [param open_key] exists. */
        hasAutoBraceCompletionOpenKey(openKey: string): boolean
        
        /** Returns `true` if close key [param close_key] exists. */
        hasAutoBraceCompletionCloseKey(closeKey: string): boolean
        
        /** Gets the matching auto brace close key for [param open_key]. */
        getAutoBraceCompletionCloseKey(openKey: string): string
        
        /** Sets the given line as a breakpoint. If `true` and [member gutters_draw_breakpoints_gutter] is `true`, draws the [theme_item breakpoint] icon in the gutter for this line. See [method get_breakpointed_lines] and [method is_line_breakpointed]. */
        setLineAsBreakpoint(line: int64, breakpointed: boolean): void
        
        /** Returns `true` if the given line is breakpointed. See [method set_line_as_breakpoint]. */
        isLineBreakpointed(line: int64): boolean
        
        /** Clears all breakpointed lines. */
        clearBreakpointedLines(): void
        
        /** Gets all breakpointed lines. */
        getBreakpointedLines(): PackedInt32Array
        
        /** Sets the given line as bookmarked. If `true` and [member gutters_draw_bookmarks] is `true`, draws the [theme_item bookmark] icon in the gutter for this line. See [method get_bookmarked_lines] and [method is_line_bookmarked]. */
        setLineAsBookmarked(line: int64, bookmarked: boolean): void
        
        /** Returns `true` if the given line is bookmarked. See [method set_line_as_bookmarked]. */
        isLineBookmarked(line: int64): boolean
        
        /** Clears all bookmarked lines. */
        clearBookmarkedLines(): void
        
        /** Gets all bookmarked lines. */
        getBookmarkedLines(): PackedInt32Array
        
        /** Sets the given line as executing. If `true` and [member gutters_draw_executing_lines] is `true`, draws the [theme_item executing_line] icon in the gutter for this line. See [method get_executing_lines] and [method is_line_executing]. */
        setLineAsExecuting(line: int64, executing: boolean): void
        
        /** Returns `true` if the given line is marked as executing. See [method set_line_as_executing]. */
        isLineExecuting(line: int64): boolean
        
        /** Clears all executed lines. */
        clearExecutingLines(): void
        
        /** Gets all executing lines. */
        getExecutingLines(): PackedInt32Array
        
        /** Returns `true` if the given line is foldable. A line is foldable if it is the start of a valid code region (see [method get_code_region_start_tag]), if it is the start of a comment or string block, or if the next non-empty line is more indented (see [method TextEdit.get_indent_level]). */
        canFoldLine(line: int64): boolean
        
        /** Folds the given line, if possible (see [method can_fold_line]). */
        foldLine(line: int64): void
        
        /** Unfolds the given line if it is folded or if it is hidden under a folded line. */
        unfoldLine(line: int64): void
        
        /** Folds all lines that are possible to be folded (see [method can_fold_line]). */
        foldAllLines(): void
        
        /** Unfolds all lines that are folded. */
        unfoldAllLines(): void
        
        /** Toggle the folding of the code block at the given line. */
        toggleFoldableLine(line: int64): void
        
        /** Toggle the folding of the code block on all lines with a caret on them. */
        toggleFoldableLinesAtCarets(): void
        
        /** Returns `true` if the given line is folded. See [method fold_line]. */
        isLineFolded(line: int64): boolean
        
        /** Returns all lines that are currently folded. */
        getFoldedLines(): GArray<int64>
        
        /** Creates a new code region with the selection. At least one single line comment delimiter have to be defined (see [method add_comment_delimiter]).  
         *  A code region is a part of code that is highlighted when folded and can help organize your script.  
         *  Code region start and end tags can be customized (see [method set_code_region_tags]).  
         *  Code regions are delimited using start and end tags (respectively `region` and `endregion` by default) preceded by one line comment delimiter. (eg. `#region` and `#endregion`)  
         */
        createCodeRegion(): void
        
        /** Returns the code region start tag (without comment delimiter). */
        getCodeRegionStartTag(): string
        
        /** Returns the code region end tag (without comment delimiter). */
        getCodeRegionEndTag(): string
        
        /** Sets the code region start and end tags (without comment delimiter). */
        setCodeRegionTags(start?: string /* = 'region' */, end?: string /* = 'endregion' */): void
        
        /** Returns `true` if the given line is a code region start. See [method set_code_region_tags]. */
        isLineCodeRegionStart(line: int64): boolean
        
        /** Returns `true` if the given line is a code region end. See [method set_code_region_tags]. */
        isLineCodeRegionEnd(line: int64): boolean
        
        /** Defines a string delimiter from [param start_key] to [param end_key]. Both keys should be symbols, and [param start_key] must not be shared with other delimiters.  
         *  If [param line_only] is `true` or [param end_key] is an empty [String], the region does not carry over to the next line.  
         */
        addStringDelimiter(startKey: string, endKey: string, lineOnly?: boolean /* = false */): void
        
        /** Removes the string delimiter with [param start_key]. */
        removeStringDelimiter(startKey: string): void
        
        /** Returns `true` if string [param start_key] exists. */
        hasStringDelimiter(startKey: string): boolean
        
        /** Removes all string delimiters. */
        clearStringDelimiters(): void
        
        /** Returns the delimiter index if [param line] [param column] is in a string. If [param column] is not provided, will return the delimiter index if the entire [param line] is a string. Otherwise `-1`. */
        isInString(line: int64, column?: int64 /* = -1 */): int64
        
        /** Adds a comment delimiter from [param start_key] to [param end_key]. Both keys should be symbols, and [param start_key] must not be shared with other delimiters.  
         *  If [param line_only] is `true` or [param end_key] is an empty [String], the region does not carry over to the next line.  
         */
        addCommentDelimiter(startKey: string, endKey: string, lineOnly?: boolean /* = false */): void
        
        /** Removes the comment delimiter with [param start_key]. */
        removeCommentDelimiter(startKey: string): void
        
        /** Returns `true` if comment [param start_key] exists. */
        hasCommentDelimiter(startKey: string): boolean
        
        /** Removes all comment delimiters. */
        clearCommentDelimiters(): void
        
        /** Returns delimiter index if [param line] [param column] is in a comment. If [param column] is not provided, will return delimiter index if the entire [param line] is a comment. Otherwise `-1`. */
        isInComment(line: int64, column?: int64 /* = -1 */): int64
        
        /** Gets the start key for a string or comment region index. */
        getDelimiterStartKey(delimiterIndex: int64): string
        
        /** Gets the end key for a string or comment region index. */
        getDelimiterEndKey(delimiterIndex: int64): string
        
        /** If [param line] [param column] is in a string or comment, returns the start position of the region. If not or no start could be found, both [Vector2] values will be `-1`. */
        getDelimiterStartPosition(line: int64, column: int64): Vector2
        
        /** If [param line] [param column] is in a string or comment, returns the end position of the region. If not or no end could be found, both [Vector2] values will be `-1`. */
        getDelimiterEndPosition(line: int64, column: int64): Vector2
        
        /** Sets the code hint text. Pass an empty string to clear. */
        setCodeHint(codeHint: string): void
        
        /** If `true`, the code hint will draw below the main caret. If `false`, the code hint will draw above the main caret. See [method set_code_hint]. */
        setCodeHintDrawBelow(drawBelow: boolean): void
        
        /** Returns the full text with char `0xFFFF` at the caret location. */
        getTextForCodeCompletion(): string
        
        /** Emits [signal code_completion_requested], if [param force] is `true` will bypass all checks. Otherwise will check that the caret is in a word or in front of a prefix. Will ignore the request if all current options are of type file path, node path, or signal. */
        requestCodeCompletion(force?: boolean /* = false */): void
        
        /** Submits an item to the queue of potential candidates for the autocomplete menu. Call [method update_code_completion_options] to update the list.  
         *  [param location] indicates location of the option relative to the location of the code completion query. See [enum CodeEdit.CodeCompletionLocation] for how to set this value.  
         *      
         *  **Note:** This list will replace all current candidates.  
         */
        addCodeCompletionOption(type: CodeEdit.CodeCompletionKind, displayText: string, insertText: string, textColor?: Color /* = new Color(1, 1, 1, 1) */, icon?: Resource, value?: any /* = {} */, location?: int64 /* = 1024 */): void
        
        /** Submits all completion options added with [method add_code_completion_option]. Will try to force the autocomplete menu to popup, if [param force] is `true`.  
         *      
         *  **Note:** This will replace all current candidates.  
         */
        updateCodeCompletionOptions(force: boolean): void
        
        /** Gets all completion options, see [method get_code_completion_option] for return content. */
        getCodeCompletionOptions(): GArray<GDictionary>
        
        /** Gets the completion option at [param index]. The return [Dictionary] has the following key-values:  
         *  `kind`: [enum CodeCompletionKind]  
         *  `display_text`: Text that is shown on the autocomplete menu.  
         *  `insert_text`: Text that is to be inserted when this item is selected.  
         *  `font_color`: Color of the text on the autocomplete menu.  
         *  `icon`: Icon to draw on the autocomplete menu.  
         *  `default_value`: Value of the symbol.  
         */
        getCodeCompletionOption(index: int64): GDictionary
        
        /** Gets the index of the current selected completion option. */
        getCodeCompletionSelectedIndex(): int64
        
        /** Sets the current selected completion option. */
        setCodeCompletionSelectedIndex(index: int64): void
        
        /** Inserts the selected entry into the text. If [param replace] is `true`, any existing text is replaced rather than merged. */
        confirmCodeCompletion(replace?: boolean /* = false */): void
        
        /** Cancels the autocomplete menu. */
        cancelCodeCompletion(): void
        
        /** Returns the full text with char `0xFFFF` at the cursor location. */
        getTextForSymbolLookup(): string
        
        /** Returns the full text with char `0xFFFF` at the specified location. */
        getTextWithCursorChar(line: int64, column: int64): string
        
        /** Sets the symbol emitted by [signal symbol_validate] as a valid lookup. */
        setSymbolLookupWordAsValid(valid: boolean): void
        
        /** Moves all lines up that are selected or have a caret on them. */
        moveLinesUp(): void
        
        /** Moves all lines down that are selected or have a caret on them. */
        moveLinesDown(): void
        
        /** Deletes all lines that are selected or have a caret on them. */
        deleteLines(): void
        
        /** Joins all selected lines or lines containing a caret with their next line. Whitespace in between will be removed. If the next line has content, the [param line_ending] will be inserted in between. */
        joinLines(lineEnding?: string /* = ' ' */): void
        
        /** Duplicates all selected text and duplicates all lines with a caret on them. */
        duplicateSelection(): void
        
        /** Duplicates all lines currently selected with any caret. Duplicates the entire line beneath the current one no matter where the caret is within the line. */
        duplicateLines(): void
        
        /** Set when a validated word from [signal symbol_validate] is clicked, the [signal symbol_lookup] should be emitted. */
        get symbolLookupOnClick(): boolean
        set symbolLookupOnClick(value: boolean)
        
        /** If `true`, the [signal symbol_hovered] signal is emitted when hovering over a word. */
        get symbolTooltipOnHover(): boolean
        set symbolTooltipOnHover(value: boolean)
        
        /** If `true`, lines can be folded. Otherwise, line folding methods like [method fold_line] will not work and [method can_fold_line] will always return `false`. See [member gutters_draw_fold_gutter]. */
        get lineFolding(): boolean
        set lineFolding(value: boolean)
        
        /** Draws vertical lines at the provided columns. The first entry is considered a main hard guideline and is drawn more prominently. */
        get lineLengthGuidelines(): PackedInt32Array
        set lineLengthGuidelines(value: PackedInt32Array | int32[])
        
        /** If `true`, breakpoints are drawn in the gutter. This gutter is shared with bookmarks and executing lines. Clicking the gutter will toggle the breakpoint for the line, see [method set_line_as_breakpoint]. */
        get guttersDrawBreakpointsGutter(): boolean
        set guttersDrawBreakpointsGutter(value: boolean)
        
        /** If `true`, bookmarks are drawn in the gutter. This gutter is shared with breakpoints and executing lines. See [method set_line_as_bookmarked]. */
        get guttersDrawBookmarks(): boolean
        set guttersDrawBookmarks(value: boolean)
        
        /** If `true`, executing lines are marked in the gutter. This gutter is shared with breakpoints and bookmarks. See [method set_line_as_executing]. */
        get guttersDrawExecutingLines(): boolean
        set guttersDrawExecutingLines(value: boolean)
        
        /** If `true`, the line number gutter is drawn. Line numbers start at `1` and are incremented for each line of text. Clicking and dragging in the line number gutter will select entire lines of text. */
        get guttersDrawLineNumbers(): boolean
        set guttersDrawLineNumbers(value: boolean)
        
        /** If `true`, line numbers drawn in the gutter are zero padded based on the total line count. Requires [member gutters_draw_line_numbers] to be set to `true`. */
        get guttersZeroPadLineNumbers(): boolean
        set guttersZeroPadLineNumbers(value: boolean)
        
        /** The minimum width in digits reserved for the line number gutter. */
        get guttersLineNumbersMinDigits(): int64
        set guttersLineNumbersMinDigits(value: int64)
        
        /** If `true`, the fold gutter is drawn. In this gutter, the [theme_item can_fold_code_region] icon is drawn for each foldable line (see [method can_fold_line]) and the [theme_item folded_code_region] icon is drawn for each folded line (see [method is_line_folded]). These icons can be clicked to toggle the fold state, see [method toggle_foldable_line]. [member line_folding] must be `true` to show icons. */
        get guttersDrawFoldGutter(): boolean
        set guttersDrawFoldGutter(value: boolean)
        
        /** Sets the string delimiters. All existing string delimiters will be removed. */
        get delimiterStrings(): PackedStringArray
        set delimiterStrings(value: PackedStringArray | string[])
        
        /** Sets the comment delimiters. All existing comment delimiters will be removed. */
        get delimiterComments(): PackedStringArray
        set delimiterComments(value: PackedStringArray | string[])
        
        /** If `true`, the [member ProjectSettings.input/ui_text_completion_query] action requests code completion. To handle it, see [method _request_code_completion] or [signal code_completion_requested]. */
        get codeCompletionEnabled(): boolean
        set codeCompletionEnabled(value: boolean)
        
        /** Sets prefixes that will trigger code completion. */
        get codeCompletionPrefixes(): PackedStringArray
        set codeCompletionPrefixes(value: PackedStringArray | string[])
        
        /** Size of the tabulation indent (one [kbd]Tab[/kbd] press) in characters. If [member indent_use_spaces] is enabled the number of spaces to use. */
        get indentSize(): int64
        set indentSize(value: int64)
        
        /** Use spaces instead of tabs for indentation. */
        get indentUseSpaces(): boolean
        set indentUseSpaces(value: boolean)
        
        /** If `true`, an extra indent is automatically inserted when a new line is added and a prefix in [member indent_automatic_prefixes] is found. If a brace pair opening key is found, the matching closing brace will be moved to another new line (see [member auto_brace_completion_pairs]). */
        get indentAutomatic(): boolean
        set indentAutomatic(value: boolean)
        
        /** Prefixes to trigger an automatic indent. Used when [member indent_automatic] is set to `true`. */
        get indentAutomaticPrefixes(): PackedStringArray
        set indentAutomaticPrefixes(value: PackedStringArray | string[])
        
        /** If `true`, uses [member auto_brace_completion_pairs] to automatically insert the closing brace when the opening brace is inserted by typing or autocompletion. Also automatically removes the closing brace when using backspace on the opening brace. */
        get autoBraceCompletionEnabled(): boolean
        set autoBraceCompletionEnabled(value: boolean)
        
        /** If `true`, highlights brace pairs when the caret is on either one, using [member auto_brace_completion_pairs]. If matching, the pairs will be underlined. If a brace is unmatched, it is colored with [theme_item brace_mismatch_color]. */
        get autoBraceCompletionHighlightMatching(): boolean
        set autoBraceCompletionHighlightMatching(value: boolean)
        
        /** Sets the brace pairs to be autocompleted. For each entry in the dictionary, the key is the opening brace and the value is the closing brace that matches it. A brace is a [String] made of symbols. See [member auto_brace_completion_enabled] and [member auto_brace_completion_highlight_matching]. */
        get autoBraceCompletionPairs(): GDictionary
        set autoBraceCompletionPairs(value: GDictionary)
        
        /** Emitted when a breakpoint is added or removed from a line. If the line is removed via backspace, a signal is emitted at the old line. */
        readonly breakpointToggled: Signal<(line: int64) => void>
        
        /** Emitted when the user requests code completion. This signal will not be sent if [method _request_code_completion] is overridden or [member code_completion_enabled] is `false`. */
        readonly codeCompletionRequested: Signal<() => void>
        
        /** Emitted when the user has clicked on a valid symbol. */
        readonly symbolLookup: Signal<(symbol: string, line: int64, column: int64) => void>
        
        /** Emitted when the user hovers over a symbol. The symbol should be validated and responded to, by calling [method set_symbol_lookup_word_as_valid].  
         *      
         *  **Note:** [member symbol_lookup_on_click] must be `true` for this signal to be emitted.  
         */
        readonly symbolValidate: Signal<(symbol: string) => void>
        
        /** Emitted when the user hovers over a symbol. Unlike [signal Control.mouse_entered], this signal is not emitted immediately, but when the cursor is over the symbol for [member ProjectSettings.gui/timers/tooltip_delay_sec] seconds.  
         *      
         *  **Note:** [member symbol_tooltip_on_hover] must be `true` for this signal to be emitted.  
         */
        readonly symbolHovered: Signal<(symbol: string, line: int64, column: int64) => void>
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCodeEdit;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCodeEdit;
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __RPCMapCodeHighlighter extends __RPCMapSyntaxHighlighter {
    }
    /** @deprecated Internal use. Does not exist at runtime. */
    interface __NameMapCodeHighlighter extends __NameMapSyntaxHighlighter {
        add_keyword_color: "addKeywordColor";
        remove_keyword_color: "removeKeywordColor";
        has_keyword_color: "hasKeywordColor";
        get_keyword_color: "getKeywordColor";
        clear_keyword_colors: "clearKeywordColors";
        add_member_keyword_color: "addMemberKeywordColor";
        remove_member_keyword_color: "removeMemberKeywordColor";
        has_member_keyword_color: "hasMemberKeywordColor";
        get_member_keyword_color: "getMemberKeywordColor";
        clear_member_keyword_colors: "clearMemberKeywordColors";
        add_color_region: "addColorRegion";
        remove_color_region: "removeColorRegion";
        has_color_region: "hasColorRegion";
        clear_color_regions: "clearColorRegions";
        number_color: "numberColor";
        symbol_color: "symbolColor";
        function_color: "functionColor";
        member_variable_color: "memberVariableColor";
        keyword_colors: "keywordColors";
        member_keyword_colors: "memberKeywordColors";
        color_regions: "colorRegions";
    }
    /** A syntax highlighter intended for code.  
     *  	  
     *  @link https://docs.godotengine.org/en/latest/classes/class_codehighlighter.html  
     */
    class CodeHighlighter extends SyntaxHighlighter {
        constructor(identifier?: any)
        /** Sets the color for a keyword.  
         *  The keyword cannot contain any symbols except '_'.  
         */
        addKeywordColor(keyword: string, color: Color): void
        
        /** Removes the keyword. */
        removeKeywordColor(keyword: string): void
        
        /** Returns `true` if the keyword exists, else `false`. */
        hasKeywordColor(keyword: string): boolean
        
        /** Returns the color for a keyword. */
        getKeywordColor(keyword: string): Color
        
        /** Removes all keywords. */
        clearKeywordColors(): void
        
        /** Sets the color for a member keyword.  
         *  The member keyword cannot contain any symbols except '_'.  
         *  It will not be highlighted if preceded by a '.'.  
         */
        addMemberKeywordColor(memberKeyword: string, color: Color): void
        
        /** Removes the member keyword. */
        removeMemberKeywordColor(memberKeyword: string): void
        
        /** Returns `true` if the member keyword exists, else `false`. */
        hasMemberKeywordColor(memberKeyword: string): boolean
        
        /** Returns the color for a member keyword. */
        getMemberKeywordColor(memberKeyword: string): Color
        
        /** Removes all member keywords. */
        clearMemberKeywordColors(): void
        
        /** Adds a color region (such as for comments or strings) from [param start_key] to [param end_key]. Both keys should be symbols, and [param start_key] must not be shared with other delimiters.  
         *  If [param line_only] is `true` or [param end_key] is an empty [String], the region does not carry over to the next line.  
         */
        addColorRegion(startKey: string, endKey: string, color: Color, lineOnly?: boolean /* = false */): void
        
        /** Removes the color region that uses that start key. */
        removeColorRegion(startKey: string): void
        
        /** Returns `true` if the start key exists, else `false`. */
        hasColorRegion(startKey: string): boolean
        
        /** Removes all color regions. */
        clearColorRegions(): void
        
        /** Sets the color for numbers. */
        get numberColor(): Color
        set numberColor(value: Color)
        
        /** Sets the color for symbols. */
        get symbolColor(): Color
        set symbolColor(value: Color)
        
        /** Sets color for functions. A function is a non-keyword string followed by a '('. */
        get functionColor(): Color
        set functionColor(value: Color)
        
        /** Sets color for member variables. A member variable is non-keyword, non-function string proceeded with a '.'. */
        get memberVariableColor(): Color
        set memberVariableColor(value: Color)
        
        /** Sets the keyword colors. All existing keywords will be removed. The [Dictionary] key is the keyword. The value is the keyword color. */
        get keywordColors(): GDictionary
        set keywordColors(value: GDictionary)
        
        /** Sets the member keyword colors. All existing member keyword will be removed. The [Dictionary] key is the member keyword. The value is the member keyword color. */
        get memberKeywordColors(): GDictionary
        set memberKeywordColors(value: GDictionary)
        
        /** Sets the color regions. All existing regions will be removed. The [Dictionary] key is the region start and end key, separated by a space. The value is the region color. */
        get colorRegions(): GDictionary
        set colorRegions(value: GDictionary)
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotRPCMap: __RPCMapCodeHighlighter;
        /** @deprecated Internal use. Does not exist at runtime. */
        __godotNameMap: __NameMapCodeHighlighter;
    }
}
