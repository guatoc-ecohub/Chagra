import { Es as Vector2, In as HalfFloatType, Is as WebGLRenderTarget, at as Clock, gs as UniformsUtils, ho as ShaderMaterial } from "./three.module-BXH_KMZs.js";
import { t as CopyShader } from "./CopyShader-BAbLwad3.js";
import { n as Pass, t as FullScreenQuad } from "./Pass-BjRCcVlr.js";
//#region ../../node_modules/three/examples/jsm/postprocessing/ShaderPass.js
/**
* This pass can be used to create a post processing effect
* with a raw GLSL shader object. Useful for implementing custom
* effects.
*
* ```js
* const fxaaPass = new ShaderPass( FXAAShader );
* composer.addPass( fxaaPass );
* ```
*
* @augments Pass
* @three_import import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
*/
var ShaderPass = class extends Pass {
	/**
	* Constructs a new shader pass.
	*
	* @param {Object|ShaderMaterial} [shader] - A shader object holding vertex and fragment shader as well as
	* defines and uniforms. It's also valid to pass a custom shader material.
	* @param {string} [textureID='tDiffuse'] - The name of the texture uniform that should sample
	* the read buffer.
	*/
	constructor(shader, textureID = "tDiffuse") {
		super();
		/**
		* The name of the texture uniform that should sample the read buffer.
		*
		* @type {string}
		* @default 'tDiffuse'
		*/
		this.textureID = textureID;
		/**
		* The pass uniforms.
		*
		* @type {?Object}
		*/
		this.uniforms = null;
		/**
		* The pass material.
		*
		* @type {?ShaderMaterial}
		*/
		this.material = null;
		if (shader instanceof ShaderMaterial) {
			this.uniforms = shader.uniforms;
			this.material = shader;
		} else if (shader) {
			this.uniforms = UniformsUtils.clone(shader.uniforms);
			this.material = new ShaderMaterial({
				name: shader.name !== void 0 ? shader.name : "unspecified",
				defines: Object.assign({}, shader.defines),
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader
			});
		}
		this._fsQuad = new FullScreenQuad(this.material);
	}
	/**
	* Performs the shader pass.
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
		if (this.uniforms[this.textureID]) this.uniforms[this.textureID].value = readBuffer.texture;
		this._fsQuad.material = this.material;
		if (this.renderToScreen) {
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
//#region ../../node_modules/three/examples/jsm/postprocessing/MaskPass.js
/**
* This pass can be used to define a mask during post processing.
* Meaning only areas of subsequent post processing are affected
* which lie in the masking area of this pass. Internally, the masking
* is implemented with the stencil buffer.
*
* ```js
* const maskPass = new MaskPass( scene, camera );
* composer.addPass( maskPass );
* ```
*
* @augments Pass
* @three_import import { MaskPass } from 'three/addons/postprocessing/MaskPass.js';
*/
var MaskPass = class extends Pass {
	/**
	* Constructs a new mask pass.
	*
	* @param {Scene} scene - The 3D objects in this scene will define the mask.
	* @param {Camera} camera - The camera.
	*/
	constructor(scene, camera) {
		super();
		/**
		* The scene that defines the mask.
		*
		* @type {Scene}
		*/
		this.scene = scene;
		/**
		* The camera.
		*
		* @type {Camera}
		*/
		this.camera = camera;
		/**
		* Overwritten to perform a clear operation by default.
		*
		* @type {boolean}
		* @default true
		*/
		this.clear = true;
		/**
		* Overwritten to disable the swap.
		*
		* @type {boolean}
		* @default false
		*/
		this.needsSwap = false;
		/**
		* Whether to inverse the mask or not.
		*
		* @type {boolean}
		* @default false
		*/
		this.inverse = false;
	}
	/**
	* Performs a mask pass with the configured scene and camera.
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
		const context = renderer.getContext();
		const state = renderer.state;
		state.buffers.color.setMask(false);
		state.buffers.depth.setMask(false);
		state.buffers.color.setLocked(true);
		state.buffers.depth.setLocked(true);
		let writeValue, clearValue;
		if (this.inverse) {
			writeValue = 0;
			clearValue = 1;
		} else {
			writeValue = 1;
			clearValue = 0;
		}
		state.buffers.stencil.setTest(true);
		state.buffers.stencil.setOp(context.REPLACE, context.REPLACE, context.REPLACE);
		state.buffers.stencil.setFunc(context.ALWAYS, writeValue, 4294967295);
		state.buffers.stencil.setClear(clearValue);
		state.buffers.stencil.setLocked(true);
		renderer.setRenderTarget(readBuffer);
		if (this.clear) renderer.clear();
		renderer.render(this.scene, this.camera);
		renderer.setRenderTarget(writeBuffer);
		if (this.clear) renderer.clear();
		renderer.render(this.scene, this.camera);
		state.buffers.color.setLocked(false);
		state.buffers.depth.setLocked(false);
		state.buffers.color.setMask(true);
		state.buffers.depth.setMask(true);
		state.buffers.stencil.setLocked(false);
		state.buffers.stencil.setFunc(context.EQUAL, 1, 4294967295);
		state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.KEEP);
		state.buffers.stencil.setLocked(true);
	}
};
/**
* This pass can be used to clear a mask previously defined with {@link MaskPass}.
*
* ```js
* const clearPass = new ClearMaskPass();
* composer.addPass( clearPass );
* ```
*
* @augments Pass
*/
var ClearMaskPass = class extends Pass {
	/**
	* Constructs a new clear mask pass.
	*/
	constructor() {
		super();
		/**
		* Overwritten to disable the swap.
		*
		* @type {boolean}
		* @default false
		*/
		this.needsSwap = false;
	}
	/**
	* Performs the clear of the currently defined mask.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	* @param {WebGLRenderTarget} writeBuffer - The write buffer. This buffer is intended as the rendering
	* destination for the pass.
	* @param {WebGLRenderTarget} readBuffer - The read buffer. The pass can access the result from the
	* previous pass from this buffer.
	* @param {number} deltaTime - The delta time in seconds.
	* @param {boolean} maskActive - Whether masking is active or not.
	*/
	render(renderer) {
		renderer.state.buffers.stencil.setLocked(false);
		renderer.state.buffers.stencil.setTest(false);
	}
};
//#endregion
//#region ../../node_modules/three/examples/jsm/postprocessing/EffectComposer.js
/**
* Used to implement post-processing effects in three.js.
* The class manages a chain of post-processing passes to produce the final visual result.
* Post-processing passes are executed in order of their addition/insertion.
* The last pass is automatically rendered to screen.
*
* This module can only be used with {@link WebGLRenderer}.
*
* ```js
* const composer = new EffectComposer( renderer );
*
* // adding some passes
* const renderPass = new RenderPass( scene, camera );
* composer.addPass( renderPass );
*
* const glitchPass = new GlitchPass();
* composer.addPass( glitchPass );
*
* const outputPass = new OutputPass()
* composer.addPass( outputPass );
*
* function animate() {
*
* 	composer.render(); // instead of renderer.render()
*
* }
* ```
*
* @three_import import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
*/
var EffectComposer = class {
	/**
	* Constructs a new effect composer.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	* @param {WebGLRenderTarget} [renderTarget] - This render target and a clone will
	* be used as the internal read and write buffers. If not given, the composer creates
	* the buffers automatically.
	*/
	constructor(renderer, renderTarget) {
		/**
		* The renderer.
		*
		* @type {WebGLRenderer}
		*/
		this.renderer = renderer;
		this._pixelRatio = renderer.getPixelRatio();
		if (renderTarget === void 0) {
			const size = renderer.getSize(new Vector2());
			this._width = size.width;
			this._height = size.height;
			renderTarget = new WebGLRenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, { type: HalfFloatType });
			renderTarget.texture.name = "EffectComposer.rt1";
		} else {
			this._width = renderTarget.width;
			this._height = renderTarget.height;
		}
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.renderTarget2.texture.name = "EffectComposer.rt2";
		/**
		* A reference to the internal write buffer. Passes usually write
		* their result into this buffer.
		*
		* @type {WebGLRenderTarget}
		*/
		this.writeBuffer = this.renderTarget1;
		/**
		* A reference to the internal read buffer. Passes usually read
		* the previous render result from this buffer.
		*
		* @type {WebGLRenderTarget}
		*/
		this.readBuffer = this.renderTarget2;
		/**
		* Whether the final pass is rendered to the screen (default framebuffer) or not.
		*
		* @type {boolean}
		* @default true
		*/
		this.renderToScreen = true;
		/**
		* An array representing the (ordered) chain of post-processing passes.
		*
		* @type {Array<Pass>}
		*/
		this.passes = [];
		/**
		* A copy pass used for internal swap operations.
		*
		* @private
		* @type {ShaderPass}
		*/
		this.copyPass = new ShaderPass(CopyShader);
		this.copyPass.material.blending = 0;
		/**
		* The internal clock for managing time data.
		*
		* @private
		* @type {Clock}
		*/
		this.clock = new Clock();
	}
	/**
	* Swaps the internal read/write buffers.
	*/
	swapBuffers() {
		const tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	}
	/**
	* Adds the given pass to the pass chain.
	*
	* @param {Pass} pass - The pass to add.
	*/
	addPass(pass) {
		this.passes.push(pass);
		pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
	}
	/**
	* Inserts the given pass at a given index.
	*
	* @param {Pass} pass - The pass to insert.
	* @param {number} index - The index into the pass chain.
	*/
	insertPass(pass, index) {
		this.passes.splice(index, 0, pass);
		pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
	}
	/**
	* Removes the given pass from the pass chain.
	*
	* @param {Pass} pass - The pass to remove.
	*/
	removePass(pass) {
		const index = this.passes.indexOf(pass);
		if (index !== -1) this.passes.splice(index, 1);
	}
	/**
	* Returns `true` if the pass for the given index is the last enabled pass in the pass chain.
	*
	* @param {number} passIndex - The pass index.
	* @return {boolean} Whether the pass for the given index is the last pass in the pass chain.
	*/
	isLastEnabledPass(passIndex) {
		for (let i = passIndex + 1; i < this.passes.length; i++) if (this.passes[i].enabled) return false;
		return true;
	}
	/**
	* Executes all enabled post-processing passes in order to produce the final frame.
	*
	* @param {number} deltaTime - The delta time in seconds. If not given, the composer computes
	* its own time delta value.
	*/
	render(deltaTime) {
		if (deltaTime === void 0) deltaTime = this.clock.getDelta();
		const currentRenderTarget = this.renderer.getRenderTarget();
		let maskActive = false;
		for (let i = 0, il = this.passes.length; i < il; i++) {
			const pass = this.passes[i];
			if (pass.enabled === false) continue;
			pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
			pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);
			if (pass.needsSwap) {
				if (maskActive) {
					const context = this.renderer.getContext();
					const stencil = this.renderer.state.buffers.stencil;
					stencil.setFunc(context.NOTEQUAL, 1, 4294967295);
					this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);
					stencil.setFunc(context.EQUAL, 1, 4294967295);
				}
				this.swapBuffers();
			}
			if (MaskPass !== void 0) {
				if (pass instanceof MaskPass) maskActive = true;
				else if (pass instanceof ClearMaskPass) maskActive = false;
			}
		}
		this.renderer.setRenderTarget(currentRenderTarget);
	}
	/**
	* Resets the internal state of the EffectComposer.
	*
	* @param {WebGLRenderTarget} [renderTarget] - This render target has the same purpose like
	* the one from the constructor. If set, it is used to setup the read and write buffers.
	*/
	reset(renderTarget) {
		if (renderTarget === void 0) {
			const size = this.renderer.getSize(new Vector2());
			this._pixelRatio = this.renderer.getPixelRatio();
			this._width = size.width;
			this._height = size.height;
			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
		}
		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;
	}
	/**
	* Resizes the internal read and write buffers as well as all passes. Similar to {@link WebGLRenderer#setSize},
	* this method honors the current pixel ration.
	*
	* @param {number} width - The width in logical pixels.
	* @param {number} height - The height in logical pixels.
	*/
	setSize(width, height) {
		this._width = width;
		this._height = height;
		const effectiveWidth = this._width * this._pixelRatio;
		const effectiveHeight = this._height * this._pixelRatio;
		this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
		this.renderTarget2.setSize(effectiveWidth, effectiveHeight);
		for (let i = 0; i < this.passes.length; i++) this.passes[i].setSize(effectiveWidth, effectiveHeight);
	}
	/**
	* Sets device pixel ratio. This is usually used for HiDPI device to prevent blurring output.
	* Setting the pixel ratio will automatically resize the composer.
	*
	* @param {number} pixelRatio - The pixel ratio to set.
	*/
	setPixelRatio(pixelRatio) {
		this._pixelRatio = pixelRatio;
		this.setSize(this._width, this._height);
	}
	/**
	* Frees the GPU-related resources allocated by this instance. Call this
	* method whenever the composer is no longer used in your app.
	*/
	dispose() {
		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.copyPass.dispose();
	}
};
//#endregion
export { EffectComposer };

//# sourceMappingURL=three_addons_postprocessing_EffectComposer__js.js.map