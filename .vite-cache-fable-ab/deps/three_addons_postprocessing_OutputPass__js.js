import { Za as RawShaderMaterial, ct as ColorManagement, gs as UniformsUtils } from "./three.module-BUyxIFmx.js";
import { n as Pass, t as FullScreenQuad } from "./Pass-BFRCcRtX.js";
//#region ../../home/kortux/Workspace/chagra/node_modules/three/examples/jsm/shaders/OutputShader.js
/**
* @module OutputShader
* @three_import import { OutputShader } from 'three/addons/shaders/OutputShader.js';
*/
/**
* Performs tone mapping and color space conversion for
* FX workflows.
*
* Used by {@link OutputPass}.
*
* @constant
* @type {ShaderMaterial~Shader}
*/
var OutputShader = {
	name: "OutputShader",
	uniforms: {
		"tDiffuse": { value: null },
		"toneMappingExposure": { value: 1 }
	},
	vertexShader: `
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
	fragmentShader: `

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`
};
//#endregion
//#region ../../home/kortux/Workspace/chagra/node_modules/three/examples/jsm/postprocessing/OutputPass.js
/**
* This pass is responsible for including tone mapping and color space conversion
* into your pass chain. In most cases, this pass should be included at the end
* of each pass chain. If a pass requires sRGB input (e.g. like FXAA), the pass
* must follow `OutputPass` in the pass chain.
*
* The tone mapping and color space settings are extracted from the renderer.
*
* ```js
* const outputPass = new OutputPass();
* composer.addPass( outputPass );
* ```
*
* @augments Pass
* @three_import import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
*/
var OutputPass = class extends Pass {
	/**
	* Constructs a new output pass.
	*/
	constructor() {
		super();
		/**
		* The pass uniforms.
		*
		* @type {Object}
		*/
		this.uniforms = UniformsUtils.clone(OutputShader.uniforms);
		/**
		* The pass material.
		*
		* @type {RawShaderMaterial}
		*/
		this.material = new RawShaderMaterial({
			name: OutputShader.name,
			uniforms: this.uniforms,
			vertexShader: OutputShader.vertexShader,
			fragmentShader: OutputShader.fragmentShader
		});
		this._fsQuad = new FullScreenQuad(this.material);
		this._outputColorSpace = null;
		this._toneMapping = null;
	}
	/**
	* Performs the output pass.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	* @param {WebGLRenderTarget} writeBuffer - The write buffer. This buffer is intended as the rendering
	* destination for the pass.
	* @param {WebGLRenderTarget} readBuffer - The read buffer. The pass can access the result from the
	* previous pass from this buffer.
	* @param {number} deltaTime - The delta time in seconds.
	* @param {boolean} maskActive - Whether masking is active or not.
	*/
	render(renderer, writeBuffer, readBuffer) {
		this.uniforms["tDiffuse"].value = readBuffer.texture;
		this.uniforms["toneMappingExposure"].value = renderer.toneMappingExposure;
		if (this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping) {
			this._outputColorSpace = renderer.outputColorSpace;
			this._toneMapping = renderer.toneMapping;
			this.material.defines = {};
			if (ColorManagement.getTransfer(this._outputColorSpace) === "srgb") this.material.defines.SRGB_TRANSFER = "";
			if (this._toneMapping === 1) this.material.defines.LINEAR_TONE_MAPPING = "";
			else if (this._toneMapping === 2) this.material.defines.REINHARD_TONE_MAPPING = "";
			else if (this._toneMapping === 3) this.material.defines.CINEON_TONE_MAPPING = "";
			else if (this._toneMapping === 4) this.material.defines.ACES_FILMIC_TONE_MAPPING = "";
			else if (this._toneMapping === 6) this.material.defines.AGX_TONE_MAPPING = "";
			else if (this._toneMapping === 7) this.material.defines.NEUTRAL_TONE_MAPPING = "";
			else if (this._toneMapping === 5) this.material.defines.CUSTOM_TONE_MAPPING = "";
			this.material.needsUpdate = true;
		}
		if (this.renderToScreen === true) {
			renderer.setRenderTarget(null);
			this._fsQuad.render(renderer);
		} else {
			renderer.setRenderTarget(writeBuffer);
			if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
			this._fsQuad.render(renderer);
		}
	}
	/**
	* Frees the GPU-related resources allocated by this instance. Call this
	* method whenever the pass is no longer used in your app.
	*/
	dispose() {
		this.material.dispose();
		this._fsQuad.dispose();
	}
};
//#endregion
export { OutputPass };

//# sourceMappingURL=three_addons_postprocessing_OutputPass__js.js.map