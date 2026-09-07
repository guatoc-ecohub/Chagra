import { Ds as Vector3, Eo as Sphere, H as Box3, Kn as InstancedBufferGeometry, _n as Float32BufferAttribute, er as InterleavedBufferAttribute, qn as InstancedInterleavedBuffer, zs as WireframeGeometry } from "./three.module-BUyxIFmx.js";
//#region ../../home/kortux/Workspace/chagra/node_modules/three/examples/jsm/lines/LineSegmentsGeometry.js
var _box = new Box3();
var _vector = new Vector3();
/**
* A series of vertex pairs, forming line segments.
*
* This is used in {@link LineSegments2} to describe the shape.
*
* @augments InstancedBufferGeometry
* @three_import import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
*/
var LineSegmentsGeometry = class extends InstancedBufferGeometry {
	/**
	* Constructs a new line segments geometry.
	*/
	constructor() {
		super();
		/**
		* This flag can be used for type testing.
		*
		* @type {boolean}
		* @readonly
		* @default true
		*/
		this.isLineSegmentsGeometry = true;
		this.type = "LineSegmentsGeometry";
		const positions = [
			-1,
			2,
			0,
			1,
			2,
			0,
			-1,
			1,
			0,
			1,
			1,
			0,
			-1,
			0,
			0,
			1,
			0,
			0,
			-1,
			-1,
			0,
			1,
			-1,
			0
		];
		const uvs = [
			-1,
			2,
			1,
			2,
			-1,
			1,
			1,
			1,
			-1,
			-1,
			1,
			-1,
			-1,
			-2,
			1,
			-2
		];
		this.setIndex([
			0,
			2,
			1,
			2,
			3,
			1,
			2,
			4,
			3,
			4,
			5,
			3,
			4,
			6,
			5,
			6,
			7,
			5
		]);
		this.setAttribute("position", new Float32BufferAttribute(positions, 3));
		this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
	}
	/**
	* Applies the given 4x4 transformation matrix to the geometry.
	*
	* @param {Matrix4} matrix - The matrix to apply.
	* @return {LineSegmentsGeometry} A reference to this instance.
	*/
	applyMatrix4(matrix) {
		const start = this.attributes.instanceStart;
		const end = this.attributes.instanceEnd;
		if (start !== void 0) {
			start.applyMatrix4(matrix);
			end.applyMatrix4(matrix);
			start.needsUpdate = true;
		}
		if (this.boundingBox !== null) this.computeBoundingBox();
		if (this.boundingSphere !== null) this.computeBoundingSphere();
		return this;
	}
	/**
	* Sets the given line positions for this geometry. The length must be a multiple of six since
	* each line segment is defined by a start end vertex in the pattern `(xyz xyz)`.
	*
	* @param {Float32Array|Array<number>} array - The position data to set.
	* @return {LineSegmentsGeometry} A reference to this geometry.
	*/
	setPositions(array) {
		let lineSegments;
		if (array instanceof Float32Array) lineSegments = array;
		else if (Array.isArray(array)) lineSegments = new Float32Array(array);
		const instanceBuffer = new InstancedInterleavedBuffer(lineSegments, 6, 1);
		this.setAttribute("instanceStart", new InterleavedBufferAttribute(instanceBuffer, 3, 0));
		this.setAttribute("instanceEnd", new InterleavedBufferAttribute(instanceBuffer, 3, 3));
		this.instanceCount = this.attributes.instanceStart.count;
		this.computeBoundingBox();
		this.computeBoundingSphere();
		return this;
	}
	/**
	* Sets the given line colors for this geometry. The length must be a multiple of six since
	* each line segment is defined by a start end color in the pattern `(rgb rgb)`.
	*
	* @param {Float32Array|Array<number>} array - The position data to set.
	* @return {LineSegmentsGeometry} A reference to this geometry.
	*/
	setColors(array) {
		let colors;
		if (array instanceof Float32Array) colors = array;
		else if (Array.isArray(array)) colors = new Float32Array(array);
		const instanceColorBuffer = new InstancedInterleavedBuffer(colors, 6, 1);
		this.setAttribute("instanceColorStart", new InterleavedBufferAttribute(instanceColorBuffer, 3, 0));
		this.setAttribute("instanceColorEnd", new InterleavedBufferAttribute(instanceColorBuffer, 3, 3));
		return this;
	}
	/**
	* Setups this line segments geometry from the given wireframe geometry.
	*
	* @param {WireframeGeometry} geometry - The geometry that should be used as a data source for this geometry.
	* @return {LineSegmentsGeometry} A reference to this geometry.
	*/
	fromWireframeGeometry(geometry) {
		this.setPositions(geometry.attributes.position.array);
		return this;
	}
	/**
	* Setups this line segments geometry from the given edges geometry.
	*
	* @param {EdgesGeometry} geometry - The geometry that should be used as a data source for this geometry.
	* @return {LineSegmentsGeometry} A reference to this geometry.
	*/
	fromEdgesGeometry(geometry) {
		this.setPositions(geometry.attributes.position.array);
		return this;
	}
	/**
	* Setups this line segments geometry from the given mesh.
	*
	* @param {Mesh} mesh - The mesh geometry that should be used as a data source for this geometry.
	* @return {LineSegmentsGeometry} A reference to this geometry.
	*/
	fromMesh(mesh) {
		this.fromWireframeGeometry(new WireframeGeometry(mesh.geometry));
		return this;
	}
	/**
	* Setups this line segments geometry from the given line segments.
	*
	* @param {LineSegments} lineSegments - The line segments that should be used as a data source for this geometry.
	* Assumes the source geometry is not using indices.
	* @return {LineSegmentsGeometry} A reference to this geometry.
	*/
	fromLineSegments(lineSegments) {
		const geometry = lineSegments.geometry;
		this.setPositions(geometry.attributes.position.array);
		return this;
	}
	computeBoundingBox() {
		if (this.boundingBox === null) this.boundingBox = new Box3();
		const start = this.attributes.instanceStart;
		const end = this.attributes.instanceEnd;
		if (start !== void 0 && end !== void 0) {
			this.boundingBox.setFromBufferAttribute(start);
			_box.setFromBufferAttribute(end);
			this.boundingBox.union(_box);
		}
	}
	computeBoundingSphere() {
		if (this.boundingSphere === null) this.boundingSphere = new Sphere();
		if (this.boundingBox === null) this.computeBoundingBox();
		const start = this.attributes.instanceStart;
		const end = this.attributes.instanceEnd;
		if (start !== void 0 && end !== void 0) {
			const center = this.boundingSphere.center;
			this.boundingBox.getCenter(center);
			let maxRadiusSq = 0;
			for (let i = 0, il = start.count; i < il; i++) {
				_vector.fromBufferAttribute(start, i);
				maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
				_vector.fromBufferAttribute(end, i);
				maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
			}
			this.boundingSphere.radius = Math.sqrt(maxRadiusSq);
			if (isNaN(this.boundingSphere.radius)) console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.", this);
		}
	}
	toJSON() {}
};
//#endregion
export { LineSegmentsGeometry };

//# sourceMappingURL=three_addons_lines_LineSegmentsGeometry__js.js.map