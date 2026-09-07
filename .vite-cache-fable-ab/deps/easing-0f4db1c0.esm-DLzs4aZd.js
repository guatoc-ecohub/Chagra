import { Ds as Vector3, Es as Vector2, Oo as Spherical, Os as Vector4, Xr as Matrix4, Yr as Matrix3, ca as Quaternion, dn as Euler, ot as Color } from "./three.module-BUyxIFmx.js";
//#region ../../home/kortux/Workspace/chagra/node_modules/maath/dist/isNativeReflectConstruct-5594d075.esm.js
function _setPrototypeOf(o, p) {
	_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
		o.__proto__ = p;
		return o;
	};
	return _setPrototypeOf(o, p);
}
function _isNativeReflectConstruct() {
	if (typeof Reflect === "undefined" || !Reflect.construct) return false;
	if (Reflect.construct.sham) return false;
	if (typeof Proxy === "function") return true;
	try {
		Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
		return true;
	} catch (e) {
		return false;
	}
}
//#endregion
//#region ../../home/kortux/Workspace/chagra/node_modules/maath/dist/matrix-baa530bf.esm.js
/**
*
* @param terms
*
* | a b c |
* | d e f |
* | g h i |
*
* @returns {number} determinant
*/
function determinant3() {
	for (var _len2 = arguments.length, terms = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) terms[_key2] = arguments[_key2];
	var a = terms[0], b = terms[1], c = terms[2], d = terms[3], e = terms[4], f = terms[5], g = terms[6], h = terms[7], i = terms[8];
	return a * e * i + b * f * g + c * d * h - c * e * g - b * d * i - a * f * h;
}
/**
*
*/
function matrixSum3(m1, m2) {
	var sum = [];
	var m1Array = m1.toArray();
	var m2Array = m2.toArray();
	for (var i = 0; i < m1Array.length; i++) sum[i] = m1Array[i] + m2Array[i];
	return new Matrix3().fromArray(sum);
}
//#endregion
//#region ../../home/kortux/Workspace/chagra/node_modules/maath/dist/triangle-b62b9067.esm.js
function _arrayWithHoles(arr) {
	if (Array.isArray(arr)) return arr;
}
function _iterableToArrayLimit(arr, i) {
	var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
	if (_i == null) return;
	var _arr = [];
	var _n = true;
	var _d = false;
	var _s, _e;
	try {
		for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
			_arr.push(_s.value);
			if (i && _arr.length === i) break;
		}
	} catch (err) {
		_d = true;
		_e = err;
	} finally {
		try {
			if (!_n && _i["return"] != null) _i["return"]();
		} finally {
			if (_d) throw _e;
		}
	}
	return _arr;
}
function _arrayLikeToArray(arr, len) {
	if (len == null || len > arr.length) len = arr.length;
	for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
	return arr2;
}
function _unsupportedIterableToArray(o, minLen) {
	if (!o) return;
	if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	var n = Object.prototype.toString.call(o).slice(8, -1);
	if (n === "Object" && o.constructor) n = o.constructor.name;
	if (n === "Map" || n === "Set") return Array.from(o);
	if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _nonIterableRest() {
	throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _slicedToArray(arr, i) {
	return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}
function _arrayWithoutHoles(arr) {
	if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
	if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _nonIterableSpread() {
	throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _toConsumableArray(arr) {
	return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _construct(Parent, args, Class) {
	if (_isNativeReflectConstruct()) _construct = Reflect.construct;
	else _construct = function _construct(Parent, args, Class) {
		var a = [null];
		a.push.apply(a, args);
		var instance = new (Function.bind.apply(Parent, a))();
		if (Class) _setPrototypeOf(instance, Class.prototype);
		return instance;
	};
	return _construct.apply(null, arguments);
}
function triangleDeterminant(triangle) {
	var _triangle$4 = _slicedToArray(triangle[0], 2), x1 = _triangle$4[0], y1 = _triangle$4[1];
	var _triangle$5 = _slicedToArray(triangle[1], 2), x2 = _triangle$5[0], y2 = _triangle$5[1];
	var _triangle$6 = _slicedToArray(triangle[2], 2), x3 = _triangle$6[0], y3 = _triangle$6[1];
	return determinant3(x1, y1, 1, x2, y2, 1, x3, y3, 1);
}
/**
* Uses triangle area determinant to check if 3 points are collinear.
* If they are, they can't make a triangle, so the determinant will be 0!
*
*      0     1     2
* ─────■─────■─────■
*
*
* Fun fact, you can use this same determinant to check the order of the points in the triangle
*
* NOTE: Should this use a buffer instead? NOTE: Should this use a buffer instead? [x0, y0, x1, y1, x2, y2]?
*
*/
function arePointsCollinear(points) {
	return triangleDeterminant(points) === 0;
}
var mv1 = new Vector2();
var mv2 = new Vector2();
/**

╱      ╲     
╱        ╲    
▕          ▏   

right      left  

* NOTE: Should this use a buffer instead? [x0, y0, x1, y1]?
*/
function doThreePointsMakeARight(points) {
	var _points$map2 = _slicedToArray(points.map(function(p) {
		if (Array.isArray(p)) return _construct(Vector2, _toConsumableArray(p));
		return p;
	}), 3), p1 = _points$map2[0], p2 = _points$map2[1], p3 = _points$map2[2];
	if (arePointsCollinear(points)) return false;
	var p2p1 = mv1.subVectors(p2, p1);
	return mv2.subVectors(p3, p1).cross(p2p1) > 0;
}
//#endregion
//#region ../../home/kortux/Workspace/chagra/node_modules/maath/dist/misc-19a3ec46.esm.js
/**
* Clamps a value between a range.
*/
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
function repeat(t, length) {
	return clamp(t - Math.floor(t / length) * length, 0, length);
}
function deltaAngle(current, target) {
	var delta = repeat(target - current, Math.PI * 2);
	if (delta > Math.PI) delta -= Math.PI * 2;
	return delta;
}
/**
* Converts degrees to radians.
*/
function degToRad(degrees) {
	return degrees / 180 * Math.PI;
}
/**
* Converts radians to degrees.
*/
function radToDeg(radians) {
	return radians * 180 / Math.PI;
}
function fibonacciOnSphere(buffer, _ref) {
	var _ref$radius = _ref.radius, radius = _ref$radius === void 0 ? 1 : _ref$radius;
	var samples = buffer.length / 3;
	var offset = 2 / samples;
	var increment = Math.PI * .7639320225000001;
	for (var i = 0; i < buffer.length; i += 3) {
		var y = i * offset - 1 + offset / 2;
		var distance = Math.sqrt(1 - Math.pow(y, 2));
		var phi = i % samples * increment;
		var x = Math.cos(phi) * distance;
		var z = Math.sin(phi) * distance;
		buffer[i] = x * radius;
		buffer[i + 1] = y * radius;
		buffer[i + 2] = z * radius;
	}
}
function vectorEquals(a, b) {
	var eps = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Number.EPSILON;
	return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.z - b.z) < eps;
}
/**
* Sorts vectors in lexicographic order, works with both v2 and v3
*
*  Use as:
*  const sorted = arrayOfVectors.sort(lexicographicOrder)
*/
function lexicographic(a, b) {
	if (a.x === b.x) {
		if (typeof a.z !== "undefined") {
			if (a.y === b.y) return a.z - b.z;
		}
		return a.y - b.y;
	}
	return a.x - b.x;
}
/**
* Convex Hull
*
* Returns an array of 2D Vectors representing the convex hull of a set of 2D Vectors
*/
/**
* Calculate the convex hull of a set of points
*/
function convexHull(_points) {
	var points = _points.sort(lexicographic);
	var lUpper = [points[0], points[1]];
	for (var i = 2; i < points.length; i++) {
		lUpper.push(points[i]);
		while (lUpper.length > 2 && doThreePointsMakeARight(_toConsumableArray(lUpper.slice(-3)))) lUpper.splice(lUpper.length - 2, 1);
	}
	var lLower = [points[points.length - 1], points[points.length - 2]];
	for (var _i = points.length - 3; _i >= 0; _i--) {
		lLower.push(points[_i]);
		while (lLower.length > 2 && doThreePointsMakeARight(_toConsumableArray(lLower.slice(-3)))) lLower.splice(lLower.length - 2, 1);
	}
	lLower.splice(0, 1);
	lLower.splice(lLower.length - 1, 1);
	return [].concat(lUpper, lLower);
}
function remap(x, _ref2, _ref3) {
	var _ref4 = _slicedToArray(_ref2, 2), low1 = _ref4[0], high1 = _ref4[1];
	var _ref5 = _slicedToArray(_ref3, 2), low2 = _ref5[0], high2 = _ref5[1];
	return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}
/**
*
* https://www.desmos.com/calculator/vsnmlaljdu
*
* Ease-in-out, goes to -Infinite before 0 and Infinite after 1
*
* @param t
* @returns
*/
function fade(t) {
	return t * t * t * (t * (t * 6 - 15) + 10);
}
/**
*
* Returns the result of linearly interpolating between input A and input B by input T.
*
* @param v0
* @param v1
* @param t
* @returns
*/
function lerp(v0, v1, t) {
	return v0 * (1 - t) + v1 * t;
}
/**
*
* Returns the linear parameter that produces the interpolant specified by input T within the range of input A to input B.
*
* @param v0
* @param v1
* @param t
* @returns
*/
function inverseLerp(v0, v1, t) {
	return (t - v0) / (v1 - v0);
}
/**
*
*/
function normalize(x, y, z) {
	var m = Math.sqrt(x * x + y * y + z * z);
	return [
		x / m,
		y / m,
		z / m
	];
}
/**
*
*/
function pointOnCubeToPointOnSphere(x, y, z) {
	var x2 = x * x;
	var y2 = y * y;
	var z2 = z * z;
	return [
		x * Math.sqrt(1 - (y2 + z2) / 2 + y2 * z2 / 3),
		y * Math.sqrt(1 - (z2 + x2) / 2 + z2 * x2 / 3),
		z * Math.sqrt(1 - (x2 + y2) / 2 + x2 * y2 / 3)
	];
}
/**
* Give two unit vectors a and b, returns the transformation matrix that rotates a onto b.
*
* */
function rotateVectorOnVector(a, b) {
	var v = new Vector3().crossVectors(a, b);
	var c = a.dot(b);
	var i = new Matrix3().identity();
	var vx = new Matrix3().set(0, -v.z, v.y, v.z, 0, -v.x, -v.y, v.x, 0);
	var vxsquared = new Matrix3().multiplyMatrices(vx, vx).multiplyScalar(1 / (1 + c));
	return matrixSum3(matrixSum3(i, vx), vxsquared);
}
function pointToCoordinate(x, y, z) {
	return [Math.asin(y), Math.atan2(x, -z)];
}
function coordinateToPoint(lat, lon) {
	var y = Math.sin(lat);
	var r = Math.cos(lat);
	return [
		Math.sin(lon) * r,
		y,
		-Math.cos(lon) * r
	];
}
/**
* Given a plane and a segment, return the intersection point if it exists or null it doesn't.
*/
function planeSegmentIntersection(plane, segment) {
	var _segment = _slicedToArray(segment, 2), a = _segment[0], b = _segment[1];
	var matrix = rotateVectorOnVector(plane.normal, new Vector3(0, 1, 0));
	var t = inverseLerp(a.clone().applyMatrix3(matrix).y, b.clone().applyMatrix3(matrix).y, 0);
	return new Vector3().lerpVectors(a, b, t);
}
/**
* Given a plane and a point, return the distance.
*/
function pointToPlaneDistance(p, plane) {
	return plane.normal.dot(p);
}
function getIndexFrom3D(coords, sides) {
	var _coords = _slicedToArray(coords, 3), ix = _coords[0], iy = _coords[1], iz = _coords[2];
	var _sides = _slicedToArray(sides, 2), rx = _sides[0], ry = _sides[1];
	return iz * rx * ry + iy * rx + ix;
}
function get3DFromIndex(index, size) {
	var _size = _slicedToArray(size, 2), rx = _size[0];
	var a = rx * _size[1];
	var z = index / a;
	var b = index - a * z;
	var y = b / rx;
	return [
		b % rx,
		y,
		z
	];
}
function getIndexFrom2D(coords, size) {
	return coords[0] + size[0] * coords[1];
}
function get2DFromIndex(index, columns) {
	return [index % columns, Math.floor(index / columns)];
}
var misc = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	clamp,
	repeat,
	deltaAngle,
	degToRad,
	radToDeg,
	fibonacciOnSphere,
	vectorEquals,
	lexicographic,
	convexHull,
	remap,
	fade,
	lerp,
	inverseLerp,
	normalize,
	pointOnCubeToPointOnSphere,
	rotateVectorOnVector,
	pointToCoordinate,
	coordinateToPoint,
	planeSegmentIntersection,
	pointToPlaneDistance,
	getIndexFrom3D,
	get3DFromIndex,
	getIndexFrom2D,
	get2DFromIndex
});
//#endregion
//#region ../../home/kortux/Workspace/chagra/node_modules/maath/dist/easing-0f4db1c0.esm.js
var rsqw = function rsqw(t) {
	var delta = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : .01;
	var a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
	var f = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 1 / (2 * Math.PI);
	return a / Math.atan(1 / delta) * Math.atan(Math.sin(2 * Math.PI * t * f) / delta);
};
var exp = function exp(t) {
	return 1 / (1 + t + .48 * t * t + .235 * t * t * t);
};
var linear = function linear(t) {
	return t;
};
var sine = {
	"in": function _in(x) {
		return 1 - Math.cos(x * Math.PI / 2);
	},
	out: function out(x) {
		return Math.sin(x * Math.PI / 2);
	},
	inOut: function inOut(x) {
		return -(Math.cos(Math.PI * x) - 1) / 2;
	}
};
var cubic = {
	"in": function _in(x) {
		return x * x * x;
	},
	out: function out(x) {
		return 1 - Math.pow(1 - x, 3);
	},
	inOut: function inOut(x) {
		return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
	}
};
var quint = {
	"in": function _in(x) {
		return x * x * x * x * x;
	},
	out: function out(x) {
		return 1 - Math.pow(1 - x, 5);
	},
	inOut: function inOut(x) {
		return x < .5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
	}
};
var circ = {
	"in": function _in(x) {
		return 1 - Math.sqrt(1 - Math.pow(x, 2));
	},
	out: function out(x) {
		return Math.sqrt(1 - Math.pow(x - 1, 2));
	},
	inOut: function inOut(x) {
		return x < .5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
	}
};
var quart = {
	"in": function _in(t) {
		return t * t * t * t;
	},
	out: function out(t) {
		return 1 - --t * t * t * t;
	},
	inOut: function inOut(t) {
		return t < .5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
	}
};
var expo = {
	"in": function _in(x) {
		return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
	},
	out: function out(x) {
		return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
	},
	inOut: function inOut(x) {
		return x === 0 ? 0 : x === 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
	}
};
/**
* Damp, based on Game Programming Gems 4 Chapter 1.10
*   Return value indicates whether the animation is still running.
*/
function damp(current, prop, target) {
	var smoothTime = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : .25;
	var delta = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : .01;
	var maxSpeed = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : Infinity;
	var easing = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : exp;
	var eps = arguments.length > 7 && arguments[7] !== void 0 ? arguments[7] : .001;
	var vel = "velocity_" + prop;
	if (current.__damp === void 0) current.__damp = {};
	if (current.__damp[vel] === void 0) current.__damp[vel] = 0;
	if (Math.abs(current[prop] - target) <= eps) {
		current[prop] = target;
		return false;
	}
	smoothTime = Math.max(1e-4, smoothTime);
	var omega = 2 / smoothTime;
	var t = easing(omega * delta);
	var change = current[prop] - target;
	var originalTo = target;
	var maxChange = maxSpeed * smoothTime;
	change = Math.min(Math.max(change, -maxChange), maxChange);
	target = current[prop] - change;
	var temp = (current.__damp[vel] + omega * change) * delta;
	current.__damp[vel] = (current.__damp[vel] - omega * temp) * t;
	var output = target + (change + temp) * t;
	if (originalTo - current[prop] > 0 === output > originalTo) {
		output = originalTo;
		current.__damp[vel] = (output - originalTo) / delta;
	}
	current[prop] = output;
	return true;
}
/**
* DampLookAt
*/
var isCamera = function isCamera(v) {
	return v && v.isCamera;
};
var isLight = function isLight(v) {
	return v && v.isLight;
};
var vl3d = /*@__PURE__*/ new Vector3();
var _q1 = /*@__PURE__*/ new Quaternion();
var _q2 = /*@__PURE__*/ new Quaternion();
var _m1 = /*@__PURE__*/ new Matrix4();
var _position = /*@__PURE__*/ new Vector3();
function dampLookAt(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (typeof target === "number") vl3d.setScalar(target);
	else if (Array.isArray(target)) vl3d.set(target[0], target[1], target[2]);
	else vl3d.copy(target);
	var parent = current.parent;
	current.updateWorldMatrix(true, false);
	_position.setFromMatrixPosition(current.matrixWorld);
	if (isCamera(current) || isLight(current)) _m1.lookAt(_position, vl3d, current.up);
	else _m1.lookAt(vl3d, _position, current.up);
	dampQ(current.quaternion, _q2.setFromRotationMatrix(_m1), smoothTime, delta, maxSpeed, easing, eps);
	if (parent) {
		_m1.extractRotation(parent.matrixWorld);
		_q1.setFromRotationMatrix(_m1);
		dampQ(current.quaternion, _q2.copy(current.quaternion).premultiply(_q1.invert()), smoothTime, delta, maxSpeed, easing, eps);
	}
}
/**
* DampAngle, with a shortest-path
*/
function dampAngle(current, prop, target, smoothTime, delta, maxSpeed, easing, eps) {
	return damp(current, prop, current[prop] + deltaAngle(current[prop], target), smoothTime, delta, maxSpeed, easing, eps);
}
/**
* Vector2D Damp
*/
var v2d = /*@__PURE__*/ new Vector2();
var a2, b2;
function damp2(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (typeof target === "number") v2d.setScalar(target);
	else if (Array.isArray(target)) v2d.set(target[0], target[1]);
	else v2d.copy(target);
	a2 = damp(current, "x", v2d.x, smoothTime, delta, maxSpeed, easing, eps);
	b2 = damp(current, "y", v2d.y, smoothTime, delta, maxSpeed, easing, eps);
	return a2 || b2;
}
/**
* Vector3D Damp
*/
var v3d = /*@__PURE__*/ new Vector3();
var a3, b3, c3;
function damp3(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (typeof target === "number") v3d.setScalar(target);
	else if (Array.isArray(target)) v3d.set(target[0], target[1], target[2]);
	else v3d.copy(target);
	a3 = damp(current, "x", v3d.x, smoothTime, delta, maxSpeed, easing, eps);
	b3 = damp(current, "y", v3d.y, smoothTime, delta, maxSpeed, easing, eps);
	c3 = damp(current, "z", v3d.z, smoothTime, delta, maxSpeed, easing, eps);
	return a3 || b3 || c3;
}
/**
* Vector4D Damp
*/
var v4d = /*@__PURE__*/ new Vector4();
var a4, b4, c4, d4;
function damp4(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (typeof target === "number") v4d.setScalar(target);
	else if (Array.isArray(target)) v4d.set(target[0], target[1], target[2], target[3]);
	else v4d.copy(target);
	a4 = damp(current, "x", v4d.x, smoothTime, delta, maxSpeed, easing, eps);
	b4 = damp(current, "y", v4d.y, smoothTime, delta, maxSpeed, easing, eps);
	c4 = damp(current, "z", v4d.z, smoothTime, delta, maxSpeed, easing, eps);
	d4 = damp(current, "w", v4d.w, smoothTime, delta, maxSpeed, easing, eps);
	return a4 || b4 || c4 || d4;
}
/**
* Euler Damp
*/
var rot = /*@__PURE__*/ new Euler();
var aE, bE, cE;
function dampE(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (Array.isArray(target)) rot.set(target[0], target[1], target[2], target[3]);
	else rot.copy(target);
	aE = dampAngle(current, "x", rot.x, smoothTime, delta, maxSpeed, easing, eps);
	bE = dampAngle(current, "y", rot.y, smoothTime, delta, maxSpeed, easing, eps);
	cE = dampAngle(current, "z", rot.z, smoothTime, delta, maxSpeed, easing, eps);
	return aE || bE || cE;
}
/**
* Color Damp
*/
var col = /*@__PURE__*/ new Color();
var aC, bC, cC;
function dampC(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (target instanceof Color) col.copy(target);
	else if (Array.isArray(target)) col.setRGB(target[0], target[1], target[2]);
	else col.set(target);
	aC = damp(current, "r", col.r, smoothTime, delta, maxSpeed, easing, eps);
	bC = damp(current, "g", col.g, smoothTime, delta, maxSpeed, easing, eps);
	cC = damp(current, "b", col.b, smoothTime, delta, maxSpeed, easing, eps);
	return aC || bC || cC;
}
/**
* Quaternion Damp
* https://gist.github.com/maxattack/4c7b4de00f5c1b95a33b
* Copyright 2016 Max Kaufmann (max.kaufmann@gmail.com)
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var qt = /*@__PURE__*/ new Quaternion();
var v4result = /*@__PURE__*/ new Vector4();
var v4velocity = /*@__PURE__*/ new Vector4();
var v4error = /*@__PURE__*/ new Vector4();
var aQ, bQ, cQ, dQ;
function dampQ(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	var cur = current;
	if (Array.isArray(target)) qt.set(target[0], target[1], target[2], target[3]);
	else qt.copy(target);
	var multi = current.dot(qt) > 0 ? 1 : -1;
	qt.x *= multi;
	qt.y *= multi;
	qt.z *= multi;
	qt.w *= multi;
	aQ = damp(current, "x", qt.x, smoothTime, delta, maxSpeed, easing, eps);
	bQ = damp(current, "y", qt.y, smoothTime, delta, maxSpeed, easing, eps);
	cQ = damp(current, "z", qt.z, smoothTime, delta, maxSpeed, easing, eps);
	dQ = damp(current, "w", qt.w, smoothTime, delta, maxSpeed, easing, eps);
	v4result.set(current.x, current.y, current.z, current.w).normalize();
	v4velocity.set(cur.__damp.velocity_x, cur.__damp.velocity_y, cur.__damp.velocity_z, cur.__damp.velocity_w);
	v4error.copy(v4result).multiplyScalar(v4velocity.dot(v4result) / v4result.dot(v4result));
	cur.__damp.velocity_x -= v4error.x;
	cur.__damp.velocity_y -= v4error.y;
	cur.__damp.velocity_z -= v4error.z;
	cur.__damp.velocity_w -= v4error.w;
	current.set(v4result.x, v4result.y, v4result.z, v4result.w);
	return aQ || bQ || cQ || dQ;
}
/**
* Spherical Damp
*/
var spherical = /*@__PURE__*/ new Spherical();
var aS, bS, cS;
function dampS(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	if (Array.isArray(target)) spherical.set(target[0], target[1], target[2]);
	else spherical.copy(target);
	aS = damp(current, "radius", spherical.radius, smoothTime, delta, maxSpeed, easing, eps);
	bS = dampAngle(current, "phi", spherical.phi, smoothTime, delta, maxSpeed, easing, eps);
	cS = dampAngle(current, "theta", spherical.theta, smoothTime, delta, maxSpeed, easing, eps);
	return aS || bS || cS;
}
/**
* Matrix4 Damp
*/
var mat = /*@__PURE__*/ new Matrix4();
var mPos = /*@__PURE__*/ new Vector3();
var mRot = /*@__PURE__*/ new Quaternion();
var mSca = /*@__PURE__*/ new Vector3();
var aM, bM, cM;
function dampM(current, target, smoothTime, delta, maxSpeed, easing, eps) {
	var cur = current;
	if (cur.__damp === void 0) {
		cur.__damp = {
			position: new Vector3(),
			rotation: new Quaternion(),
			scale: new Vector3()
		};
		current.decompose(cur.__damp.position, cur.__damp.rotation, cur.__damp.scale);
	}
	if (Array.isArray(target)) mat.set.apply(mat, _toConsumableArray(target));
	else mat.copy(target);
	mat.decompose(mPos, mRot, mSca);
	aM = damp3(cur.__damp.position, mPos, smoothTime, delta, maxSpeed, easing, eps);
	bM = dampQ(cur.__damp.rotation, mRot, smoothTime, delta, maxSpeed, easing, eps);
	cM = damp3(cur.__damp.scale, mSca, smoothTime, delta, maxSpeed, easing, eps);
	current.compose(cur.__damp.position, cur.__damp.rotation, cur.__damp.scale);
	return aM || bM || cM;
}
var easing = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	rsqw,
	exp,
	linear,
	sine,
	cubic,
	quint,
	circ,
	quart,
	expo,
	damp,
	dampLookAt,
	dampAngle,
	damp2,
	damp3,
	damp4,
	dampE,
	dampC,
	dampQ,
	dampS,
	dampM
});
//#endregion
export { misc as S, linear as _, damp3 as a, rsqw as b, dampC as c, dampM as d, dampQ as f, expo as g, exp as h, damp2 as i, dampE as l, easing as m, cubic as n, damp4 as o, dampS as p, damp as r, dampAngle as s, circ as t, dampLookAt as u, quart as v, sine as x, quint as y };

//# sourceMappingURL=easing-0f4db1c0.esm-DLzs4aZd.js.map