//#region ../../home/kortux/Workspace/chagra/node_modules/three/examples/jsm/shaders/CopyShader.js
/**
* @module CopyShader
* @three_import import { CopyShader } from 'three/addons/shaders/CopyShader.js';
*/
/**
* Full-screen copy shader pass.
*
* @constant
* @type {ShaderMaterial~Shader}
*/
var CopyShader = {
	name: "CopyShader",
	uniforms: {
		"tDiffuse": { value: null },
		"opacity": { value: 1 }
	},
	vertexShader: `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
	fragmentShader: `

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`
};
//#endregion
export { CopyShader as t };

//# sourceMappingURL=CopyShader-Bp1AkcI0.js.map