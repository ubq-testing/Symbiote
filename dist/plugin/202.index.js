export const id = 202;
export const ids = [202];
export const modules = {

/***/ 1170:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   y: () => (/* binding */ dntGlobalThis)
/* harmony export */ });
const dntGlobals = {};
const dntGlobalThis = createMergeProxy(globalThis, dntGlobals);
function createMergeProxy(baseObj, extObj) {
    return new Proxy(baseObj, {
        get(_target, prop, _receiver) {
            if (prop in extObj) {
                return extObj[prop];
            }
            else {
                return baseObj[prop];
            }
        },
        set(_target, prop, value) {
            if (prop in extObj) {
                delete extObj[prop];
            }
            baseObj[prop] = value;
            return true;
        },
        deleteProperty(_target, prop) {
            let success = false;
            if (prop in extObj) {
                delete extObj[prop];
                success = true;
            }
            if (prop in baseObj) {
                delete baseObj[prop];
                success = true;
            }
            return success;
        },
        ownKeys(_target) {
            const baseKeys = Reflect.ownKeys(baseObj);
            const extKeys = Reflect.ownKeys(extObj);
            const extKeysSet = new Set(extKeys);
            return [...baseKeys.filter((k) => !extKeysSet.has(k)), ...extKeys];
        },
        defineProperty(_target, prop, desc) {
            if (prop in extObj) {
                delete extObj[prop];
            }
            Reflect.defineProperty(baseObj, prop, desc);
            return true;
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (prop in extObj) {
                return Reflect.getOwnPropertyDescriptor(extObj, prop);
            }
            else {
                return Reflect.getOwnPropertyDescriptor(baseObj, prop);
            }
        },
        has(_target, prop) {
            return prop in extObj || prop in baseObj;
        },
    });
}


/***/ }),

/***/ 6528:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  kP: () => (/* binding */ ByteReader),
  cF: () => (/* binding */ checkEnd),
  Xo: () => (/* binding */ compareBytes),
  S3: () => (/* binding */ computeBigintMinimumNumberOfBytes),
  EF: () => (/* reexport */ decodeHex),
  mU: () => (/* reexport */ encodeHex),
  ex: () => (/* binding */ equalBytes),
  pK: () => (/* binding */ flipBytes)
});

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/encoding/_util.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
const encoder = new TextEncoder();
function getTypeName(value) {
    const type = typeof value;
    if (type !== "object") {
        return type;
    }
    else if (value === null) {
        return "null";
    }
    else {
        return value?.constructor?.name ?? "object";
    }
}
function validateBinaryLike(source) {
    if (typeof source === "string") {
        return encoder.encode(source);
    }
    else if (source instanceof Uint8Array) {
        return source;
    }
    else if (source instanceof ArrayBuffer) {
        return new Uint8Array(source);
    }
    throw new TypeError(`The input must be a Uint8Array, a string, or an ArrayBuffer. Received a value of the type ${getTypeName(source)}.`);
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/encoding/hex.js
// Copyright 2009 The Go Authors. All rights reserved.
// https://github.com/golang/go/blob/master/LICENSE
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

/** Port of the Go
 * [encoding/hex](https://github.com/golang/go/blob/go1.12.5/src/encoding/hex/hex.go)
 * library.
 *
 * This module is browser compatible.
 *
 * @example
 * ```ts
 * import {
 *   decodeHex,
 *   encodeHex,
 * } from "https://deno.land/std@$STD_VERSION/encoding/hex.ts";
 *
 * const binary = new TextEncoder().encode("abc");
 * const encoded = encodeHex(binary);
 * console.log(encoded);
 * // => "616263"
 *
 * console.log(decodeHex(encoded));
 * // => Uint8Array(3) [ 97, 98, 99 ]
 * ```
 *
 * @module
 */
const hexTable = new TextEncoder().encode("0123456789abcdef");
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function errInvalidByte(byte) {
    return new TypeError(`Invalid byte '${String.fromCharCode(byte)}'`);
}
function errLength() {
    return new RangeError("Odd length hex string");
}
/** Converts a hex character into its value. */
function fromHexChar(byte) {
    // '0' <= byte && byte <= '9'
    if (48 <= byte && byte <= 57)
        return byte - 48;
    // 'a' <= byte && byte <= 'f'
    if (97 <= byte && byte <= 102)
        return byte - 97 + 10;
    // 'A' <= byte && byte <= 'F'
    if (65 <= byte && byte <= 70)
        return byte - 65 + 10;
    throw errInvalidByte(byte);
}
/**
 * @deprecated (will be removed in 0.210.0) Use {@linkcode encodeHex} instead.
 *
 * Encodes `src` into `src.length * 2` bytes.
 */
function encode(src) {
    const dst = new Uint8Array(src.length * 2);
    for (let i = 0; i < dst.length; i++) {
        const v = src[i];
        dst[i * 2] = hexTable[v >> 4];
        dst[i * 2 + 1] = hexTable[v & 0x0f];
    }
    return dst;
}
/** Encodes the source into hex string. */
function encodeHex(src) {
    const u8 = validateBinaryLike(src);
    const dst = new Uint8Array(u8.length * 2);
    for (let i = 0; i < dst.length; i++) {
        const v = u8[i];
        dst[i * 2] = hexTable[v >> 4];
        dst[i * 2 + 1] = hexTable[v & 0x0f];
    }
    return textDecoder.decode(dst);
}
/**
 * @deprecated (will be removed in 0.210.0) Use {@linkcode decodeHex} instead.
 *
 * Decodes `src` into `src.length / 2` bytes.
 * If the input is malformed, an error will be thrown.
 */
function decode(src) {
    const dst = new Uint8Array(src.length / 2);
    for (let i = 0; i < dst.length; i++) {
        const a = fromHexChar(src[i * 2]);
        const b = fromHexChar(src[i * 2 + 1]);
        dst[i] = (a << 4) | b;
    }
    if (src.length % 2 === 1) {
        // Check for invalid char before reporting bad length,
        // since the invalid char (if present) is an earlier problem.
        fromHexChar(src[dst.length * 2]);
        throw errLength();
    }
    return dst;
}
/** Decodes the given hex string to Uint8Array.
 * If the input is malformed, an error will be thrown. */
function decodeHex(src) {
    const u8 = textEncoder.encode(src);
    const dst = new Uint8Array(u8.length / 2);
    for (let i = 0; i < dst.length; i++) {
        const a = fromHexChar(u8[i * 2]);
        const b = fromHexChar(u8[i * 2 + 1]);
        dst[i] = (a << 4) | b;
    }
    if (u8.length % 2 === 1) {
        // Check for invalid char before reporting bad length,
        // since the invalid char (if present) is an earlier problem.
        fromHexChar(u8[dst.length * 2]);
        throw errLength();
    }
    return dst;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/bytes/concat.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
function concat(...buf) {
    /**
     * @todo(iuioiua): Revert to the old implementation upon removal of the
     * spread signatures.
     *
     * @see {@link https://github.com/denoland/deno_std/blob/e6c61ba64d547b60076422bbc1f6ad33184cc10a/bytes/concat.ts}
     */
    // No need to concatenate if there is only one element in array or sub-array
    if (buf.length === 1) {
        if (!Array.isArray(buf[0])) {
            return buf[0];
        }
        else if (buf[0].length === 1) {
            return buf[0][0];
        }
    }
    let length = 0;
    for (const b of buf) {
        if (Array.isArray(b)) {
            for (const b1 of b) {
                length += b1.length;
            }
        }
        else {
            length += b.length;
        }
    }
    const output = new Uint8Array(length);
    let index = 0;
    for (const b of buf) {
        if (Array.isArray(b)) {
            for (const b1 of b) {
                output.set(b1, index);
                index += b1.length;
            }
        }
        else {
            output.set(b, index);
            index += b.length;
        }
    }
    return output;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/bytes.js
// Copyright 2023 the Deno authors. All rights reserved. MIT license.


function checkEnd(bytes, pos) {
    const extra = bytes.length - pos;
    if (extra > 0)
        throw new Error(`Unexpected trailing bytes: ${extra}`);
}
function equalBytes(lhs, rhs) {
    if (lhs.length !== rhs.length)
        return false;
    for (let i = 0; i < lhs.length; i++) {
        if (lhs[i] !== rhs[i])
            return false;
    }
    return true;
}
function flipBytes(arr, start = 0) {
    for (let i = start; i < arr.length; i++) {
        arr[i] = 0xff - arr[i];
    }
}
function computeBigintMinimumNumberOfBytes(val) {
    let n = 0;
    while (val !== 0n) {
        val >>= 8n;
        n++;
    }
    return n;
}
function compareBytes(lhs, rhs) {
    if (lhs === rhs)
        return 0;
    let x = lhs.length, y = rhs.length;
    const len = Math.min(x, y);
    for (let i = 0; i < len; i++) {
        if (lhs[i] !== rhs[i]) {
            x = lhs[i];
            y = rhs[i];
            break;
        }
    }
    return x < y ? -1 : y < x ? 1 : 0;
}
//
const ZERO_BYTES = new Uint8Array(0);
class ByteReader {
    constructor(reader) {
        Object.defineProperty(this, "reader", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "remaining", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ZERO_BYTES
        });
        Object.defineProperty(this, "done", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.reader = reader;
    }
    async read(bytes) {
        if (bytes < 0)
            throw new Error(`Invalid bytes: ${bytes}`);
        if (bytes === 0)
            return { done: false, value: ZERO_BYTES };
        while (this.remaining.length < bytes && !this.done) {
            const { done, value } = await this.reader.read();
            if (done) {
                this.done = true;
            }
            else {
                this.remaining = concat([this.remaining, value]);
            }
        }
        const { remaining } = this;
        if (remaining.length < bytes && this.done) {
            return { done: true, value: undefined };
        }
        const value = remaining.slice(0, bytes);
        this.remaining = remaining.slice(bytes);
        return { done: false, value };
    }
}


/***/ }),

/***/ 2423:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ar: () => (/* binding */ isDateTime),
/* harmony export */   EQ: () => (/* binding */ checkRecord),
/* harmony export */   Em: () => (/* binding */ checkString),
/* harmony export */   UW: () => (/* binding */ checkOptionalString),
/* harmony export */   Ur: () => (/* binding */ checkOptionalObject),
/* harmony export */   Yj: () => (/* binding */ checkKeyNotEmpty),
/* harmony export */   bk: () => (/* binding */ checkExpireIn),
/* harmony export */   c8: () => (/* binding */ checkOptionalNumber),
/* harmony export */   pm: () => (/* binding */ checkOptionalBoolean),
/* harmony export */   u4: () => (/* binding */ isRecord),
/* harmony export */   vS: () => (/* binding */ checkOptionalFunction),
/* harmony export */   z6: () => (/* binding */ check)
/* harmony export */ });
/* unused harmony export checkMatches */
// Copyright 2023 the Deno authors. All rights reserved. MIT license.
function isRecord(obj) {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj) &&
        obj.constructor === Object;
}
function isDateTime(value) {
    return typeof value === "string" &&
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?Z$/.test(value);
}
function checkKeyNotEmpty(key) {
    if (key.length === 0)
        throw new TypeError(`Key cannot be empty`);
}
function checkExpireIn(expireIn) {
    const valid = expireIn === undefined ||
        typeof expireIn === "number" && expireIn > 0 &&
            Number.isSafeInteger(expireIn);
    if (!valid) {
        throw new TypeError(`Bad 'expireIn', expected optional positive integer, found ${expireIn}`);
    }
}
function checkMatches(name, value, pattern) {
    const m = pattern.exec(value);
    if (!m)
        throw new TypeError(`Bad '${name}': ${value}`);
    return m;
}
function checkString(name, value) {
    if (typeof value !== "string") {
        throw new TypeError(`Bad '${name}': expected string, found ${value}`);
    }
}
function checkOptionalString(name, value) {
    if (!(value === undefined || typeof value === "string")) {
        throw new TypeError(`Bad '${name}': expected optional string, found ${value}`);
    }
}
function checkRecord(name, value) {
    if (!isRecord(value)) {
        throw new TypeError(`Bad '${name}': expected simple object, found ${value}`);
    }
}
function checkOptionalBoolean(name, value) {
    if (!(value === undefined || typeof value === "boolean")) {
        throw new TypeError(`Bad '${name}': expected optional boolean, found ${value}`);
    }
}
function checkOptionalNumber(name, value) {
    if (!(value === undefined || typeof value === "number")) {
        throw new TypeError(`Bad '${name}': expected optional number, found ${value}`);
    }
}
// deno-lint-ignore ban-types
function checkOptionalFunction(name, value) {
    if (!(value === undefined || typeof value === "function")) {
        throw new TypeError(`Bad '${name}': expected optional function, found ${value}`);
    }
}
function checkOptionalObject(name, value) {
    if (!(value === undefined || typeof value === "object")) {
        throw new TypeError(`Bad '${name}': expected optional object, found ${value}`);
    }
}
function check(name, value, valid) {
    if (!valid)
        throw new TypeError(`Bad '${name}': ${value}`);
}


/***/ }),

/***/ 8880:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  o: () => (/* binding */ makeInMemoryService)
});

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/assert/assertion_error.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
class AssertionError extends Error {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "AssertionError"
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/assert/assert_instance_of.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

/**
 * Make an assertion that `obj` is an instance of `type`.
 * If not then throw.
 */
function assertInstanceOf(actual, expectedType, msg = "") {
    if (actual instanceof expectedType)
        return;
    const msgSuffix = msg ? `: ${msg}` : ".";
    const expectedTypeStr = expectedType.name;
    let actualTypeStr = "";
    if (actual === null) {
        actualTypeStr = "null";
    }
    else if (actual === undefined) {
        actualTypeStr = "undefined";
    }
    else if (typeof actual === "object") {
        actualTypeStr = actual.constructor?.name ?? "Object";
    }
    else {
        actualTypeStr = typeof actual;
    }
    if (expectedTypeStr === actualTypeStr) {
        msg =
            `Expected object to be an instance of "${expectedTypeStr}"${msgSuffix}`;
    }
    else if (actualTypeStr === "function") {
        msg =
            `Expected object to be an instance of "${expectedTypeStr}" but was not an instanced object${msgSuffix}`;
    }
    else {
        msg =
            `Expected object to be an instance of "${expectedTypeStr}" but was "${actualTypeStr}"${msgSuffix}`;
    }
    throw new AssertionError(msg);
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/data_structures/comparators.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
/** This module is browser compatible. */
/** Compares its two arguments for ascending order using JavaScript's built in comparison operators. */
function ascend(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
/** Compares its two arguments for descending order using JavaScript's built in comparison operators. */
function descend(a, b) {
    return a < b ? 1 : a > b ? -1 : 0;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/data_structures/_binary_search_node.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
class BinarySearchNode {
    constructor(parent, value) {
        Object.defineProperty(this, "parent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: parent
        });
        Object.defineProperty(this, "value", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: value
        });
        Object.defineProperty(this, "left", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "right", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.left = null;
        this.right = null;
    }
    static from(node) {
        const copy = new BinarySearchNode(node.parent, node.value);
        copy.left = node.left;
        copy.right = node.right;
        return copy;
    }
    directionFromParent() {
        return this.parent === null
            ? null
            : this === this.parent.left
                ? "left"
                : this === this.parent.right
                    ? "right"
                    : null;
    }
    findMinNode() {
        let minNode = this.left;
        while (minNode?.left)
            minNode = minNode.left;
        return minNode ?? this;
    }
    findMaxNode() {
        let maxNode = this.right;
        while (maxNode?.right)
            maxNode = maxNode.right;
        return maxNode ?? this;
    }
    findSuccessorNode() {
        if (this.right !== null)
            return this.right.findMinNode();
        let parent = this.parent;
        let direction = this.directionFromParent();
        while (parent && direction === "right") {
            direction = parent.directionFromParent();
            parent = parent.parent;
        }
        return parent;
    }
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/data_structures/binary_search_tree.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.


/**
 * An unbalanced binary search tree. The values are in ascending order by default,
 * using JavaScript's built-in comparison operators to sort the values.
 *
 * For performance, it's recommended that you use a self-balancing binary search
 * tree instead of this one unless you are extending this to create a
 * self-balancing tree. See RedBlackTree for an example of how BinarySearchTree
 *  can be extended to create a self-balancing binary search tree.
 *
 * | Method        | Average Case | Worst Case |
 * | ------------- | ------------ | ---------- |
 * | find(value)   | O(log n)     | O(n)       |
 * | insert(value) | O(log n)     | O(n)       |
 * | remove(value) | O(log n)     | O(n)       |
 * | min()         | O(log n)     | O(n)       |
 * | max()         | O(log n)     | O(n)       |
 *
 * @example
 * ```ts
 * import {
 *   BinarySearchTree,
 *   ascend,
 *   descend,
 * } from "https://deno.land/std@$STD_VERSION/data_structures/mod.ts";
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/assert/assert_equals.ts";
 *
 * const values = [3, 10, 13, 4, 6, 7, 1, 14];
 * const tree = new BinarySearchTree<number>();
 * values.forEach((value) => tree.insert(value));
 * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
 * assertEquals(tree.min(), 1);
 * assertEquals(tree.max(), 14);
 * assertEquals(tree.find(42), null);
 * assertEquals(tree.find(7), 7);
 * assertEquals(tree.remove(42), false);
 * assertEquals(tree.remove(7), true);
 * assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);
 *
 * const invertedTree = new BinarySearchTree<number>(descend);
 * values.forEach((value) => invertedTree.insert(value));
 * assertEquals([...invertedTree], [14, 13, 10, 7, 6, 4, 3, 1]);
 * assertEquals(invertedTree.min(), 14);
 * assertEquals(invertedTree.max(), 1);
 * assertEquals(invertedTree.find(42), null);
 * assertEquals(invertedTree.find(7), 7);
 * assertEquals(invertedTree.remove(42), false);
 * assertEquals(invertedTree.remove(7), true);
 * assertEquals([...invertedTree], [14, 13, 10, 6, 4, 3, 1]);
 *
 * const words = new BinarySearchTree<string>((a, b) =>
 *   ascend(a.length, b.length) || ascend(a, b)
 * );
 * ["truck", "car", "helicopter", "tank", "train", "suv", "semi", "van"]
 *   .forEach((value) => words.insert(value));
 * assertEquals([...words], [
 *   "car",
 *   "suv",
 *   "van",
 *   "semi",
 *   "tank",
 *   "train",
 *   "truck",
 *   "helicopter",
 * ]);
 * assertEquals(words.min(), "car");
 * assertEquals(words.max(), "helicopter");
 * assertEquals(words.find("scooter"), null);
 * assertEquals(words.find("tank"), "tank");
 * assertEquals(words.remove("scooter"), false);
 * assertEquals(words.remove("tank"), true);
 * assertEquals([...words], [
 *   "car",
 *   "suv",
 *   "van",
 *   "semi",
 *   "train",
 *   "truck",
 *   "helicopter",
 * ]);
 * ```
 */
class BinarySearchTree {
    constructor(compare = ascend) {
        Object.defineProperty(this, "compare", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: compare
        });
        Object.defineProperty(this, "root", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_size", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    static from(collection, options) {
        let result;
        let unmappedValues = [];
        if (collection instanceof BinarySearchTree) {
            result = new BinarySearchTree(options?.compare ??
                collection.compare);
            if (options?.compare || options?.map) {
                unmappedValues = collection;
            }
            else {
                const nodes = [];
                if (collection.root) {
                    result.root = BinarySearchNode.from(collection.root);
                    nodes.push(result.root);
                }
                while (nodes.length) {
                    const node = nodes.pop();
                    const left = node.left
                        ? BinarySearchNode.from(node.left)
                        : null;
                    const right = node.right
                        ? BinarySearchNode.from(node.right)
                        : null;
                    if (left) {
                        left.parent = node;
                        nodes.push(left);
                    }
                    if (right) {
                        right.parent = node;
                        nodes.push(right);
                    }
                }
            }
        }
        else {
            result = (options?.compare
                ? new BinarySearchTree(options.compare)
                : new BinarySearchTree());
            unmappedValues = collection;
        }
        const values = options?.map
            ? Array.from(unmappedValues, options.map, options.thisArg)
            : unmappedValues;
        for (const value of values)
            result.insert(value);
        return result;
    }
    /** The amount of values stored in the binary search tree. */
    get size() {
        return this._size;
    }
    findNode(value) {
        let node = this.root;
        while (node) {
            const order = this.compare(value, node.value);
            if (order === 0)
                break;
            const direction = order < 0 ? "left" : "right";
            node = node[direction];
        }
        return node;
    }
    rotateNode(node, direction) {
        const replacementDirection = direction === "left"
            ? "right"
            : "left";
        if (!node[replacementDirection]) {
            throw new TypeError(`cannot rotate ${direction} without ${replacementDirection} child`);
        }
        const replacement = node[replacementDirection];
        node[replacementDirection] = replacement[direction] ?? null;
        if (replacement[direction])
            replacement[direction].parent = node;
        replacement.parent = node.parent;
        if (node.parent) {
            const parentDirection = node === node.parent[direction]
                ? direction
                : replacementDirection;
            node.parent[parentDirection] = replacement;
        }
        else {
            this.root = replacement;
        }
        replacement[direction] = node;
        node.parent = replacement;
    }
    insertNode(Node, value) {
        if (!this.root) {
            this.root = new Node(null, value);
            this._size++;
            return this.root;
        }
        else {
            let node = this.root;
            while (true) {
                const order = this.compare(value, node.value);
                if (order === 0)
                    break;
                const direction = order < 0 ? "left" : "right";
                if (node[direction]) {
                    node = node[direction];
                }
                else {
                    node[direction] = new Node(node, value);
                    this._size++;
                    return node[direction];
                }
            }
        }
        return null;
    }
    /** Removes the given node, and returns the node that was physically removed from the tree. */
    removeNode(node) {
        /**
         * The node to physically remove from the tree.
         * Guaranteed to have at most one child.
         */
        const flaggedNode = !node.left || !node.right
            ? node
            : node.findSuccessorNode();
        /** Replaces the flagged node. */
        const replacementNode = flaggedNode.left ??
            flaggedNode.right;
        if (replacementNode)
            replacementNode.parent = flaggedNode.parent;
        if (!flaggedNode.parent) {
            this.root = replacementNode;
        }
        else {
            flaggedNode.parent[flaggedNode.directionFromParent()] = replacementNode;
        }
        if (flaggedNode !== node) {
            /** Swaps values, in case value of the removed node is still needed by consumer. */
            const swapValue = node.value;
            node.value = flaggedNode.value;
            flaggedNode.value = swapValue;
        }
        this._size--;
        return flaggedNode;
    }
    /**
     * Adds the value to the binary search tree if it does not already exist in it.
     * Returns true if successful.
     */
    insert(value) {
        return !!this.insertNode(BinarySearchNode, value);
    }
    /**
     * Removes node value from the binary search tree if found.
     * Returns true if found and removed.
     */
    remove(value) {
        const node = this.findNode(value);
        if (node)
            this.removeNode(node);
        return node !== null;
    }
    /** Returns node value if found in the binary search tree. */
    find(value) {
        return this.findNode(value)?.value ?? null;
    }
    /** Returns the minimum value in the binary search tree or null if empty. */
    min() {
        return this.root ? this.root.findMinNode().value : null;
    }
    /** Returns the maximum value in the binary search tree or null if empty. */
    max() {
        return this.root ? this.root.findMaxNode().value : null;
    }
    /** Removes all values from the binary search tree. */
    clear() {
        this.root = null;
        this._size = 0;
    }
    /** Checks if the binary search tree is empty. */
    isEmpty() {
        return this.size === 0;
    }
    /**
     * Returns an iterator that uses in-order (LNR) tree traversal for
     * retrieving values from the binary search tree.
     */
    *lnrValues() {
        const nodes = [];
        let node = this.root;
        while (nodes.length || node) {
            if (node) {
                nodes.push(node);
                node = node.left;
            }
            else {
                node = nodes.pop();
                yield node.value;
                node = node.right;
            }
        }
    }
    /**
     * Returns an iterator that uses reverse in-order (RNL) tree traversal for
     * retrieving values from the binary search tree.
     */
    *rnlValues() {
        const nodes = [];
        let node = this.root;
        while (nodes.length || node) {
            if (node) {
                nodes.push(node);
                node = node.right;
            }
            else {
                node = nodes.pop();
                yield node.value;
                node = node.left;
            }
        }
    }
    /**
     * Returns an iterator that uses pre-order (NLR) tree traversal for
     * retrieving values from the binary search tree.
     */
    *nlrValues() {
        const nodes = [];
        if (this.root)
            nodes.push(this.root);
        while (nodes.length) {
            const node = nodes.pop();
            yield node.value;
            if (node.right)
                nodes.push(node.right);
            if (node.left)
                nodes.push(node.left);
        }
    }
    /**
     * Returns an iterator that uses post-order (LRN) tree traversal for
     * retrieving values from the binary search tree.
     */
    *lrnValues() {
        const nodes = [];
        let node = this.root;
        let lastNodeVisited = null;
        while (nodes.length || node) {
            if (node) {
                nodes.push(node);
                node = node.left;
            }
            else {
                const lastNode = nodes[nodes.length - 1];
                if (lastNode.right && lastNode.right !== lastNodeVisited) {
                    node = lastNode.right;
                }
                else {
                    yield lastNode.value;
                    lastNodeVisited = nodes.pop();
                }
            }
        }
    }
    /**
     * Returns an iterator that uses level order tree traversal for
     * retrieving values from the binary search tree.
     */
    *lvlValues() {
        const children = [];
        let cursor = this.root;
        while (cursor) {
            yield cursor.value;
            if (cursor.left)
                children.push(cursor.left);
            if (cursor.right)
                children.push(cursor.right);
            cursor = children.shift() ?? null;
        }
    }
    /**
     * Returns an iterator that uses in-order (LNR) tree traversal for
     * retrieving values from the binary search tree.
     */
    *[Symbol.iterator]() {
        yield* this.lnrValues();
    }
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/data_structures/_red_black_node.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

class RedBlackNode extends BinarySearchNode {
    constructor(parent, value) {
        super(parent, value);
        Object.defineProperty(this, "red", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.red = true;
    }
    static from(node) {
        const copy = new RedBlackNode(node.parent, node.value);
        copy.left = node.left;
        copy.right = node.right;
        copy.red = node.red;
        return copy;
    }
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/data_structures/red_black_tree.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.



/**
 * A red-black tree. This is a kind of self-balancing binary search tree. The
 * values are in ascending order by default, using JavaScript's built-in
 * comparison operators to sort the values.
 *
 * Red-Black Trees require fewer rotations than AVL Trees, so they can provide
 * faster insertions and removal operations. If you need faster lookups, you
 * should use an AVL Tree instead. AVL Trees are more strictly balanced than
 * Red-Black Trees, so they can provide faster lookups.
 *
 * | Method        | Average Case | Worst Case |
 * | ------------- | ------------ | ---------- |
 * | find(value)   | O(log n)     | O(log n)   |
 * | insert(value) | O(log n)     | O(log n)   |
 * | remove(value) | O(log n)     | O(log n)   |
 * | min()         | O(log n)     | O(log n)   |
 * | max()         | O(log n)     | O(log n)   |
 *
 * @example
 * ```ts
 * import {
 *   ascend,
 *   descend,
 *   RedBlackTree,
 * } from "https://deno.land/std@$STD_VERSION/data_structures/mod.ts";
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/assert/assert_equals.ts";
 *
 * const values = [3, 10, 13, 4, 6, 7, 1, 14];
 * const tree = new RedBlackTree<number>();
 * values.forEach((value) => tree.insert(value));
 * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
 * assertEquals(tree.min(), 1);
 * assertEquals(tree.max(), 14);
 * assertEquals(tree.find(42), null);
 * assertEquals(tree.find(7), 7);
 * assertEquals(tree.remove(42), false);
 * assertEquals(tree.remove(7), true);
 * assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);
 *
 * const invertedTree = new RedBlackTree<number>(descend);
 * values.forEach((value) => invertedTree.insert(value));
 * assertEquals([...invertedTree], [14, 13, 10, 7, 6, 4, 3, 1]);
 * assertEquals(invertedTree.min(), 14);
 * assertEquals(invertedTree.max(), 1);
 * assertEquals(invertedTree.find(42), null);
 * assertEquals(invertedTree.find(7), 7);
 * assertEquals(invertedTree.remove(42), false);
 * assertEquals(invertedTree.remove(7), true);
 * assertEquals([...invertedTree], [14, 13, 10, 6, 4, 3, 1]);
 *
 * const words = new RedBlackTree<string>((a, b) =>
 *   ascend(a.length, b.length) || ascend(a, b)
 * );
 * ["truck", "car", "helicopter", "tank", "train", "suv", "semi", "van"]
 *   .forEach((value) => words.insert(value));
 * assertEquals([...words], [
 *   "car",
 *   "suv",
 *   "van",
 *   "semi",
 *   "tank",
 *   "train",
 *   "truck",
 *   "helicopter",
 * ]);
 * assertEquals(words.min(), "car");
 * assertEquals(words.max(), "helicopter");
 * assertEquals(words.find("scooter"), null);
 * assertEquals(words.find("tank"), "tank");
 * assertEquals(words.remove("scooter"), false);
 * assertEquals(words.remove("tank"), true);
 * assertEquals([...words], [
 *   "car",
 *   "suv",
 *   "van",
 *   "semi",
 *   "train",
 *   "truck",
 *   "helicopter",
 * ]);
 * ```
 */
class RedBlackTree extends BinarySearchTree {
    constructor(compare = ascend) {
        super(compare);
    }
    static from(collection, options) {
        let result;
        let unmappedValues = [];
        if (collection instanceof RedBlackTree) {
            result = new RedBlackTree(options?.compare ?? collection.compare);
            if (options?.compare || options?.map) {
                unmappedValues = collection;
            }
            else {
                const nodes = [];
                if (collection.root) {
                    result.root = RedBlackNode.from(collection.root);
                    nodes.push(result.root);
                }
                while (nodes.length) {
                    const node = nodes.pop();
                    const left = node.left
                        ? RedBlackNode.from(node.left)
                        : null;
                    const right = node.right
                        ? RedBlackNode.from(node.right)
                        : null;
                    if (left) {
                        left.parent = node;
                        nodes.push(left);
                    }
                    if (right) {
                        right.parent = node;
                        nodes.push(right);
                    }
                }
            }
        }
        else {
            result = (options?.compare
                ? new RedBlackTree(options.compare)
                : new RedBlackTree());
            unmappedValues = collection;
        }
        const values = options?.map
            ? Array.from(unmappedValues, options.map, options.thisArg)
            : unmappedValues;
        for (const value of values)
            result.insert(value);
        return result;
    }
    removeFixup(parent, current) {
        while (parent && !current?.red) {
            const direction = parent.left === current ? "left" : "right";
            const siblingDirection = direction === "right"
                ? "left"
                : "right";
            let sibling = parent[siblingDirection];
            if (sibling?.red) {
                sibling.red = false;
                parent.red = true;
                this.rotateNode(parent, direction);
                sibling = parent[siblingDirection];
            }
            if (sibling) {
                if (!sibling.left?.red && !sibling.right?.red) {
                    sibling.red = true;
                    current = parent;
                    parent = current.parent;
                }
                else {
                    if (!sibling[siblingDirection]?.red) {
                        sibling[direction].red = false;
                        sibling.red = true;
                        this.rotateNode(sibling, siblingDirection);
                        sibling = parent[siblingDirection];
                    }
                    sibling.red = parent.red;
                    parent.red = false;
                    sibling[siblingDirection].red = false;
                    this.rotateNode(parent, direction);
                    current = this.root;
                    parent = null;
                }
            }
        }
        if (current)
            current.red = false;
    }
    /**
     * Adds the value to the binary search tree if it does not already exist in it.
     * Returns true if successful.
     */
    insert(value) {
        let node = this.insertNode(RedBlackNode, value);
        if (node) {
            while (node.parent?.red) {
                let parent = node.parent;
                const parentDirection = parent.directionFromParent();
                const uncleDirection = parentDirection === "right"
                    ? "left"
                    : "right";
                const uncle = parent.parent[uncleDirection] ??
                    null;
                if (uncle?.red) {
                    parent.red = false;
                    uncle.red = false;
                    parent.parent.red = true;
                    node = parent.parent;
                }
                else {
                    if (node === parent[uncleDirection]) {
                        node = parent;
                        this.rotateNode(node, parentDirection);
                        parent = node.parent;
                    }
                    parent.red = false;
                    parent.parent.red = true;
                    this.rotateNode(parent.parent, uncleDirection);
                }
            }
            this.root.red = false;
        }
        return !!node;
    }
    /**
     * Removes node value from the binary search tree if found.
     * Returns true if found and removed.
     */
    remove(value) {
        const node = this.findNode(value);
        if (!node) {
            return false;
        }
        const removedNode = this.removeNode(node);
        if (removedNode && !removedNode.red) {
            this.removeFixup(removedNode.parent, removedNode.left ?? removedNode.right);
        }
        return true;
    }
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/bytes.js + 3 modules
var bytes = __webpack_require__(6528);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/kv_key.js
var kv_key = __webpack_require__(1118);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/kv_u64.js
var kv_u64 = __webpack_require__(5216);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/kv_util.js
var kv_util = __webpack_require__(6765);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/unraw_watch_stream.js
var unraw_watch_stream = __webpack_require__(4503);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/check.js
var check = __webpack_require__(2423);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/in_memory.js
// Copyright 2023 the Deno authors. All rights reserved. MIT license.








/**
 * Return a new KvService that creates ephemeral in-memory KV instances.
 */
function makeInMemoryService(opts = {}) {
    (0,check/* checkRecord */.EQ)("opts", opts);
    (0,check/* checkOptionalBoolean */.pm)("opts.debug", opts.debug);
    (0,check/* checkOptionalNumber */.c8)("opts.maxQueueAttempts", opts.maxQueueAttempts);
    const { debug = false, maxQueueAttempts = 10 } = opts;
    const instances = new Map();
    return {
        openKv: (url = "") => {
            let kv = instances.get(url);
            if (!kv) {
                if (debug)
                    console.log(`makeInMemoryService: new kv(${url})`);
                kv = new InMemoryKv(debug, maxQueueAttempts);
                instances.set(url, kv);
            }
            return Promise.resolve(kv);
        },
    };
}
const keyRow = (keyBytes) => [keyBytes, undefined, "", undefined];
const copyValueIfNecessary = (v) => v instanceof kv_u64/* _KvU64 */.U ? v : structuredClone(v);
class InMemoryKv extends kv_util/* BaseKv */.JM {
    constructor(debug, maxQueueAttempts) {
        super({ debug });
        Object.defineProperty(this, "rows", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new RedBlackTree((a, b) => (0,bytes/* compareBytes */.Xo)(a[0], b[0]))
        }); // keep sorted by keyBytes
        Object.defineProperty(this, "queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "watches", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "expirer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "queueWorker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxQueueAttempts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "version", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "nextQueueItemId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        this.expirer = new kv_util/* Expirer */.sL(debug, () => this.expire());
        this.queueWorker = new kv_util/* QueueWorker */.Iy((queueHandler) => this.runWorker(queueHandler));
        this.maxQueueAttempts = maxQueueAttempts;
    }
    get_(key, _consistency) {
        return Promise.resolve(this.getOne(key));
    }
    getMany_(keys, _consistency) {
        return Promise.resolve(keys.map((v) => this.getOne(v)));
    }
    async *listStream(outCursor, selector, { batchSize, consistency: _, cursor: cursorOpt, limit, reverse = false } = {}) {
        let yielded = 0;
        if (typeof limit === "number" && yielded >= limit)
            return;
        const cursor = typeof cursorOpt === "string"
            ? (0,kv_util/* unpackCursor */.$9)(cursorOpt)
            : undefined;
        let lastYieldedKeyBytes = cursor?.lastYieldedKeyBytes;
        let pass = 0;
        const prefixBytes = "prefix" in selector
            ? (0,kv_key/* packKey */.l7)(selector.prefix)
            : undefined;
        while (true) {
            pass++;
            let start;
            let end;
            if ("prefix" in selector) {
                start = "start" in selector ? (0,kv_key/* packKey */.l7)(selector.start) : prefixBytes;
                end = "end" in selector
                    ? (0,kv_key/* packKey */.l7)(selector.end)
                    : new Uint8Array([...prefixBytes, 0xff]);
            }
            else {
                start = (0,kv_key/* packKey */.l7)(selector.start);
                end = (0,kv_key/* packKey */.l7)(selector.end);
            }
            if (reverse) {
                end = lastYieldedKeyBytes ?? end;
            }
            else {
                start = lastYieldedKeyBytes ?? start;
            }
            if (start === undefined || end === undefined)
                throw new Error();
            if (start.length === 0)
                start = new Uint8Array([0]);
            const batchLimit = Math.min(batchSize ?? 100, 500, limit ?? Number.MAX_SAFE_INTEGER) +
                (lastYieldedKeyBytes ? 1 : 0);
            const rows = this.listRows({ start, end, reverse, batchLimit });
            let entries = 0;
            for (const [keyBytes, value, versionstamp] of rows) {
                if (entries++ === 0 &&
                    (lastYieldedKeyBytes && (0,bytes/* equalBytes */.ex)(lastYieldedKeyBytes, keyBytes) ||
                        prefixBytes && (0,bytes/* equalBytes */.ex)(prefixBytes, keyBytes)))
                    continue;
                const key = (0,kv_key/* unpackKey */.mZ)(keyBytes);
                lastYieldedKeyBytes = keyBytes;
                outCursor.set((0,kv_util/* packCursor */.mF)({ lastYieldedKeyBytes })); // cursor needs to be set before yield
                yield { key, value: copyValueIfNecessary(value), versionstamp };
                yielded++;
                // console.log({ yielded, entries, limit });
                if (typeof limit === "number" && yielded >= limit)
                    return;
            }
            if (entries < batchLimit)
                return;
        }
    }
    listenQueue_(handler) {
        return this.queueWorker.listen(handler);
    }
    async commit(checks, mutations, enqueues, additionalWork) {
        const { rows, queue, watches } = this;
        await Promise.resolve();
        for (const { key, versionstamp } of checks) {
            if (!(versionstamp === null ||
                typeof versionstamp === "string" && (0,kv_util/* isValidVersionstamp */.kI)(versionstamp)))
                throw new Error(`Bad 'versionstamp': ${versionstamp}`);
            const existing = rows.find(keyRow((0,kv_key/* packKey */.l7)(key)));
            if (versionstamp === null && existing)
                return { ok: false };
            if (typeof versionstamp === "string" && (existing ?? [])[2] !== versionstamp)
                return { ok: false };
        }
        let minExpires;
        let minEnqueued;
        const newVersionstamp = (0,kv_util/* packVersionstamp */.B5)(++this.version);
        for (const { value, opts = {} } of enqueues) {
            const { delay = 0, keysIfUndelivered = [] } = opts;
            const enqueued = Date.now();
            const available = enqueued + delay;
            const id = this.nextQueueItemId++;
            queue.set(id, {
                id,
                value: copyValueIfNecessary(value),
                enqueued,
                available,
                failures: 0,
                keysIfUndelivered,
                locked: false,
            });
            minEnqueued = Math.min(enqueued, minEnqueued ?? Number.MAX_SAFE_INTEGER);
        }
        const watchIds = new Set();
        for (const mutation of mutations) {
            const { key } = mutation;
            const keyBytes = (0,kv_key/* packKey */.l7)(key);
            if (mutation.type === "set") {
                const { value, expireIn } = mutation;
                const expires = typeof expireIn === "number"
                    ? Date.now() + Math.round(expireIn)
                    : undefined;
                if (expires !== undefined) {
                    minExpires = Math.min(expires, minExpires ?? Number.MAX_SAFE_INTEGER);
                }
                rows.remove(keyRow(keyBytes));
                rows.insert([
                    keyBytes,
                    copyValueIfNecessary(value),
                    newVersionstamp,
                    expires,
                ]);
            }
            else if (mutation.type === "delete") {
                rows.remove(keyRow(keyBytes));
            }
            else if (mutation.type === "sum" || mutation.type === "min" ||
                mutation.type === "max") {
                const existing = rows.find(keyRow(keyBytes));
                if (!existing) {
                    rows.insert([keyBytes, mutation.value, newVersionstamp, undefined]);
                }
                else {
                    const existingValue = existing[1];
                    assertInstanceOf(existingValue, kv_u64/* _KvU64 */.U, `Can only '${mutation.type}' on KvU64`);
                    const result = mutation.type === "min"
                        ? existingValue.min(mutation.value)
                        : mutation.type === "max"
                            ? existingValue.max(mutation.value)
                            : existingValue.sum(mutation.value);
                    rows.remove(keyRow(keyBytes));
                    rows.insert([keyBytes, result, newVersionstamp, undefined]);
                }
            }
            else {
                throw new Error(`commit(${JSON.stringify({ checks, mutations, enqueues }, kv_util/* replacer */.$U)}) not implemented`);
            }
            for (const [watchId, watch] of watches) {
                if (watchIds.has(watchId))
                    continue;
                if (watch.keysAsBytes.some((v) => (0,bytes/* equalBytes */.ex)(v, keyBytes))) {
                    watchIds.add(watchId);
                }
            }
        }
        if (additionalWork)
            additionalWork();
        if (minExpires !== undefined)
            this.expirer.rescheduleExpirer(minExpires);
        if (minEnqueued !== undefined)
            this.queueWorker.rescheduleWorker();
        for (const watchId of watchIds) {
            const watch = watches.get(watchId);
            if (watch) {
                watch.onEntries(watch.keysAsBytes.map((v) => this.getOne((0,kv_key/* unpackKey */.mZ)(v))));
            }
        }
        return { ok: true, versionstamp: newVersionstamp };
    }
    watch_(keys, raw) {
        const { watches, debug } = this;
        const keysAsBytes = keys.map(kv_key/* packKey */.l7);
        const watchId = [...watches.keys()].reduce((a, b) => Math.max(a, b), 0) + 1;
        let onCancel;
        const rawStream = new ReadableStream({
            start(controller) {
                if (debug)
                    console.log(`watch: ${watchId} start`);
                const tryClose = () => {
                    try {
                        controller.close();
                    }
                    catch { /* noop */ }
                };
                onCancel = tryClose;
                watches.set(watchId, {
                    keysAsBytes,
                    onEntries: (entries) => controller.enqueue(entries),
                    onFinalize: tryClose,
                });
            },
            cancel() {
                watches.delete(watchId);
                if (debug)
                    console.log(`watch: ${watchId} cancel`);
            },
        });
        return raw ? rawStream : (0,unraw_watch_stream/* makeUnrawWatchStream */.p)(rawStream, onCancel);
    }
    close_() {
        this.expirer.finalize();
        this.queueWorker.finalize();
        this.watches.forEach((v) => v.onFinalize());
    }
    //
    getOne(key) {
        const row = this.rows.find(keyRow((0,kv_key/* packKey */.l7)(key)));
        return row
            ? { key, value: copyValueIfNecessary(row[1]), versionstamp: row[2] }
            : { key, value: null, versionstamp: null };
    }
    listRows({ start, end, reverse, batchLimit }) {
        const { rows } = this;
        const rt = [];
        for (const row of reverse ? rows.rnlValues() : rows.lnrValues()) { // TODO use rbt to find start node faster
            const keyBytes = row[0];
            if (rt.length >= batchLimit)
                break;
            if (reverse) {
                if ((0,bytes/* compareBytes */.Xo)(keyBytes, start) < 0)
                    break;
                if ((0,bytes/* compareBytes */.Xo)(keyBytes, end) < 0)
                    rt.push(row);
            }
            else {
                if ((0,bytes/* compareBytes */.Xo)(keyBytes, end) >= 0)
                    break;
                if ((0,bytes/* compareBytes */.Xo)(keyBytes, start) >= 0)
                    rt.push(row);
            }
        }
        return rt;
    }
    expire() {
        const { rows } = this;
        const now = Date.now();
        const remove = [];
        let minExpires;
        for (const row of rows) {
            const expires = row[3];
            if (expires !== undefined && expires <= now) {
                remove.push(row);
            }
            minExpires = expires === undefined
                ? minExpires
                : Math.min(expires, minExpires ?? Number.MAX_SAFE_INTEGER);
        }
        remove.forEach((v) => rows.remove(v));
        return minExpires;
    }
    async runWorker(queueHandler) {
        const { debug, queue } = this;
        if (!queueHandler) {
            if (debug)
                console.log(`runWorker: no queueHandler`);
            return;
        }
        const time = Date.now();
        const candidateIds = [...queue.values()].filter((v) => v.available <= time && !v.locked).map((v) => v.id);
        if (candidateIds.length === 0) {
            const nextAvailableItem = [...queue.values()].filter((v) => !v.locked).sort((a, b) => a.available - b.available)[0];
            if (nextAvailableItem) {
                const nextAvailableIn = nextAvailableItem.available - Date.now();
                if (debug) {
                    console.log(`runWorker: no work (nextAvailableIn=${nextAvailableIn}ms)`);
                }
                this.queueWorker.rescheduleWorker(nextAvailableIn);
            }
            else {
                if (debug) {
                    console.log("runWorker: no work");
                }
            }
            return;
        }
        const id = Math.min(...candidateIds);
        const queueItem = queue.get(id);
        queueItem.locked = true;
        const { value, failures, keysIfUndelivered } = queueItem;
        const deleteQueueItem = () => queue.delete(id);
        try {
            if (debug)
                console.log(`runWorker: dispatching ${id}: ${value}`);
            await Promise.resolve(queueHandler(value));
            if (debug)
                console.log(`runWorker: ${id} succeeded, clearing`);
            deleteQueueItem();
        }
        catch (e) {
            const totalFailures = failures + 1;
            if (debug) {
                console.log(`runWorker: ${id} failed (totalFailures=${totalFailures}): ${e.stack || e}`);
            }
            if (totalFailures >= this.maxQueueAttempts) {
                let atomic = this.atomic(deleteQueueItem);
                for (const key of keysIfUndelivered)
                    atomic = atomic.set(key, value);
                await atomic.commit();
                if (debug) {
                    console.log(`runWorker: give up on ${id}, keys=${keysIfUndelivered.length}`);
                }
            }
            else {
                const available = Date.now() + 1000 * totalFailures;
                queueItem.failures = totalFailures;
                queueItem.available = available;
                queueItem.locked = false;
            }
        }
        this.queueWorker.rescheduleWorker();
    }
}


/***/ }),

/***/ 2637:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  sF: () => (/* reexport */ AtomicWriteOutput_decodeBinary),
  Gd: () => (/* reexport */ SnapshotReadOutput_decodeBinary),
  hW: () => (/* reexport */ AtomicWrite/* encodeBinary */.cY),
  TQ: () => (/* reexport */ SnapshotRead/* encodeBinary */.cY),
  DX: () => (/* binding */ fetchAtomicWrite),
  Lo: () => (/* binding */ fetchDatabaseMetadata),
  BV: () => (/* binding */ fetchSnapshotRead),
  ko: () => (/* binding */ fetchWatchStream)
});

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/Watch.js + 1 modules
var Watch = __webpack_require__(9160);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/AtomicWrite.js + 5 modules
var AtomicWrite = __webpack_require__(2186);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/SnapshotRead.js + 1 modules
var SnapshotRead = __webpack_require__(6111);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/KvEntry.js
var KvEntry = __webpack_require__(6379);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/index.js
var wire = __webpack_require__(8047);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/serialize.js
var wire_serialize = __webpack_require__(8429);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/deserialize.js
var deserialize = __webpack_require__(6448);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/ReadRangeOutput.js
// @ts-nocheck




function getDefaultValue() {
    return {
        values: [],
    };
}
function createValue(partialValue) {
    return {
        ...getDefaultValue(),
        ...partialValue,
    };
}
function encodeJson(value) {
    const result = {};
    result.values = value.values.map(value => encodeJson_1(value));
    return result;
}
function decodeJson(value) {
    const result = getDefaultValue();
    result.values = value.values?.map((value) => decodeJson_1(value)) ?? [];
    return result;
}
function encodeBinary(value) {
    const result = [];
    for (const tsValue of value.values) {
        result.push([1, { type: WireType.LengthDelimited, value: encodeBinary_1(tsValue) }]);
    }
    return serialize(result);
}
function decodeBinary(binary) {
    const result = getDefaultValue();
    const wireMessage = (0,deserialize/* default */.A)(binary);
    const wireFields = new Map(wireMessage);
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 1).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === wire/* WireType */.O.LengthDelimited ? (0,KvEntry/* decodeBinary */.AQ)(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.values = value;
    }
    return result;
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/SnapshotReadStatus.js
var SnapshotReadStatus = __webpack_require__(2744);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/json/scalar.js
var scalar = __webpack_require__(3422);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/scalar.js + 1 modules
var wire_scalar = __webpack_require__(4576);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/Long.js
var runtime_Long = __webpack_require__(1055);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/SnapshotReadOutput.js
// @ts-nocheck








function SnapshotReadOutput_getDefaultValue() {
    return {
        ranges: [],
        readDisabled: false,
        readIsStronglyConsistent: false,
        status: "SR_UNSPECIFIED",
    };
}
function SnapshotReadOutput_createValue(partialValue) {
    return {
        ...SnapshotReadOutput_getDefaultValue(),
        ...partialValue,
    };
}
function SnapshotReadOutput_encodeJson(value) {
    const result = {};
    result.ranges = value.ranges.map(value => encodeJson_1(value));
    if (value.readDisabled !== undefined)
        result.readDisabled = tsValueToJsonValueFns.bool(value.readDisabled);
    if (value.readIsStronglyConsistent !== undefined)
        result.readIsStronglyConsistent = tsValueToJsonValueFns.bool(value.readIsStronglyConsistent);
    if (value.status !== undefined)
        result.status = tsValueToJsonValueFns.enum(value.status);
    return result;
}
function SnapshotReadOutput_decodeJson(value) {
    const result = SnapshotReadOutput_getDefaultValue();
    result.ranges = value.ranges?.map((value) => decodeJson_1(value)) ?? [];
    if (value.readDisabled !== undefined)
        result.readDisabled = jsonValueToTsValueFns.bool(value.readDisabled);
    if (value.readIsStronglyConsistent !== undefined)
        result.readIsStronglyConsistent = jsonValueToTsValueFns.bool(value.readIsStronglyConsistent);
    if (value.status !== undefined)
        result.status = jsonValueToTsValueFns.enum(value.status);
    return result;
}
function SnapshotReadOutput_encodeBinary(value) {
    const result = [];
    for (const tsValue of value.ranges) {
        result.push([1, { type: WireType.LengthDelimited, value: encodeBinary_1(tsValue) }]);
    }
    if (value.readDisabled !== undefined) {
        const tsValue = value.readDisabled;
        result.push([2, tsValueToWireValueFns.bool(tsValue)]);
    }
    if (value.readIsStronglyConsistent !== undefined) {
        const tsValue = value.readIsStronglyConsistent;
        result.push([4, tsValueToWireValueFns.bool(tsValue)]);
    }
    if (value.status !== undefined) {
        const tsValue = value.status;
        result.push([8, { type: WireType.Varint, value: new Long(name2num[tsValue]) }]);
    }
    return serialize(result);
}
function SnapshotReadOutput_decodeBinary(binary) {
    const result = SnapshotReadOutput_getDefaultValue();
    const wireMessage = (0,deserialize/* default */.A)(binary);
    const wireFields = new Map(wireMessage);
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 1).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === wire/* WireType */.O.LengthDelimited ? decodeBinary(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.ranges = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wire_scalar/* wireValueToTsValueFns */.Vz.bool(wireValue);
        if (value === undefined)
            break field;
        result.readDisabled = value;
    }
    field: {
        const wireValue = wireFields.get(4);
        if (wireValue === undefined)
            break field;
        const value = wire_scalar/* wireValueToTsValueFns */.Vz.bool(wireValue);
        if (value === undefined)
            break field;
        result.readIsStronglyConsistent = value;
    }
    field: {
        const wireValue = wireFields.get(8);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === wire/* WireType */.O.Varint ? SnapshotReadStatus/* num2name */.G[wireValue.value[0]] : undefined;
        if (value === undefined)
            break field;
        result.status = value;
    }
    return result;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/AtomicWriteStatus.js
const num2name = {
    0: "AW_UNSPECIFIED",
    1: "AW_SUCCESS",
    2: "AW_CHECK_FAILURE",
    5: "AW_WRITE_DISABLED",
};
const AtomicWriteStatus_name2num = {
    AW_UNSPECIFIED: 0,
    AW_SUCCESS: 1,
    AW_CHECK_FAILURE: 2,
    AW_WRITE_DISABLED: 5,
};

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/AtomicWriteOutput.js
// @ts-nocheck







function AtomicWriteOutput_getDefaultValue() {
    return {
        status: "AW_UNSPECIFIED",
        versionstamp: new Uint8Array(),
        failedChecks: [],
    };
}
function AtomicWriteOutput_createValue(partialValue) {
    return {
        ...AtomicWriteOutput_getDefaultValue(),
        ...partialValue,
    };
}
function AtomicWriteOutput_encodeJson(value) {
    const result = {};
    if (value.status !== undefined)
        result.status = tsValueToJsonValueFns.enum(value.status);
    if (value.versionstamp !== undefined)
        result.versionstamp = tsValueToJsonValueFns.bytes(value.versionstamp);
    result.failedChecks = value.failedChecks.map(value => tsValueToJsonValueFns.uint32(value));
    return result;
}
function AtomicWriteOutput_decodeJson(value) {
    const result = AtomicWriteOutput_getDefaultValue();
    if (value.status !== undefined)
        result.status = jsonValueToTsValueFns.enum(value.status);
    if (value.versionstamp !== undefined)
        result.versionstamp = jsonValueToTsValueFns.bytes(value.versionstamp);
    result.failedChecks = value.failedChecks?.map((value) => jsonValueToTsValueFns.uint32(value)) ?? [];
    return result;
}
function AtomicWriteOutput_encodeBinary(value) {
    const result = [];
    if (value.status !== undefined) {
        const tsValue = value.status;
        result.push([1, { type: WireType.Varint, value: new Long(name2num[tsValue]) }]);
    }
    if (value.versionstamp !== undefined) {
        const tsValue = value.versionstamp;
        result.push([2, tsValueToWireValueFns.bytes(tsValue)]);
    }
    for (const tsValue of value.failedChecks) {
        result.push([4, tsValueToWireValueFns.uint32(tsValue)]);
    }
    return serialize(result);
}
function AtomicWriteOutput_decodeBinary(binary) {
    const result = AtomicWriteOutput_getDefaultValue();
    const wireMessage = (0,deserialize/* default */.A)(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === wire/* WireType */.O.Varint ? num2name[wireValue.value[0]] : undefined;
        if (value === undefined)
            break field;
        result.status = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wire_scalar/* wireValueToTsValueFns */.Vz.bytes(wireValue);
        if (value === undefined)
            break field;
        result.versionstamp = value;
    }
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 4).map(([, wireValue]) => wireValue);
        const value = Array.from(wire_scalar/* unpackFns */.uQ.uint32(wireValues));
        if (!value.length)
            break collection;
        result.failedChecks = value;
    }
    return result;
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/check.js
var check = __webpack_require__(2423);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/sleep.js
var sleep = __webpack_require__(5384);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/kv_connect_api.js
// Copyright 2023 the Deno authors. All rights reserved. MIT license.








async function fetchDatabaseMetadata(url, accessToken, fetcher, maxRetries, supportedVersions) {
    return await (0,sleep/* executeWithRetries */.qP)("fetchDatabaseMetadata", async () => {
        const res = await fetcher(url, {
            method: "POST",
            headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ supportedVersions }),
        });
        if (res.status !== 200) {
            throw new (res.status >= 500 && res.status < 600
                ? sleep/* RetryableError */.dw
                : Error)(`Unexpected response status: ${res.status} ${await res.text()}`);
        }
        const contentType = res.headers.get("content-type") ?? undefined;
        if (contentType !== "application/json") {
            throw new Error(`Unexpected response content-type: ${contentType} ${await res.text()}`);
        }
        const metadata = await res.json();
        if (!isDatabaseMetadata(metadata)) {
            throw new Error(`Bad DatabaseMetadata: ${JSON.stringify(metadata)}`);
        }
        return { metadata, responseUrl: res.url };
    }, { maxRetries });
}
async function fetchSnapshotRead(url, accessToken, databaseId, req, fetcher, maxRetries, version) {
    return SnapshotReadOutput_decodeBinary(await fetchProtobuf(url, accessToken, databaseId, (0,SnapshotRead/* encodeBinary */.cY)(req), fetcher, maxRetries, version, false));
}
async function fetchAtomicWrite(url, accessToken, databaseId, write, fetcher, maxRetries, version) {
    return AtomicWriteOutput_decodeBinary(await fetchProtobuf(url, accessToken, databaseId, (0,AtomicWrite/* encodeBinary */.cY)(write), fetcher, maxRetries, version, false));
}
async function fetchWatchStream(url, accessToken, databaseId, watch, fetcher, maxRetries, version) {
    return await fetchProtobuf(url, accessToken, databaseId, (0,Watch/* encodeBinary */.cY)(watch), fetcher, maxRetries, version, true);
}
async function fetchProtobuf(url, accessToken, databaseId, body, fetcher, maxRetries, version, stream) {
    const headers = {
        authorization: `Bearer ${accessToken}`,
        ...(version === 1 ? { "x-transaction-domain-id": databaseId } : {
            "x-denokv-version": version.toString(),
            "x-denokv-database-id": databaseId,
        }),
    };
    return await (0,sleep/* executeWithRetries */.qP)("fetchProtobuf", async () => {
        const res = await fetcher(url, { method: "POST", body, headers });
        if (res.status !== 200) {
            throw new (res.status >= 500 && res.status < 600
                ? sleep/* RetryableError */.dw
                : Error)(`Unexpected response status: ${res.status} ${await res.text()}`);
        }
        const contentType = res.headers.get("content-type") ?? undefined;
        const expectedContentTypes = stream
            ? ["application/octet-stream", "" /* TODO remove once fixed upstream */]
            : [
                "application/x-protobuf",
                "application/protobuf", /* allow nonspec, was returned by denokv release 0.2.0 */
            ];
        if (!expectedContentTypes.includes(contentType ?? "")) {
            throw new Error(`Unexpected response content-type: ${contentType} ${await res.text()}`);
        }
        if (stream) {
            if (res.body === null) {
                throw new Error(`No response body for stream request`);
            }
            return res.body;
        }
        else {
            return new Uint8Array(await res.arrayBuffer());
        }
    }, { maxRetries });
}
function isValidEndpointUrl(url) {
    try {
        const { protocol, pathname, search, hash } = new URL(url, "https://example.com");
        return /^https?:$/.test(protocol) &&
            (pathname === "/" ||
                !pathname.endsWith("/") && search === "" && hash === ""); // must not end in "/" (except no path), no qp/hash implied since the spec simply appends "/action"
    }
    catch {
        return false;
    }
}
function isEndpointInfo(obj) {
    if (!(0,check/* isRecord */.u4)(obj))
        return false;
    const { url, consistency, ...rest } = obj;
    return typeof url === "string" && isValidEndpointUrl(url) &&
        (consistency === "strong" || consistency === "eventual") &&
        Object.keys(rest).length === 0;
}
function isDatabaseMetadata(obj) {
    if (!(0,check/* isRecord */.u4)(obj))
        return false;
    const { version, databaseId, endpoints, token, expiresAt, ...rest } = obj;
    return (version === 1 || version === 2 || version === 3) &&
        typeof databaseId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(databaseId) &&
        Array.isArray(endpoints) && endpoints.every(isEndpointInfo) &&
        typeof token === "string" &&
        typeof expiresAt === "string" && (0,check/* isDateTime */.Ar)(expiresAt) &&
        Object.keys(rest).length === 0;
}


/***/ }),

/***/ 1118:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   l7: () => (/* binding */ packKey),
/* harmony export */   mZ: () => (/* binding */ unpackKey)
/* harmony export */ });
/* unused harmony export packKeyPart */
/* harmony import */ var _bytes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6528);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.

// https://github.com/apple/foundationdb/blob/main/design/tuple.md
// limited to Uint8Array | string | number | bigint | boolean
// https://github.com/denoland/deno/blob/main/ext/kv/codec.rs
function packKey(kvKey) {
    return new Uint8Array(kvKey.flatMap((v) => [...packKeyPart(v)]));
}
function packKeyPart(kvKeyPart) {
    if (kvKeyPart instanceof Uint8Array) {
        return new Uint8Array([
            Typecode.ByteString,
            ...encodeZeroWithZeroFF(kvKeyPart),
            0,
        ]);
    }
    if (typeof kvKeyPart === "string") {
        return new Uint8Array([
            Typecode.UnicodeString,
            ...encodeZeroWithZeroFF(new TextEncoder().encode(kvKeyPart)),
            0,
        ]);
    }
    if (kvKeyPart === false)
        return new Uint8Array([Typecode.False]);
    if (kvKeyPart === true)
        return new Uint8Array([Typecode.True]);
    if (typeof kvKeyPart === "bigint") {
        const neg = kvKeyPart < 0;
        const abs = neg ? -kvKeyPart : kvKeyPart;
        const numBytes = BigInt((0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .computeBigintMinimumNumberOfBytes */ .S3)(abs));
        const typecode = neg
            ? (numBytes <= 8n
                ? (Typecode.IntegerOneByteNegative - Number(numBytes) + 1)
                : Typecode.IntegerArbitraryByteNegative)
            : (numBytes <= 8n
                ? (Typecode.IntegerOneBytePositive + Number(numBytes) - 1)
                : Typecode.IntegerArbitraryBytePositive);
        const bytes = [typecode];
        if (numBytes > 8n)
            bytes.push(Number(numBytes));
        for (let i = 0n; i < numBytes; i++) {
            const mask = 0xffn << 8n * (numBytes - i - 1n);
            const byte = Number((abs & mask) >> (8n * (numBytes - i - 1n)));
            bytes.push(byte);
        }
        if (neg)
            (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .flipBytes */ .pK)(bytes, 1);
        return new Uint8Array(bytes);
    }
    if (typeof kvKeyPart === "number") {
        const sub = new Uint8Array(8);
        new DataView(sub.buffer).setFloat64(0, -Math.abs(kvKeyPart), false);
        if (kvKeyPart < 0)
            (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .flipBytes */ .pK)(sub);
        return new Uint8Array([Typecode.FloatingPointDouble, ...sub]);
    }
    throw new Error(`Unsupported keyPart: ${typeof kvKeyPart} ${kvKeyPart}`);
}
function unpackKey(bytes) {
    const rt = [];
    let pos = 0;
    while (pos < bytes.length) {
        const typecode = bytes[pos++];
        if (typecode === Typecode.ByteString || typecode === Typecode.UnicodeString) {
            // Uint8Array or string
            const newBytes = [];
            while (pos < bytes.length) {
                const byte = bytes[pos++];
                if (byte === 0 && bytes[pos] === 0xff) {
                    pos++;
                }
                else if (byte === 0) {
                    break;
                }
                newBytes.push(byte);
            }
            rt.push(typecode === Typecode.UnicodeString
                ? decoder.decode(new Uint8Array(newBytes))
                : new Uint8Array(newBytes));
        }
        else if (typecode >= Typecode.IntegerArbitraryByteNegative &&
            typecode <= Typecode.IntegerArbitraryBytePositive) {
            // bigint
            const neg = typecode < Typecode.IntegerZero;
            const numBytes = BigInt((typecode === Typecode.IntegerArbitraryBytePositive ||
                typecode === Typecode.IntegerArbitraryByteNegative)
                ? (neg ? (0xff - bytes[pos++]) : bytes[pos++])
                : Math.abs(typecode - Typecode.IntegerZero));
            let val = 0n;
            for (let i = 0n; i < numBytes; i++) {
                let byte = bytes[pos++];
                if (neg)
                    byte = 0xff - byte;
                val += BigInt(byte) << ((numBytes - i - 1n) * 8n);
            }
            rt.push(neg ? -val : val);
        }
        else if (typecode === Typecode.FloatingPointDouble) {
            // number
            const sub = new Uint8Array(bytes.subarray(pos, pos + 8));
            const neg = sub[0] < 128;
            if (neg)
                (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .flipBytes */ .pK)(sub);
            const num = -new DataView(sub.buffer).getFloat64(0, false);
            pos += 8;
            rt.push(neg ? -num : num);
        }
        else if (typecode === Typecode.False) {
            // boolean false
            rt.push(false);
        }
        else if (typecode === Typecode.True) {
            // boolean true
            rt.push(true);
        }
        else {
            throw new Error(`Unsupported typecode: ${typecode} in key: [${bytes.join(", ")}] after ${rt.join(", ")}`);
        }
    }
    (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
    return rt;
}
//
const decoder = new TextDecoder();
var Typecode;
(function (Typecode) {
    Typecode[Typecode["ByteString"] = 1] = "ByteString";
    Typecode[Typecode["UnicodeString"] = 2] = "UnicodeString";
    Typecode[Typecode["IntegerArbitraryByteNegative"] = 11] = "IntegerArbitraryByteNegative";
    Typecode[Typecode["IntegerEightByteNegative"] = 12] = "IntegerEightByteNegative";
    Typecode[Typecode["IntegerSevenByteNegative"] = 13] = "IntegerSevenByteNegative";
    Typecode[Typecode["IntegerSixByteNegative"] = 14] = "IntegerSixByteNegative";
    Typecode[Typecode["IntegerFiveByteNegative"] = 15] = "IntegerFiveByteNegative";
    Typecode[Typecode["IntegerFourByteNegative"] = 16] = "IntegerFourByteNegative";
    Typecode[Typecode["IntegerThreeByteNegative"] = 17] = "IntegerThreeByteNegative";
    Typecode[Typecode["IntegerTwoByteNegative"] = 18] = "IntegerTwoByteNegative";
    Typecode[Typecode["IntegerOneByteNegative"] = 19] = "IntegerOneByteNegative";
    Typecode[Typecode["IntegerZero"] = 20] = "IntegerZero";
    Typecode[Typecode["IntegerOneBytePositive"] = 21] = "IntegerOneBytePositive";
    Typecode[Typecode["IntegerTwoBytePositive"] = 22] = "IntegerTwoBytePositive";
    Typecode[Typecode["IntegerThreeBytePositive"] = 23] = "IntegerThreeBytePositive";
    Typecode[Typecode["IntegerFourBytePositive"] = 24] = "IntegerFourBytePositive";
    Typecode[Typecode["IntegerFiveBytePositive"] = 25] = "IntegerFiveBytePositive";
    Typecode[Typecode["IntegerSixBytePositive"] = 26] = "IntegerSixBytePositive";
    Typecode[Typecode["IntegerSevenBytePositive"] = 27] = "IntegerSevenBytePositive";
    Typecode[Typecode["IntegerEightBytePositive"] = 28] = "IntegerEightBytePositive";
    Typecode[Typecode["IntegerArbitraryBytePositive"] = 29] = "IntegerArbitraryBytePositive";
    Typecode[Typecode["FloatingPointDouble"] = 33] = "FloatingPointDouble";
    Typecode[Typecode["False"] = 38] = "False";
    Typecode[Typecode["True"] = 39] = "True";
})(Typecode || (Typecode = {}));
function encodeZeroWithZeroFF(bytes) {
    const index = bytes.indexOf(0);
    return index < 0
        ? bytes
        : new Uint8Array([...bytes].flatMap((v) => v === 0 ? [0, 0xff] : [v]));
}


/***/ }),

/***/ 1556:
/***/ (() => {

// Copyright 2023 the Deno authors. All rights reserved. MIT license.
var _a;
// deno-lint-ignore no-explicit-any
(_a = Symbol).dispose ?? (_a.dispose = Symbol("Symbol.dispose")); // polyfill if needed



/***/ }),

/***/ 5216:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   U: () => (/* binding */ _KvU64)
/* harmony export */ });
// Copyright 2023 the Deno authors. All rights reserved. MIT license.
const max = (1n << 64n) - 1n;
class _KvU64 {
    constructor(value) {
        Object.defineProperty(this, "value", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (typeof value !== "bigint") {
            throw new TypeError("value must be a bigint");
        }
        if (value < 0n)
            throw new Error("value must be a positive bigint");
        if (value > max) {
            throw new Error("value must fit in a 64-bit unsigned integer");
        }
        this.value = value;
    }
    sum(other) {
        checkValueHolder(other);
        return new _KvU64((this.value + other.value) % (1n << 64n));
    }
    min(other) {
        checkValueHolder(other);
        return other.value < this.value ? new _KvU64(other.value) : this;
    }
    max(other) {
        checkValueHolder(other);
        return other.value > this.value ? new _KvU64(other.value) : this;
    }
}
//
function checkValueHolder(obj) {
    const valid = typeof obj === "object" && obj !== null &&
        !Array.isArray(obj) && "value" in obj && typeof obj.value === "bigint";
    if (!valid)
        throw new Error(`Expected bigint holder, found: ${obj}`);
}


/***/ }),

/***/ 6765:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $9: () => (/* binding */ unpackCursor),
/* harmony export */   $U: () => (/* binding */ replacer),
/* harmony export */   B5: () => (/* binding */ packVersionstamp),
/* harmony export */   Iy: () => (/* binding */ QueueWorker),
/* harmony export */   JM: () => (/* binding */ BaseKv),
/* harmony export */   YA: () => (/* binding */ packKvValue),
/* harmony export */   kI: () => (/* binding */ isValidVersionstamp),
/* harmony export */   mF: () => (/* binding */ packCursor),
/* harmony export */   sL: () => (/* binding */ Expirer),
/* harmony export */   wK: () => (/* binding */ readValue)
/* harmony export */ });
/* unused harmony exports unpackKvu, packKvu, checkListSelector, checkListOptions, unpackVersionstamp, CursorHolder, GenericKvListIterator, GenericAtomicOperation */
/* harmony import */ var _bytes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6528);
/* harmony import */ var _check_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2423);
/* harmony import */ var _kv_u64_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5216);
/* harmony import */ var _proto_runtime_async_observer_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(8762);
/* harmony import */ var _proto_runtime_base64_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7034);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.





function unpackKvu(bytes) {
    if (bytes.length !== 8)
        throw new Error();
    if (bytes.buffer.byteLength !== 8)
        bytes = new Uint8Array(bytes);
    const rt = new DataView(bytes.buffer).getBigUint64(0, true);
    return new _kv_u64_js__WEBPACK_IMPORTED_MODULE_1__/* ._KvU64 */ .U(rt);
}
function packKvu(value) {
    const rt = new Uint8Array(8);
    new DataView(rt.buffer).setBigUint64(0, value.value, true);
    return rt;
}
function readValue(bytes, encoding, decodeV8) {
    if (encoding === "VE_V8")
        return decodeV8(bytes);
    if (encoding === "VE_LE64")
        return unpackKvu(bytes);
    if (encoding === "VE_BYTES")
        return bytes;
    throw new Error(`Unsupported encoding: ${encoding} [${[...bytes].join(", ")}]`);
}
function packKvValue(value, encodeV8) {
    if (value instanceof _kv_u64_js__WEBPACK_IMPORTED_MODULE_1__/* ._KvU64 */ .U) {
        return { encoding: "VE_LE64", data: packKvu(value) };
    }
    if (value instanceof Uint8Array)
        return { encoding: "VE_BYTES", data: value };
    return { encoding: "VE_V8", data: encodeV8(value) };
}
function packCursor({ lastYieldedKeyBytes }) {
    return (0,_proto_runtime_base64_js__WEBPACK_IMPORTED_MODULE_2__/* .encode */ .l)(JSON.stringify({ lastYieldedKeyBytes: (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(lastYieldedKeyBytes) }));
}
function unpackCursor(str) {
    try {
        const { lastYieldedKeyBytes } = JSON.parse(new TextDecoder().decode((0,_proto_runtime_base64_js__WEBPACK_IMPORTED_MODULE_2__/* .decode */ .D)(str)));
        if (typeof lastYieldedKeyBytes === "string") {
            return { lastYieldedKeyBytes: (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .decodeHex */ .EF)(lastYieldedKeyBytes) };
        }
    }
    catch {
        // noop
    }
    throw new Error(`Invalid cursor`);
}
function checkListSelector(selector) {
    if (!(0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .isRecord */ .u4)(selector)) {
        throw new TypeError(`Bad selector: ${JSON.stringify(selector)}`);
    }
    if ("prefix" in selector && "start" in selector && "end" in selector) {
        throw new TypeError(`Selector can not specify both 'start' and 'end' key when specifying 'prefix'`);
    }
}
function checkListOptions(options) {
    if (!(0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .isRecord */ .u4)(options)) {
        throw new TypeError(`Bad options: ${JSON.stringify(options)}`);
    }
    const { limit, cursor, consistency, batchSize } = options;
    if (!(limit === undefined ||
        typeof limit === "number" && limit > 0 && Number.isSafeInteger(limit)))
        throw new TypeError(`Bad 'limit': ${limit}`);
    if (!(cursor === undefined || typeof cursor === "string")) {
        throw new TypeError(`Bad 'cursor': ${limit}`);
    }
    const reverse = options.reverse === true; // follow native logic
    if (!(consistency === undefined || consistency === "strong" ||
        consistency === "eventual"))
        throw new TypeError(`Bad 'consistency': ${consistency}`);
    if (!(batchSize === undefined ||
        typeof batchSize === "number" && batchSize > 0 &&
            Number.isSafeInteger(batchSize) && batchSize <= 1000))
        throw new TypeError(`Bad 'batchSize': ${batchSize}`);
    return { limit, cursor, reverse, consistency, batchSize };
}
const packVersionstamp = (version) => `${version.toString().padStart(16, "0")}0000`;
const unpackVersionstamp = (versionstamp) => parseInt(checkMatches("versionstamp", versionstamp, /^(\d{16})0000$/)[1]);
const isValidVersionstamp = (versionstamp) => /^(\d{16})0000$/.test(versionstamp);
const replacer = (_this, v) => typeof v === "bigint" ? v.toString() : v;
class CursorHolder {
    constructor() {
        Object.defineProperty(this, "cursor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    get() {
        const { cursor } = this;
        if (cursor === undefined) {
            throw new Error(`Cannot get cursor before first iteration`);
        }
        return cursor;
    }
    set(cursor) {
        this.cursor = cursor;
    }
}
class GenericKvListIterator {
    constructor(generator, cursor) {
        Object.defineProperty(this, "generator", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_cursor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.generator = generator;
        this._cursor = cursor;
    }
    get cursor() {
        return this._cursor();
    }
    next() {
        return this.generator.next();
    }
    [Symbol.asyncIterator]() {
        return this.generator[Symbol.asyncIterator]();
    }
    // deno-lint-ignore no-explicit-any
    return(value) {
        return this.generator.return(value);
    }
    // deno-lint-ignore no-explicit-any
    throw(e) {
        return this.generator.throw(e);
    }
}
class GenericAtomicOperation {
    constructor(commit) {
        Object.defineProperty(this, "commitFn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "checks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "mutations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "enqueues", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.commitFn = commit;
    }
    check(...checks) {
        this.checks.push(...checks);
        return this;
    }
    mutate(...mutations) {
        mutations.map((v) => v.key).forEach(_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj);
        mutations.forEach((v) => v.type === "set" && (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkExpireIn */ .bk)(v.expireIn));
        this.mutations.push(...mutations);
        return this;
    }
    sum(key, n) {
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj)(key);
        return this.mutate({ type: "sum", key, value: new _kv_u64_js__WEBPACK_IMPORTED_MODULE_1__/* ._KvU64 */ .U(n) });
    }
    min(key, n) {
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj)(key);
        return this.mutate({ type: "min", key, value: new _kv_u64_js__WEBPACK_IMPORTED_MODULE_1__/* ._KvU64 */ .U(n) });
    }
    max(key, n) {
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj)(key);
        return this.mutate({ type: "max", key, value: new _kv_u64_js__WEBPACK_IMPORTED_MODULE_1__/* ._KvU64 */ .U(n) });
    }
    set(key, value, { expireIn } = {}) {
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkExpireIn */ .bk)(expireIn);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj)(key);
        return this.mutate({ type: "set", key, value, expireIn });
    }
    delete(key) {
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj)(key);
        return this.mutate({ type: "delete", key });
    }
    enqueue(value, opts) {
        this.enqueues.push({ value, opts });
        return this;
    }
    async commit() {
        return await this.commitFn(this.checks, this.mutations, this.enqueues);
    }
}
class BaseKv {
    constructor({ debug }) {
        Object.defineProperty(this, "debug", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "closed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.debug = debug;
    }
    async get(key, { consistency } = {}) {
        this.checkOpen("get");
        (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj)(key);
        return await this.get_(key, consistency);
    }
    // deno-lint-ignore no-explicit-any
    async getMany(keys, { consistency } = {}) {
        this.checkOpen("getMany");
        keys.forEach(_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj);
        if (keys.length === 0)
            return [];
        return await this.getMany_(keys, consistency);
    }
    async set(key, value, { expireIn } = {}) {
        this.checkOpen("set");
        const result = await this.atomic().set(key, value, { expireIn }).commit();
        if (!result.ok)
            throw new Error(`set failed`); // should never happen, there are no checks
        return result;
    }
    async delete(key) {
        this.checkOpen("delete");
        const result = await this.atomic().delete(key).commit();
        if (!result.ok)
            throw new Error(`delete failed`); // should never happen, there are no checks
    }
    async enqueue(value, opts) {
        this.checkOpen("enqueue");
        const result = await this.atomic().enqueue(value, opts).commit();
        if (!result.ok)
            throw new Error(`enqueue failed`); // should never happen, there are no checks
        return result;
    }
    list(selector, options = {}) {
        this.checkOpen("list");
        checkListSelector(selector);
        options = checkListOptions(options);
        const outCursor = new CursorHolder();
        const generator = this.listStream(outCursor, selector, options);
        return new GenericKvListIterator(generator, () => outCursor.get());
    }
    async listenQueue(handler) {
        this.checkOpen("listenQueue");
        return await this.listenQueue_(handler);
    }
    atomic(additionalWork) {
        return new GenericAtomicOperation(async (checks, mutations, enqueues) => {
            this.checkOpen("commit");
            return await this.commit(checks, mutations, enqueues, additionalWork);
        });
    }
    // deno-lint-ignore no-explicit-any
    watch(keys, options) {
        this.checkOpen("watch");
        if (keys.length === 0)
            throw new Error("Provide at least one key to watch");
        keys.forEach(_check_js__WEBPACK_IMPORTED_MODULE_3__/* .checkKeyNotEmpty */ .Yj);
        if (!(options === undefined ||
            (0,_check_js__WEBPACK_IMPORTED_MODULE_3__/* .isRecord */ .u4)(options) &&
                (options.raw === undefined || typeof options.raw === "boolean")))
            throw new Error(`Unexpected options: ${JSON.stringify(options)}`);
        const { raw } = options ?? {};
        return this.watch_(keys, raw);
    }
    close() {
        this.checkOpen("close");
        this.closed = true;
        this.close_();
    }
    [Symbol.dispose]() {
        this.close();
    }
    //
    checkOpen(method) {
        if (this.closed) {
            throw new Error(`Cannot call '.${method}' after '.close' is called`);
        }
    }
}
class Expirer {
    constructor(debug, expireFn) {
        Object.defineProperty(this, "debug", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "expireFn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "minExpires", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "expirerTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.debug = debug;
        this.expireFn = expireFn;
    }
    init(minExpires) {
        this.minExpires = minExpires;
        if (this.minExpires !== undefined)
            this.rescheduleExpirer(this.minExpires);
    }
    rescheduleExpirer(expires) {
        const { minExpires, debug, expirerTimeout } = this;
        if (minExpires !== undefined && minExpires < expires)
            return;
        this.minExpires = expires;
        clearTimeout(expirerTimeout);
        const delay = expires - Date.now();
        if (debug)
            console.log(`rescheduleExpirer: run in ${delay}ms`);
        this.expirerTimeout = setTimeout(() => this.runExpirer(), delay);
    }
    finalize() {
        clearTimeout(this.expirerTimeout);
    }
    //
    runExpirer() {
        const { expireFn } = this;
        const newMinExpires = expireFn();
        this.minExpires = newMinExpires;
        if (newMinExpires !== undefined) {
            this.rescheduleExpirer(newMinExpires);
        }
        else {
            clearTimeout(this.expirerTimeout);
        }
    }
}
class QueueWorker {
    constructor(workerFn) {
        Object.defineProperty(this, "workerFn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "workerTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "queueHandler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "queueHandlerPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.workerFn = workerFn;
    }
    listen(handler) {
        if (this.queueHandler)
            throw new Error(`Already called 'listenQueue'`); // for now
        this.queueHandler = handler;
        const rt = (0,_proto_runtime_async_observer_js__WEBPACK_IMPORTED_MODULE_4__/* .defer */ .v6)();
        this.queueHandlerPromise = rt;
        this.rescheduleWorker();
        return rt;
    }
    rescheduleWorker(delay = 0) {
        clearTimeout(this.workerTimeout);
        if (this.queueHandler) {
            this.workerTimeout = setTimeout(() => this.workerFn(this.queueHandler), delay);
        }
    }
    finalize() {
        clearTimeout(this.workerTimeout);
        this.queueHandlerPromise?.resolve();
    }
}


/***/ }),

/***/ 7417:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   f6: () => (/* binding */ makeNapiBasedService),
/* harmony export */   sY: () => (/* binding */ isNapiInterface)
/* harmony export */ });
/* unused harmony export NAPI_FUNCTIONS */
/* harmony import */ var _check_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2423);
/* harmony import */ var _kv_connect_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2637);
/* harmony import */ var _kv_key_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1118);
/* harmony import */ var _proto_messages_com_deno_kv_datapath_Watch_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9160);
/* harmony import */ var _proto_messages_com_deno_kv_datapath_WatchOutput_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(4635);
/* harmony import */ var _proto_based_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2073);
/* harmony import */ var _unraw_watch_stream_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(4503);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.







/**
 * Return a KVService that creates KV instances backed by a native Node NAPI interface.
 */
function makeNapiBasedService(opts) {
    return {
        openKv: (v) => Promise.resolve(NapiBasedKv.of(v, opts)),
    };
}
const NAPI_FUNCTIONS = [
    "open",
    "close",
    "snapshotRead",
    "atomicWrite",
    "dequeueNextMessage",
    "finishMessage",
    "startWatch",
    "dequeueNextWatchMessage",
    "endWatch",
];
function isNapiInterface(obj) {
    return (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .isRecord */ .u4)(obj) &&
        NAPI_FUNCTIONS.every((v) => typeof obj[v] === "function");
}
//
// deno-lint-ignore no-explicit-any
const DEFAULT_NAPI_INTERFACE = await __webpack_require__.e(/* import() */ 419).then(__webpack_require__.t.bind(__webpack_require__, 8419, 19));
class NapiBasedKv extends _proto_based_js__WEBPACK_IMPORTED_MODULE_4__/* .ProtoBasedKv */ .lY {
    constructor(debug, napi, dbId, decodeV8, encodeV8) {
        super(debug, decodeV8, encodeV8);
        Object.defineProperty(this, "napi", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dbId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.napi = napi;
        this.dbId = dbId;
    }
    static of(url, opts) {
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkOptionalString */ .UW)("url", url);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkRecord */ .EQ)("opts", opts);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkOptionalBoolean */ .pm)("opts.debug", opts.debug);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkOptionalObject */ .Ur)("opts.napi", opts.napi);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkOptionalFunction */ .vS)("opts.decodeV8", opts.decodeV8);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkOptionalFunction */ .vS)("opts.encodeV8", opts.encodeV8);
        (0,_check_js__WEBPACK_IMPORTED_MODULE_5__/* .checkOptionalBoolean */ .pm)("opts.inMemory", opts.inMemory);
        const { debug = false, napi = DEFAULT_NAPI_INTERFACE, decodeV8, encodeV8, inMemory, } = opts;
        if (typeof url !== "string" || /^https?:\/\//i.test(url)) {
            throw new Error(`Invalid path: ${url}`);
        }
        if (napi === undefined) {
            throw new Error(`No default napi interface, provide one via the 'napi' option.`);
        }
        const dbId = napi.open(url, inMemory, debug);
        return new NapiBasedKv(debug, napi, dbId, decodeV8, encodeV8);
    }
    async listenQueue_(handler) {
        const { napi, dbId, decodeV8, debug } = this;
        while (true) {
            if (debug)
                console.log(`listenQueue_: before dequeueNextMessage`);
            const result = await napi.dequeueNextMessage(dbId, debug);
            if (result === undefined)
                return;
            const { bytes, messageId } = result;
            const value = decodeV8(bytes);
            if (debug)
                console.log(`listenQueue_: after value ${value}`);
            try {
                await Promise.resolve(handler(value));
                await napi.finishMessage(dbId, messageId, true, debug);
            }
            catch (e) {
                if (debug)
                    console.log(`listenQueue_: handler failed ${e.stack || e}`);
                await napi.finishMessage(dbId, messageId, false, debug);
            }
        }
    }
    close_() {
        const { napi, dbId, debug } = this;
        napi.close(dbId, debug);
    }
    async snapshotRead(req, _consistency) {
        const { napi, dbId, debug } = this;
        const res = await napi.snapshotRead(dbId, (0,_kv_connect_api_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeSnapshotRead */ .TQ)(req), debug);
        return (0,_kv_connect_api_js__WEBPACK_IMPORTED_MODULE_0__/* .decodeSnapshotReadOutput */ .Gd)(res);
    }
    async atomicWrite(req) {
        const { napi, dbId, debug } = this;
        const res = await napi.atomicWrite(dbId, (0,_kv_connect_api_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeAtomicWrite */ .hW)(req), debug);
        return (0,_kv_connect_api_js__WEBPACK_IMPORTED_MODULE_0__/* .decodeAtomicWriteOutput */ .sF)(res);
    }
    watch_(keys, raw) {
        const { napi, dbId, debug, decodeV8 } = this;
        const { startWatch, dequeueNextWatchMessage, endWatch } = napi;
        if (startWatch === undefined || dequeueNextWatchMessage === undefined ||
            endWatch === undefined) {
            throw new Error("watch: not implemented");
        }
        const watch = {
            keys: keys.map((v) => ({ key: (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(v) })),
        };
        let watchId;
        let ended = false;
        const endWatchIfNecessary = () => {
            if (watchId !== undefined && !ended)
                endWatch(dbId, watchId, debug);
            ended = true;
        };
        const cache = new _proto_based_js__WEBPACK_IMPORTED_MODULE_4__/* .WatchCache */ .Y2(decodeV8, keys);
        const rawStream = new ReadableStream({
            async pull(controller) {
                if (watchId === undefined) {
                    watchId = await startWatch(dbId, (0,_proto_messages_com_deno_kv_datapath_Watch_js__WEBPACK_IMPORTED_MODULE_2__/* .encodeBinary */ .cY)(watch), debug);
                }
                const watchOutputBytes = await dequeueNextWatchMessage(dbId, watchId, debug);
                if (watchOutputBytes === undefined) {
                    endWatchIfNecessary();
                    controller.close();
                    return;
                }
                const watchOutput = (0,_proto_messages_com_deno_kv_datapath_WatchOutput_js__WEBPACK_IMPORTED_MODULE_3__/* .decodeBinary */ .AQ)(watchOutputBytes);
                const { status, keys: outputKeys } = watchOutput;
                if (status !== "SR_SUCCESS") {
                    throw new Error(`Unexpected status: ${status}`);
                }
                const entries = cache.processOutputKeys(outputKeys);
                controller.enqueue(entries);
            },
            cancel() {
                endWatchIfNecessary();
            },
        });
        return raw
            ? rawStream
            : (0,_unraw_watch_stream_js__WEBPACK_IMPORTED_MODULE_6__/* .makeUnrawWatchStream */ .p)(rawStream, endWatchIfNecessary);
    }
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 2880:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   V: () => (/* binding */ makeNativeService)
/* harmony export */ });
/* harmony import */ var _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1170);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.

/**
 * Creates a new KvService instance that can be used to access Deno's native implementation (only works in the Deno runtime!)
 *
 * Requires the --unstable flag to `deno run` and any applicable --allow-read/allow-write/allow-net flags
 */
function makeNativeService() {
    if ("Deno" in _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__/* .dntGlobalThis */ .y) {
        // deno-lint-ignore no-explicit-any
        const { openKv } = _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__/* .dntGlobalThis */ .y.Deno;
        if (typeof openKv === "function") {
            return {
                // deno-lint-ignore no-explicit-any
                openKv: openKv,
            };
        }
    }
    throw new Error(`Global 'Deno.openKv' not found`);
}


/***/ }),

/***/ 2202:
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   openKv: () => (/* binding */ openKv)
/* harmony export */ });
/* harmony import */ var _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1170);
/* harmony import */ var _check_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(2423);
/* harmony import */ var _in_memory_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8880);
/* harmony import */ var _napi_based_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7417);
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2880);
/* harmony import */ var _remote_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(4288);
/* harmony import */ var _kv_types_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1556);
/* harmony import */ var _v8_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(33);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_napi_based_js__WEBPACK_IMPORTED_MODULE_2__]);
_napi_based_js__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
// Copyright 2023 the Deno authors. All rights reserved. MIT license.











/**
 * Open a new {@linkcode Kv} connection to persist data.
 *
 * When an url is provided, this will connect to a remote [Deno Deploy](https://deno.com/deploy) database
 * or any other endpoint that supports the open [KV Connect](https://github.com/denoland/denokv/blob/main/proto/kv-connect.md) protocol.
 *
 * When a local path is provided, this will use a sqlite database on disk. Read and write access to the file is required.
 *
 * When no path is provided, this will use an ephemeral in-memory implementation.
 */
async function openKv(path, opts = {}) {
    (0,_check_js__WEBPACK_IMPORTED_MODULE_7__/* .checkOptionalString */ .UW)("path", path);
    (0,_check_js__WEBPACK_IMPORTED_MODULE_7__/* .checkRecord */ .EQ)("opts", opts);
    (0,_check_js__WEBPACK_IMPORTED_MODULE_7__/* .checkOptionalBoolean */ .pm)("opts.debug", opts.debug);
    (0,_check_js__WEBPACK_IMPORTED_MODULE_7__/* .check */ .z6)("opts.implementation", opts.implementation, opts.implementation === undefined ||
        ["in-memory", "sqlite", "remote"].includes(opts.implementation));
    const { debug, implementation } = opts;
    // use built-in native implementation if available when running on Deno
    if ("Deno" in _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__/* .dntGlobalThis */ .y && !implementation) {
        // deno-lint-ignore no-explicit-any
        const { openKv } = _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__/* .dntGlobalThis */ .y.Deno;
        if (typeof openKv === "function")
            return (0,_native_js__WEBPACK_IMPORTED_MODULE_3__/* .makeNativeService */ .V)().openKv(path);
    }
    // use in-memory implementation if no path provided
    if (path === undefined || path === "" || implementation === "in-memory") {
        const maxQueueAttempts = typeof opts.maxQueueAttempts === "number"
            ? opts.maxQueueAttempts
            : undefined;
        return await (0,_in_memory_js__WEBPACK_IMPORTED_MODULE_1__/* .makeInMemoryService */ .o)({ debug, maxQueueAttempts }).openKv(path);
    }
    const { encodeV8, decodeV8 } = await (async () => {
        const { encodeV8, decodeV8 } = opts;
        const defined = [encodeV8, decodeV8].filter((v) => v !== undefined).length;
        if (defined === 1) {
            throw new Error(`Provide both 'encodeV8' or 'decodeV8', or neither`);
        }
        if (defined > 0) {
            if (typeof encodeV8 !== "function") {
                throw new Error(`Unexpected 'encodeV8': ${encodeV8}`);
            }
            if (typeof decodeV8 !== "function") {
                throw new Error(`Unexpected 'decodeV8': ${decodeV8}`);
            }
            return { encodeV8: encodeV8, decodeV8: decodeV8 };
        }
        if ("Bun" in _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__/* .dntGlobalThis */ .y) {
            throw new Error(`Bun provides v8.serialize/deserialize, but it uses an incompatible format (JavaScriptCore). Provide explicit 'encodeV8' and 'decodeV8' functions via options. See https://www.npmjs.com/package/@deno/kv#other-runtimes`); // https://discord.com/channels/876711213126520882/888937948345684008/1150135641137487892
        }
        const v8 = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 1493, 19));
        if (!v8)
            throw new Error(`Unable to import the v8 module`);
        const { serialize, deserialize } = v8;
        if (typeof serialize !== "function") {
            throw new Error(`Unexpected 'serialize': ${serialize}`);
        }
        if (typeof deserialize !== "function") {
            throw new Error(`Unexpected 'deserialize': ${deserialize}`);
        }
        return {
            encodeV8: serialize,
            decodeV8: deserialize,
        };
    })();
    // use remote implementation if path looks like a url
    if (/^https?:\/\//i.test(path) || implementation === "remote") {
        let accessToken = typeof opts.accessToken === "string" && opts.accessToken !== ""
            ? opts.accessToken
            : undefined;
        if (accessToken === undefined) {
            // deno-lint-ignore no-explicit-any
            accessToken = _dnt_shims_js__WEBPACK_IMPORTED_MODULE_0__/* .dntGlobalThis */ .y?.process?.env?.DENO_KV_ACCESS_TOKEN;
            if (typeof accessToken !== "string") {
                throw new Error(`Set the DENO_KV_ACCESS_TOKEN to your access token`);
            }
        }
        const fetcher = typeof opts.fetcher === "function"
            ? opts.fetcher
            : undefined;
        const maxRetries = typeof opts.maxRetries === "number"
            ? opts.maxRetries
            : undefined;
        const wrapUnknownValues = typeof opts.wrapUnknownValues === "boolean"
            ? opts.wrapUnknownValues
            : undefined;
        const supportedVersions = Array.isArray(opts.supportedVersions) &&
            opts.supportedVersions.every((v) => typeof v === "number")
            ? opts.supportedVersions
            : undefined;
        return await (0,_remote_js__WEBPACK_IMPORTED_MODULE_4__/* .makeRemoteService */ .K)({
            debug,
            accessToken,
            encodeV8,
            decodeV8,
            fetcher,
            maxRetries,
            supportedVersions,
            wrapUnknownValues,
        }).openKv(path);
    }
    // else use the sqlite napi implementation
    const { napi } = opts;
    if (napi !== undefined && !(0,_napi_based_js__WEBPACK_IMPORTED_MODULE_2__/* .isNapiInterface */ .sY)(napi)) {
        throw new Error(`Unexpected napi interface for sqlite`);
    }
    const inMemory = typeof opts.inMemory === "boolean"
        ? opts.inMemory
        : undefined;
    return await (0,_napi_based_js__WEBPACK_IMPORTED_MODULE_2__/* .makeNapiBasedService */ .f6)({
        debug,
        encodeV8,
        decodeV8,
        napi,
        inMemory,
    }).openKv(path);
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 2186:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  cY: () => (/* binding */ AtomicWrite_encodeBinary),
  Pr: () => (/* binding */ AtomicWrite_encodeJson)
});

// UNUSED EXPORTS: createValue, decodeBinary, decodeJson, getDefaultValue

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/json/scalar.js
var scalar = __webpack_require__(3422);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/serialize.js
var serialize = __webpack_require__(8429);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/scalar.js + 1 modules
var wire_scalar = __webpack_require__(4576);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/deserialize.js
var wire_deserialize = __webpack_require__(6448);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/Check.js
// @ts-nocheck




function getDefaultValue() {
    return {
        key: new Uint8Array(),
        versionstamp: new Uint8Array(),
    };
}
function createValue(partialValue) {
    return {
        ...getDefaultValue(),
        ...partialValue,
    };
}
function encodeJson(value) {
    const result = {};
    if (value.key !== undefined)
        result.key = scalar/* tsValueToJsonValueFns */.u.bytes(value.key);
    if (value.versionstamp !== undefined)
        result.versionstamp = scalar/* tsValueToJsonValueFns */.u.bytes(value.versionstamp);
    return result;
}
function decodeJson(value) {
    const result = getDefaultValue();
    if (value.key !== undefined)
        result.key = jsonValueToTsValueFns.bytes(value.key);
    if (value.versionstamp !== undefined)
        result.versionstamp = jsonValueToTsValueFns.bytes(value.versionstamp);
    return result;
}
function encodeBinary(value) {
    const result = [];
    if (value.key !== undefined) {
        const tsValue = value.key;
        result.push([1, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    if (value.versionstamp !== undefined) {
        const tsValue = value.versionstamp;
        result.push([2, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    return (0,serialize/* default */.A)(result);
}
function decodeBinary(binary) {
    const result = getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.key = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.versionstamp = value;
    }
    return result;
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/ValueEncoding.js
var ValueEncoding = __webpack_require__(5892);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/index.js
var wire = __webpack_require__(8047);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/Long.js
var Long = __webpack_require__(1055);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/KvValue.js
// @ts-nocheck







function KvValue_getDefaultValue() {
    return {
        data: new Uint8Array(),
        encoding: "VE_UNSPECIFIED",
    };
}
function KvValue_createValue(partialValue) {
    return {
        ...KvValue_getDefaultValue(),
        ...partialValue,
    };
}
function KvValue_encodeJson(value) {
    const result = {};
    if (value.data !== undefined)
        result.data = scalar/* tsValueToJsonValueFns */.u.bytes(value.data);
    if (value.encoding !== undefined)
        result.encoding = scalar/* tsValueToJsonValueFns */.u.enum(value.encoding);
    return result;
}
function KvValue_decodeJson(value) {
    const result = KvValue_getDefaultValue();
    if (value.data !== undefined)
        result.data = jsonValueToTsValueFns.bytes(value.data);
    if (value.encoding !== undefined)
        result.encoding = jsonValueToTsValueFns.enum(value.encoding);
    return result;
}
function KvValue_encodeBinary(value) {
    const result = [];
    if (value.data !== undefined) {
        const tsValue = value.data;
        result.push([1, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    if (value.encoding !== undefined) {
        const tsValue = value.encoding;
        result.push([2, { type: wire/* WireType */.O.Varint, value: new Long/* default */.Ay(ValueEncoding/* name2num */.m[tsValue]) }]);
    }
    return (0,serialize/* default */.A)(result);
}
function KvValue_decodeBinary(binary) {
    const result = KvValue_getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.data = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === WireType.Varint ? num2name[wireValue.value[0]] : undefined;
        if (value === undefined)
            break field;
        result.encoding = value;
    }
    return result;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/MutationType.js
const MutationType_num2name = {
    0: "M_UNSPECIFIED",
    1: "M_SET",
    2: "M_DELETE",
    3: "M_SUM",
    4: "M_MAX",
    5: "M_MIN",
};
const name2num = {
    M_UNSPECIFIED: 0,
    M_SET: 1,
    M_DELETE: 2,
    M_SUM: 3,
    M_MAX: 4,
    M_MIN: 5,
};

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/Mutation.js
// @ts-nocheck








function Mutation_getDefaultValue() {
    return {
        key: new Uint8Array(),
        value: undefined,
        mutationType: "M_UNSPECIFIED",
        expireAtMs: "0",
    };
}
function Mutation_createValue(partialValue) {
    return {
        ...Mutation_getDefaultValue(),
        ...partialValue,
    };
}
function Mutation_encodeJson(value) {
    const result = {};
    if (value.key !== undefined)
        result.key = scalar/* tsValueToJsonValueFns */.u.bytes(value.key);
    if (value.value !== undefined)
        result.value = KvValue_encodeJson(value.value);
    if (value.mutationType !== undefined)
        result.mutationType = scalar/* tsValueToJsonValueFns */.u.enum(value.mutationType);
    if (value.expireAtMs !== undefined)
        result.expireAtMs = scalar/* tsValueToJsonValueFns */.u.int64(value.expireAtMs);
    return result;
}
function Mutation_decodeJson(value) {
    const result = Mutation_getDefaultValue();
    if (value.key !== undefined)
        result.key = jsonValueToTsValueFns.bytes(value.key);
    if (value.value !== undefined)
        result.value = decodeJson_1(value.value);
    if (value.mutationType !== undefined)
        result.mutationType = jsonValueToTsValueFns.enum(value.mutationType);
    if (value.expireAtMs !== undefined)
        result.expireAtMs = jsonValueToTsValueFns.int64(value.expireAtMs);
    return result;
}
function Mutation_encodeBinary(value) {
    const result = [];
    if (value.key !== undefined) {
        const tsValue = value.key;
        result.push([1, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    if (value.value !== undefined) {
        const tsValue = value.value;
        result.push([2, { type: wire/* WireType */.O.LengthDelimited, value: KvValue_encodeBinary(tsValue) }]);
    }
    if (value.mutationType !== undefined) {
        const tsValue = value.mutationType;
        result.push([3, { type: wire/* WireType */.O.Varint, value: new Long/* default */.Ay(name2num[tsValue]) }]);
    }
    if (value.expireAtMs !== undefined) {
        const tsValue = value.expireAtMs;
        result.push([4, wire_scalar/* tsValueToWireValueFns */.td.int64(tsValue)]);
    }
    return (0,serialize/* default */.A)(result);
}
function Mutation_decodeBinary(binary) {
    const result = Mutation_getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.key = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined;
        if (value === undefined)
            break field;
        result.value = value;
    }
    field: {
        const wireValue = wireFields.get(3);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === WireType.Varint ? num2name[wireValue.value[0]] : undefined;
        if (value === undefined)
            break field;
        result.mutationType = value;
    }
    field: {
        const wireValue = wireFields.get(4);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.int64(wireValue);
        if (value === undefined)
            break field;
        result.expireAtMs = value;
    }
    return result;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/Enqueue.js
// @ts-nocheck




function Enqueue_getDefaultValue() {
    return {
        payload: new Uint8Array(),
        deadlineMs: "0",
        keysIfUndelivered: [],
        backoffSchedule: [],
    };
}
function Enqueue_createValue(partialValue) {
    return {
        ...Enqueue_getDefaultValue(),
        ...partialValue,
    };
}
function Enqueue_encodeJson(value) {
    const result = {};
    if (value.payload !== undefined)
        result.payload = scalar/* tsValueToJsonValueFns */.u.bytes(value.payload);
    if (value.deadlineMs !== undefined)
        result.deadlineMs = scalar/* tsValueToJsonValueFns */.u.int64(value.deadlineMs);
    result.keysIfUndelivered = value.keysIfUndelivered.map(value => scalar/* tsValueToJsonValueFns */.u.bytes(value));
    result.backoffSchedule = value.backoffSchedule.map(value => scalar/* tsValueToJsonValueFns */.u.uint32(value));
    return result;
}
function Enqueue_decodeJson(value) {
    const result = Enqueue_getDefaultValue();
    if (value.payload !== undefined)
        result.payload = jsonValueToTsValueFns.bytes(value.payload);
    if (value.deadlineMs !== undefined)
        result.deadlineMs = jsonValueToTsValueFns.int64(value.deadlineMs);
    result.keysIfUndelivered = value.keysIfUndelivered?.map((value) => jsonValueToTsValueFns.bytes(value)) ?? [];
    result.backoffSchedule = value.backoffSchedule?.map((value) => jsonValueToTsValueFns.uint32(value)) ?? [];
    return result;
}
function Enqueue_encodeBinary(value) {
    const result = [];
    if (value.payload !== undefined) {
        const tsValue = value.payload;
        result.push([1, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    if (value.deadlineMs !== undefined) {
        const tsValue = value.deadlineMs;
        result.push([2, wire_scalar/* tsValueToWireValueFns */.td.int64(tsValue)]);
    }
    for (const tsValue of value.keysIfUndelivered) {
        result.push([3, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    for (const tsValue of value.backoffSchedule) {
        result.push([4, wire_scalar/* tsValueToWireValueFns */.td.uint32(tsValue)]);
    }
    return (0,serialize/* default */.A)(result);
}
function Enqueue_decodeBinary(binary) {
    const result = Enqueue_getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.payload = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.int64(wireValue);
        if (value === undefined)
            break field;
        result.deadlineMs = value;
    }
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 3).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValueToTsValueFns.bytes(wireValue)).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.keysIfUndelivered = value;
    }
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 4).map(([, wireValue]) => wireValue);
        const value = Array.from(unpackFns.uint32(wireValues));
        if (!value.length)
            break collection;
        result.backoffSchedule = value;
    }
    return result;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/AtomicWrite.js
// @ts-nocheck






function AtomicWrite_getDefaultValue() {
    return {
        checks: [],
        mutations: [],
        enqueues: [],
    };
}
function AtomicWrite_createValue(partialValue) {
    return {
        ...AtomicWrite_getDefaultValue(),
        ...partialValue,
    };
}
function AtomicWrite_encodeJson(value) {
    const result = {};
    result.checks = value.checks.map(value => encodeJson(value));
    result.mutations = value.mutations.map(value => Mutation_encodeJson(value));
    result.enqueues = value.enqueues.map(value => Enqueue_encodeJson(value));
    return result;
}
function AtomicWrite_decodeJson(value) {
    const result = AtomicWrite_getDefaultValue();
    result.checks = value.checks?.map((value) => decodeJson_1(value)) ?? [];
    result.mutations = value.mutations?.map((value) => decodeJson_2(value)) ?? [];
    result.enqueues = value.enqueues?.map((value) => decodeJson_3(value)) ?? [];
    return result;
}
function AtomicWrite_encodeBinary(value) {
    const result = [];
    for (const tsValue of value.checks) {
        result.push([1, { type: wire/* WireType */.O.LengthDelimited, value: encodeBinary(tsValue) }]);
    }
    for (const tsValue of value.mutations) {
        result.push([2, { type: wire/* WireType */.O.LengthDelimited, value: Mutation_encodeBinary(tsValue) }]);
    }
    for (const tsValue of value.enqueues) {
        result.push([3, { type: wire/* WireType */.O.LengthDelimited, value: Enqueue_encodeBinary(tsValue) }]);
    }
    return (0,serialize/* default */.A)(result);
}
function AtomicWrite_decodeBinary(binary) {
    const result = AtomicWrite_getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 1).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.checks = value;
    }
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 2).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_2(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.mutations = value;
    }
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 3).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_3(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.enqueues = value;
    }
    return result;
}


/***/ }),

/***/ 6379:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AQ: () => (/* binding */ decodeBinary)
/* harmony export */ });
/* unused harmony exports getDefaultValue, createValue, encodeJson, decodeJson, encodeBinary */
/* harmony import */ var _ValueEncoding_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5892);
/* harmony import */ var _runtime_json_scalar_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3422);
/* harmony import */ var _runtime_wire_index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(8047);
/* harmony import */ var _runtime_wire_serialize_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8429);
/* harmony import */ var _runtime_wire_scalar_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(4576);
/* harmony import */ var _runtime_Long_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(1055);
/* harmony import */ var _runtime_wire_deserialize_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(6448);
// @ts-nocheck







function getDefaultValue() {
    return {
        key: new Uint8Array(),
        value: new Uint8Array(),
        encoding: "VE_UNSPECIFIED",
        versionstamp: new Uint8Array(),
    };
}
function createValue(partialValue) {
    return {
        ...getDefaultValue(),
        ...partialValue,
    };
}
function encodeJson(value) {
    const result = {};
    if (value.key !== undefined)
        result.key = tsValueToJsonValueFns.bytes(value.key);
    if (value.value !== undefined)
        result.value = tsValueToJsonValueFns.bytes(value.value);
    if (value.encoding !== undefined)
        result.encoding = tsValueToJsonValueFns.enum(value.encoding);
    if (value.versionstamp !== undefined)
        result.versionstamp = tsValueToJsonValueFns.bytes(value.versionstamp);
    return result;
}
function decodeJson(value) {
    const result = getDefaultValue();
    if (value.key !== undefined)
        result.key = jsonValueToTsValueFns.bytes(value.key);
    if (value.value !== undefined)
        result.value = jsonValueToTsValueFns.bytes(value.value);
    if (value.encoding !== undefined)
        result.encoding = jsonValueToTsValueFns.enum(value.encoding);
    if (value.versionstamp !== undefined)
        result.versionstamp = jsonValueToTsValueFns.bytes(value.versionstamp);
    return result;
}
function encodeBinary(value) {
    const result = [];
    if (value.key !== undefined) {
        const tsValue = value.key;
        result.push([1, tsValueToWireValueFns.bytes(tsValue)]);
    }
    if (value.value !== undefined) {
        const tsValue = value.value;
        result.push([2, tsValueToWireValueFns.bytes(tsValue)]);
    }
    if (value.encoding !== undefined) {
        const tsValue = value.encoding;
        result.push([3, { type: WireType.Varint, value: new Long(name2num[tsValue]) }]);
    }
    if (value.versionstamp !== undefined) {
        const tsValue = value.versionstamp;
        result.push([4, tsValueToWireValueFns.bytes(tsValue)]);
    }
    return serialize(result);
}
function decodeBinary(binary) {
    const result = getDefaultValue();
    const wireMessage = (0,_runtime_wire_deserialize_js__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A)(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = _runtime_wire_scalar_js__WEBPACK_IMPORTED_MODULE_4__/* .wireValueToTsValueFns */ .Vz.bytes(wireValue);
        if (value === undefined)
            break field;
        result.key = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = _runtime_wire_scalar_js__WEBPACK_IMPORTED_MODULE_4__/* .wireValueToTsValueFns */ .Vz.bytes(wireValue);
        if (value === undefined)
            break field;
        result.value = value;
    }
    field: {
        const wireValue = wireFields.get(3);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === _runtime_wire_index_js__WEBPACK_IMPORTED_MODULE_2__/* .WireType */ .O.Varint ? _ValueEncoding_js__WEBPACK_IMPORTED_MODULE_0__/* .num2name */ .G[wireValue.value[0]] : undefined;
        if (value === undefined)
            break field;
        result.encoding = value;
    }
    field: {
        const wireValue = wireFields.get(4);
        if (wireValue === undefined)
            break field;
        const value = _runtime_wire_scalar_js__WEBPACK_IMPORTED_MODULE_4__/* .wireValueToTsValueFns */ .Vz.bytes(wireValue);
        if (value === undefined)
            break field;
        result.versionstamp = value;
    }
    return result;
}


/***/ }),

/***/ 6111:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  cY: () => (/* binding */ SnapshotRead_encodeBinary),
  Pr: () => (/* binding */ SnapshotRead_encodeJson)
});

// UNUSED EXPORTS: createValue, decodeBinary, decodeJson, getDefaultValue

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/json/scalar.js
var scalar = __webpack_require__(3422);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/serialize.js
var serialize = __webpack_require__(8429);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/scalar.js + 1 modules
var wire_scalar = __webpack_require__(4576);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/deserialize.js
var wire_deserialize = __webpack_require__(6448);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/ReadRange.js
// @ts-nocheck




function getDefaultValue() {
    return {
        start: new Uint8Array(),
        end: new Uint8Array(),
        limit: 0,
        reverse: false,
    };
}
function createValue(partialValue) {
    return {
        ...getDefaultValue(),
        ...partialValue,
    };
}
function encodeJson(value) {
    const result = {};
    if (value.start !== undefined)
        result.start = scalar/* tsValueToJsonValueFns */.u.bytes(value.start);
    if (value.end !== undefined)
        result.end = scalar/* tsValueToJsonValueFns */.u.bytes(value.end);
    if (value.limit !== undefined)
        result.limit = scalar/* tsValueToJsonValueFns */.u.int32(value.limit);
    if (value.reverse !== undefined)
        result.reverse = scalar/* tsValueToJsonValueFns */.u.bool(value.reverse);
    return result;
}
function decodeJson(value) {
    const result = getDefaultValue();
    if (value.start !== undefined)
        result.start = jsonValueToTsValueFns.bytes(value.start);
    if (value.end !== undefined)
        result.end = jsonValueToTsValueFns.bytes(value.end);
    if (value.limit !== undefined)
        result.limit = jsonValueToTsValueFns.int32(value.limit);
    if (value.reverse !== undefined)
        result.reverse = jsonValueToTsValueFns.bool(value.reverse);
    return result;
}
function encodeBinary(value) {
    const result = [];
    if (value.start !== undefined) {
        const tsValue = value.start;
        result.push([1, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    if (value.end !== undefined) {
        const tsValue = value.end;
        result.push([2, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    if (value.limit !== undefined) {
        const tsValue = value.limit;
        result.push([3, wire_scalar/* tsValueToWireValueFns */.td.int32(tsValue)]);
    }
    if (value.reverse !== undefined) {
        const tsValue = value.reverse;
        result.push([4, wire_scalar/* tsValueToWireValueFns */.td.bool(tsValue)]);
    }
    return (0,serialize/* default */.A)(result);
}
function decodeBinary(binary) {
    const result = getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.start = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.end = value;
    }
    field: {
        const wireValue = wireFields.get(3);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.int32(wireValue);
        if (value === undefined)
            break field;
        result.limit = value;
    }
    field: {
        const wireValue = wireFields.get(4);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bool(wireValue);
        if (value === undefined)
            break field;
        result.reverse = value;
    }
    return result;
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/index.js
var wire = __webpack_require__(8047);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/SnapshotRead.js
// @ts-nocheck




function SnapshotRead_getDefaultValue() {
    return {
        ranges: [],
    };
}
function SnapshotRead_createValue(partialValue) {
    return {
        ...SnapshotRead_getDefaultValue(),
        ...partialValue,
    };
}
function SnapshotRead_encodeJson(value) {
    const result = {};
    result.ranges = value.ranges.map(value => encodeJson(value));
    return result;
}
function SnapshotRead_decodeJson(value) {
    const result = SnapshotRead_getDefaultValue();
    result.ranges = value.ranges?.map((value) => decodeJson_1(value)) ?? [];
    return result;
}
function SnapshotRead_encodeBinary(value) {
    const result = [];
    for (const tsValue of value.ranges) {
        result.push([1, { type: wire/* WireType */.O.LengthDelimited, value: encodeBinary(tsValue) }]);
    }
    return (0,serialize/* default */.A)(result);
}
function SnapshotRead_decodeBinary(binary) {
    const result = SnapshotRead_getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 1).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.ranges = value;
    }
    return result;
}


/***/ }),

/***/ 2744:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   G: () => (/* binding */ num2name)
/* harmony export */ });
/* unused harmony export name2num */
const num2name = {
    0: "SR_UNSPECIFIED",
    1: "SR_SUCCESS",
    2: "SR_READ_DISABLED",
};
const name2num = {
    SR_UNSPECIFIED: 0,
    SR_SUCCESS: 1,
    SR_READ_DISABLED: 2,
};


/***/ }),

/***/ 5892:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   G: () => (/* binding */ num2name),
/* harmony export */   m: () => (/* binding */ name2num)
/* harmony export */ });
const num2name = {
    0: "VE_UNSPECIFIED",
    1: "VE_V8",
    2: "VE_LE64",
    3: "VE_BYTES",
};
const name2num = {
    VE_UNSPECIFIED: 0,
    VE_V8: 1,
    VE_LE64: 2,
    VE_BYTES: 3,
};


/***/ }),

/***/ 9160:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  cY: () => (/* binding */ Watch_encodeBinary),
  Pr: () => (/* binding */ Watch_encodeJson)
});

// UNUSED EXPORTS: createValue, decodeBinary, decodeJson, getDefaultValue

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/json/scalar.js
var scalar = __webpack_require__(3422);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/serialize.js
var serialize = __webpack_require__(8429);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/scalar.js + 1 modules
var wire_scalar = __webpack_require__(4576);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/deserialize.js
var wire_deserialize = __webpack_require__(6448);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/WatchKey.js
// @ts-nocheck




function getDefaultValue() {
    return {
        key: new Uint8Array(),
    };
}
function createValue(partialValue) {
    return {
        ...getDefaultValue(),
        ...partialValue,
    };
}
function encodeJson(value) {
    const result = {};
    if (value.key !== undefined)
        result.key = scalar/* tsValueToJsonValueFns */.u.bytes(value.key);
    return result;
}
function decodeJson(value) {
    const result = getDefaultValue();
    if (value.key !== undefined)
        result.key = jsonValueToTsValueFns.bytes(value.key);
    return result;
}
function encodeBinary(value) {
    const result = [];
    if (value.key !== undefined) {
        const tsValue = value.key;
        result.push([1, wire_scalar/* tsValueToWireValueFns */.td.bytes(tsValue)]);
    }
    return (0,serialize/* default */.A)(result);
}
function decodeBinary(binary) {
    const result = getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValueToTsValueFns.bytes(wireValue);
        if (value === undefined)
            break field;
        result.key = value;
    }
    return result;
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/index.js
var wire = __webpack_require__(8047);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/Watch.js
// @ts-nocheck




function Watch_getDefaultValue() {
    return {
        keys: [],
    };
}
function Watch_createValue(partialValue) {
    return {
        ...Watch_getDefaultValue(),
        ...partialValue,
    };
}
function Watch_encodeJson(value) {
    const result = {};
    result.keys = value.keys.map(value => encodeJson(value));
    return result;
}
function Watch_decodeJson(value) {
    const result = Watch_getDefaultValue();
    result.keys = value.keys?.map((value) => decodeJson_1(value)) ?? [];
    return result;
}
function Watch_encodeBinary(value) {
    const result = [];
    for (const tsValue of value.keys) {
        result.push([1, { type: wire/* WireType */.O.LengthDelimited, value: encodeBinary(tsValue) }]);
    }
    return (0,serialize/* default */.A)(result);
}
function Watch_decodeBinary(binary) {
    const result = Watch_getDefaultValue();
    const wireMessage = deserialize(binary);
    const wireFields = new Map(wireMessage);
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 1).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.keys = value;
    }
    return result;
}


/***/ }),

/***/ 4635:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  AQ: () => (/* binding */ WatchOutput_decodeBinary)
});

// UNUSED EXPORTS: createValue, decodeJson, encodeBinary, encodeJson, getDefaultValue

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/SnapshotReadStatus.js
var SnapshotReadStatus = __webpack_require__(2744);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/KvEntry.js
var KvEntry = __webpack_require__(6379);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/json/scalar.js
var scalar = __webpack_require__(3422);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/index.js
var wire = __webpack_require__(8047);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/serialize.js
var wire_serialize = __webpack_require__(8429);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/scalar.js + 1 modules
var wire_scalar = __webpack_require__(4576);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/deserialize.js
var deserialize = __webpack_require__(6448);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/WatchKeyOutput.js
// @ts-nocheck






function getDefaultValue() {
    return {
        changed: false,
        entryIfChanged: undefined,
    };
}
function createValue(partialValue) {
    return {
        ...getDefaultValue(),
        ...partialValue,
    };
}
function encodeJson(value) {
    const result = {};
    if (value.changed !== undefined)
        result.changed = tsValueToJsonValueFns.bool(value.changed);
    if (value.entryIfChanged !== undefined)
        result.entryIfChanged = encodeJson_1(value.entryIfChanged);
    return result;
}
function decodeJson(value) {
    const result = getDefaultValue();
    if (value.changed !== undefined)
        result.changed = jsonValueToTsValueFns.bool(value.changed);
    if (value.entryIfChanged !== undefined)
        result.entryIfChanged = decodeJson_1(value.entryIfChanged);
    return result;
}
function encodeBinary(value) {
    const result = [];
    if (value.changed !== undefined) {
        const tsValue = value.changed;
        result.push([1, tsValueToWireValueFns.bool(tsValue)]);
    }
    if (value.entryIfChanged !== undefined) {
        const tsValue = value.entryIfChanged;
        result.push([2, { type: WireType.LengthDelimited, value: encodeBinary_1(tsValue) }]);
    }
    return serialize(result);
}
function decodeBinary(binary) {
    const result = getDefaultValue();
    const wireMessage = (0,deserialize/* default */.A)(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wire_scalar/* wireValueToTsValueFns */.Vz.bool(wireValue);
        if (value === undefined)
            break field;
        result.changed = value;
    }
    field: {
        const wireValue = wireFields.get(2);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === wire/* WireType */.O.LengthDelimited ? (0,KvEntry/* decodeBinary */.AQ)(wireValue.value) : undefined;
        if (value === undefined)
            break field;
        result.entryIfChanged = value;
    }
    return result;
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/Long.js
var runtime_Long = __webpack_require__(1055);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/WatchOutput.js
// @ts-nocheck







function WatchOutput_getDefaultValue() {
    return {
        status: "SR_UNSPECIFIED",
        keys: [],
    };
}
function WatchOutput_createValue(partialValue) {
    return {
        ...WatchOutput_getDefaultValue(),
        ...partialValue,
    };
}
function WatchOutput_encodeJson(value) {
    const result = {};
    if (value.status !== undefined)
        result.status = tsValueToJsonValueFns.enum(value.status);
    result.keys = value.keys.map(value => encodeJson_1(value));
    return result;
}
function WatchOutput_decodeJson(value) {
    const result = WatchOutput_getDefaultValue();
    if (value.status !== undefined)
        result.status = jsonValueToTsValueFns.enum(value.status);
    result.keys = value.keys?.map((value) => decodeJson_1(value)) ?? [];
    return result;
}
function WatchOutput_encodeBinary(value) {
    const result = [];
    if (value.status !== undefined) {
        const tsValue = value.status;
        result.push([1, { type: WireType.Varint, value: new Long(name2num[tsValue]) }]);
    }
    for (const tsValue of value.keys) {
        result.push([2, { type: WireType.LengthDelimited, value: encodeBinary_1(tsValue) }]);
    }
    return serialize(result);
}
function WatchOutput_decodeBinary(binary) {
    const result = WatchOutput_getDefaultValue();
    const wireMessage = (0,deserialize/* default */.A)(binary);
    const wireFields = new Map(wireMessage);
    field: {
        const wireValue = wireFields.get(1);
        if (wireValue === undefined)
            break field;
        const value = wireValue.type === wire/* WireType */.O.Varint ? SnapshotReadStatus/* num2name */.G[wireValue.value[0]] : undefined;
        if (value === undefined)
            break field;
        result.status = value;
    }
    collection: {
        const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 2).map(([, wireValue]) => wireValue);
        const value = wireValues.map((wireValue) => wireValue.type === wire/* WireType */.O.LengthDelimited ? decodeBinary(wireValue.value) : undefined).filter(x => x !== undefined);
        if (!value.length)
            break collection;
        result.keys = value;
    }
    return result;
}


/***/ }),

/***/ 1055:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ay: () => (/* binding */ Long)
/* harmony export */ });
/* unused harmony exports UINT16_MAX, UINT32_MAX, add, sub, mul, divByTen, compare */
const UINT16_MAX = 0xFFFF;
const UINT32_MAX = 0xFFFFFFFF;
class Long extends Uint32Array {
    constructor(lo = 0, hi = 0) {
        super([lo, hi]);
    }
    toString(signed = true) {
        const [lo, hi] = this;
        if (lo === 0 && hi === 0)
            return "0";
        if (signed && (hi > 0x7FFFFFFF)) {
            return "-" + add(negate(this), one).toString(false);
        }
        const result = [];
        let tmp = new Long(lo, hi);
        while (compare(tmp, zero)) {
            const [next, remainder] = divByTen(tmp);
            result.push(remainder);
            tmp = next;
        }
        return result.reverse().join("");
    }
    static parse(text) {
        const parsedValue = parseInt(text, 10);
        const sign = parsedValue < 0;
        if (Number.isNaN(parsedValue))
            return new Long(0);
        if (text.length < 10) {
            if (parsedValue < 0)
                return add(negate(new Long(-parsedValue)), one);
            return new Long(parsedValue);
        }
        let result = new Long();
        let powerTen = one;
        for (const digit of text.split("").reverse()) {
            if (parseInt(digit)) {
                result = add(result, mul(new Long(parseInt(digit)), powerTen));
            }
            powerTen = mul(powerTen, new Long(10));
        }
        if (!sign)
            return result;
        return add(negate(result), one);
    }
}
const zero = new Long(0);
const one = new Long(1);
function makeChunk(value) {
    const [lo, hi] = value;
    return [lo & UINT16_MAX, lo >>> 16, hi & UINT16_MAX, hi >>> 16];
}
function add(a, b) {
    const [a00, a16, a32, a48] = makeChunk(a);
    const [b00, b16, b32, b48] = makeChunk(b);
    let c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= UINT16_MAX;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= UINT16_MAX;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= UINT16_MAX;
    c48 += a48 + b48;
    c48 &= UINT16_MAX;
    return new Long(c16 << 16 | c00, c48 << 16 | c32);
}
function sub(a, b) {
    return add(a, add(negate(b), one));
}
function mul(a, b) {
    const [a00, a16, a32, a48] = makeChunk(a);
    const [b00, b16, b32, b48] = makeChunk(b);
    let c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= UINT16_MAX;
    c16 += a00 * b16 + a16 * b00;
    c32 += c16 >>> 16;
    c16 &= UINT16_MAX;
    c32 += a00 * b32 + a32 * b00 + a16 * b16;
    c48 += c32 >>> 16;
    c32 &= UINT16_MAX;
    c48 += a00 * b48 + a16 * b32 + a32 * b16 + a48 * b00;
    c48 &= UINT16_MAX;
    return new Long(c16 << 16 | c00, c48 << 16 | c32);
}
function divByTen(value) {
    const [lo, hi] = value;
    return [
        new Long((((hi % 10) * (UINT32_MAX + 1) + lo) / 10) | 0, (hi / 10) | 0),
        ((hi % 10) * (UINT32_MAX + 1) + lo) % 10,
    ];
}
function compare(a, b) {
    const [l1, h1] = a;
    const [l2, h2] = b;
    if (h1 !== h2)
        return h1 - h2;
    return l1 - l2;
}
function negate(value) {
    const [lo, hi] = value;
    return new Long(~lo, ~hi);
}


/***/ }),

/***/ 8762:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v6: () => (/* binding */ defer)
/* harmony export */ });
/* unused harmony exports createSubscribeFn, subscribeFnToAsyncGenerator */

function defer() {
    const transit = {};
    const result = new Promise((resolve, reject) => Object.assign(transit, { resolve, reject }));
    return Object.assign(result, transit);
}
function createSubscribeFn(next, wait = Promise.resolve()) {
    const observers = [];
    (async () => {
        try {
            await wait;
            while (observers.length) {
                const [value, done] = await next();
                for (const observer of observers)
                    observer.next(value);
                if (done)
                    break;
            }
        }
        catch (err) {
            for (const observer of observers)
                observer.error(err);
        }
        finally {
            for (const observer of observers)
                observer.complete();
        }
    })();
    return (observer) => {
        observers.push(observer);
        return () => {
            observer.complete();
            removeItem(observers, observer);
        };
    };
}
async function* subscribeFnToAsyncGenerator(subscribe) {
    let finished = false;
    let deferred = defer();
    const observer = {
        next(value) {
            const result = deferred;
            deferred = defer();
            result.resolve(value);
        },
        error(exception) {
            const result = deferred;
            deferred = defer();
            result.reject(exception);
        },
        complete() {
            finished = true;
            deferred.resolve(null);
        },
    };
    const unsubscribe = subscribe(observer);
    try {
        while (true) {
            const value = await deferred;
            if (finished)
                break;
            yield value;
        }
    }
    finally {
        unsubscribe();
    }
}


/***/ }),

/***/ 7034:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ decode),
/* harmony export */   l: () => (/* binding */ encode)
/* harmony export */ });
// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
const base64abc = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/",
];
/**
 * CREDIT: https://gist.github.com/enepomnyaschih/72c423f727d395eeaa09697058238727
 * Encodes a given Uint8Array, ArrayBuffer or string into RFC4648 base64 representation
 * @param data
 */
function encode(data) {
    const uint8 = typeof data === "string"
        ? new TextEncoder().encode(data)
        : data instanceof Uint8Array
            ? data
            : new Uint8Array(data);
    let result = "", i;
    const l = uint8.length;
    for (i = 2; i < l; i += 3) {
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4)];
        result += base64abc[((uint8[i - 1] & 0x0f) << 2) | (uint8[i] >> 6)];
        result += base64abc[uint8[i] & 0x3f];
    }
    if (i === l + 1) {
        // 1 octet yet to write
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4];
        result += "==";
    }
    if (i === l) {
        // 2 octets yet to write
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4)];
        result += base64abc[(uint8[i - 1] & 0x0f) << 2];
        result += "=";
    }
    return result;
}
/**
 * Decodes a given RFC4648 base64 encoded string
 * @param b64
 */
function decode(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
}


/***/ }),

/***/ 3422:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   u: () => (/* binding */ tsValueToJsonValueFns)
/* harmony export */ });
/* unused harmony export jsonValueToTsValueFns */
/* harmony import */ var _base64_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7034);

const tsValueToJsonValueFns = {
    int32: (tsValue) => tsValue,
    int64: (tsValue) => tsValue,
    uint32: (tsValue) => tsValue,
    uint64: (tsValue) => tsValue,
    sint32: (tsValue) => tsValue,
    sint64: (tsValue) => tsValue,
    bool: (tsValue) => tsValue,
    double: (tsValue) => tsValue,
    float: (tsValue) => tsValue,
    fixed32: (tsValue) => tsValue,
    fixed64: (tsValue) => tsValue,
    sfixed32: (tsValue) => tsValue,
    sfixed64: (tsValue) => tsValue,
    string: (tsValue) => tsValue,
    bytes: (tsValue) => (0,_base64_js__WEBPACK_IMPORTED_MODULE_0__/* .encode */ .l)(tsValue),
    enum: (tsValue) => tsValue,
};
const jsonValueToTsValueFns = {
    int32: (tsValue) => tsValue,
    int64: (tsValue) => tsValue,
    uint32: (tsValue) => tsValue,
    uint64: (tsValue) => tsValue,
    sint32: (tsValue) => tsValue,
    sint64: (tsValue) => tsValue,
    bool: (tsValue) => tsValue,
    double: (tsValue) => tsValue,
    float: (tsValue) => tsValue,
    fixed32: (tsValue) => tsValue,
    fixed64: (tsValue) => tsValue,
    sfixed32: (tsValue) => tsValue,
    sfixed64: (tsValue) => tsValue,
    string: (tsValue) => tsValue,
    bytes: (tsValue) => (0,_base64_js__WEBPACK_IMPORTED_MODULE_0__/* .decode */ .D)(tsValue),
    enum: (tsValue) => tsValue,
};


/***/ }),

/***/ 6448:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (/* binding */ deserialize)
/* harmony export */ });
/* harmony import */ var _Long_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1055);
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8047);
/* harmony import */ var _varint_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1233);



function deserialize(uint8array) {
    let idx = 0;
    const offset = uint8array.byteOffset;
    const result = [];
    const dataview = new DataView(uint8array.buffer, offset);
    while (idx < uint8array.length) {
        const decodeResult = (0,_varint_js__WEBPACK_IMPORTED_MODULE_2__/* .decode */ .D)(new DataView(uint8array.buffer, offset + idx));
        const key = decodeResult[1][0];
        idx += decodeResult[0];
        const type = (key & 0b111);
        const fieldNumber = key >>> 3;
        switch (type) {
            default:
                throw new Error(`Unknown wire type ${type}`);
            case _index_js__WEBPACK_IMPORTED_MODULE_1__/* .WireType */ .O.Varint: {
                const [len, value] = (0,_varint_js__WEBPACK_IMPORTED_MODULE_2__/* .decode */ .D)(new DataView(uint8array.buffer, offset + idx));
                result.push([fieldNumber, { type, value }]);
                idx += len;
                break;
            }
            case _index_js__WEBPACK_IMPORTED_MODULE_1__/* .WireType */ .O.Fixed64:
                const lo = dataview.getUint32(idx, true);
                const hi = dataview.getUint32(idx += 4, true);
                idx += 4;
                result.push([fieldNumber, {
                        type,
                        value: new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(lo, hi),
                    }]);
                break;
            case _index_js__WEBPACK_IMPORTED_MODULE_1__/* .WireType */ .O.LengthDelimited: {
                const [len, value] = (0,_varint_js__WEBPACK_IMPORTED_MODULE_2__/* .decode */ .D)(new DataView(uint8array.buffer, offset + idx));
                result.push([fieldNumber, {
                        type,
                        value: uint8array.subarray(idx += len, idx += value[0]),
                    }]);
                break;
            }
            case _index_js__WEBPACK_IMPORTED_MODULE_1__/* .WireType */ .O.StartGroup:
            case _index_js__WEBPACK_IMPORTED_MODULE_1__/* .WireType */ .O.EndGroup:
                result.push([fieldNumber, { type }]);
                break;
            case _index_js__WEBPACK_IMPORTED_MODULE_1__/* .WireType */ .O.Fixed32:
                result.push([fieldNumber, {
                        type,
                        value: dataview.getUint32(idx, true),
                    }]);
                idx += 4;
                break;
        }
    }
    return result;
}


/***/ }),

/***/ 8047:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   O: () => (/* binding */ WireType)
/* harmony export */ });
var WireType;
(function (WireType) {
    WireType[WireType["Varint"] = 0] = "Varint";
    WireType[WireType["Fixed64"] = 1] = "Fixed64";
    WireType[WireType["LengthDelimited"] = 2] = "LengthDelimited";
    WireType[WireType["StartGroup"] = 3] = "StartGroup";
    WireType[WireType["EndGroup"] = 4] = "EndGroup";
    WireType[WireType["Fixed32"] = 5] = "Fixed32";
})(WireType || (WireType = {}));


/***/ }),

/***/ 4576:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  td: () => (/* binding */ tsValueToWireValueFns),
  uQ: () => (/* binding */ unpackFns),
  Vz: () => (/* binding */ wireValueToTsValueFns)
});

// UNUSED EXPORTS: packFns

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/Long.js
var Long = __webpack_require__(1055);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/varint.js
var varint = __webpack_require__(1233);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/zigzag.js

function encode(value) {
    if (value instanceof Long/* default */.Ay) {
        const l = new Long/* default */.Ay(value[0] << 1, (value[1] << 1) | (value[0] >>> 31));
        const r = value[1] >>> 31 ? new Long/* default */.Ay(0xFFFFFFFF, 0xFFFFFFFF) : new Long/* default */.Ay();
        return new Long/* default */.Ay(l[0] ^ r[0], l[1] ^ r[1]);
    }
    return ((value * 2) ^ (value >> 31)) >>> 0;
}
function decode(value) {
    if (value instanceof Long/* default */.Ay) {
        const l = new Long/* default */.Ay((value[0] >>> 1) | (value[1] << 31), (value[1]) >>> 1);
        const r = value[0] & 1 ? new Long/* default */.Ay(0xFFFFFFFF, 0xFFFFFFFF) : new Long/* default */.Ay();
        return new Long/* default */.Ay(l[0] ^ r[0], l[1] ^ r[1]);
    }
    return ((value >>> 1) ^ -(value & 1));
}

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/serialize.js
var serialize = __webpack_require__(8429);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/index.js
var wire = __webpack_require__(8047);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/proto/runtime/wire/scalar.js





const decodeVarintFns = {
    int32: (long) => long[0] | 0,
    int64: (long) => long.toString(true),
    uint32: (long) => long[0] >>> 0,
    uint64: (long) => long.toString(false),
    sint32: (long) => decode(long[0]),
    sint64: (long) => decode(long).toString(true),
    bool: (long) => long[0] !== 0,
};
const encodeVarintFns = {
    int32: (tsValue) => new Long/* default */.Ay(tsValue),
    int64: (tsValue) => Long/* default */.Ay.parse(tsValue),
    uint32: (tsValue) => new Long/* default */.Ay(tsValue),
    uint64: (tsValue) => Long/* default */.Ay.parse(tsValue),
    sint32: (tsValue) => encode(new Long/* default */.Ay(tsValue)),
    sint64: (tsValue) => encode(Long/* default */.Ay.parse(tsValue)),
    bool: (tsValue) => new Long/* default */.Ay(+tsValue),
};
const varintFieldToTsValueFns = Object.fromEntries(Object.entries(decodeVarintFns).map(([type, fn]) => [
    type,
    (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Varint)
            return;
        return fn(wireValue.value);
    },
]));
const tsValueToVarintFieldFns = Object.fromEntries(Object.entries(encodeVarintFns).map(([type, fn]) => ([
    type,
    (tsValue) => ({
        type: wire/* WireType */.O.Varint,
        value: fn(tsValue),
    }),
])));
const wireValueToTsValueFns = {
    ...varintFieldToTsValueFns,
    double: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Fixed64)
            return;
        const dataview = new DataView(wireValue.value.buffer);
        return dataview.getFloat64(0, true);
    },
    float: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Fixed32)
            return;
        const dataview = new DataView(new Uint32Array([wireValue.value]).buffer);
        return dataview.getFloat32(0, true);
    },
    fixed32: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Fixed32)
            return;
        return wireValue.value >>> 0;
    },
    fixed64: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Fixed64)
            return;
        return wireValue.value.toString(false);
    },
    sfixed32: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Fixed32)
            return;
        return wireValue.value | 0;
    },
    sfixed64: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.Fixed64)
            return;
        return wireValue.value.toString(true);
    },
    string: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
            return;
        const textDecoder = new TextDecoder();
        return textDecoder.decode(wireValue.value);
    },
    bytes: (wireValue) => {
        if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
            return;
        return wireValue.value;
    },
};
const tsValueToWireValueFns = {
    ...tsValueToVarintFieldFns,
    double: (tsValue) => {
        const long = new Long/* default */.Ay();
        const dataview = new DataView(long.buffer);
        dataview.setFloat64(0, tsValue, true);
        return { type: wire/* WireType */.O.Fixed64, value: long };
    },
    float: (tsValue) => {
        const u32 = new Uint32Array(1);
        const dataview = new DataView(u32.buffer);
        dataview.setFloat32(0, tsValue, true);
        return { type: wire/* WireType */.O.Fixed32, value: dataview.getUint32(0, true) };
    },
    fixed32: (tsValue) => ({ type: wire/* WireType */.O.Fixed32, value: tsValue >>> 0 }),
    fixed64: (tsValue) => ({
        type: wire/* WireType */.O.Fixed64,
        value: Long/* default */.Ay.parse(tsValue),
    }),
    sfixed32: (tsValue) => ({ type: wire/* WireType */.O.Fixed32, value: tsValue | 0 }),
    sfixed64: (tsValue) => ({
        type: wire/* WireType */.O.Fixed64,
        value: Long/* default */.Ay.parse(tsValue),
    }),
    string: (tsValue) => {
        const textEncoder = new TextEncoder();
        return {
            type: wire/* WireType */.O.LengthDelimited,
            value: textEncoder.encode(tsValue),
        };
    },
    bytes: (tsValue) => ({ type: wire/* WireType */.O.LengthDelimited, value: tsValue }),
};
const unpackVarintFns = Object.fromEntries(Object.keys(decodeVarintFns).map((type) => [
    type,
    function* (wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns[type](wireValue);
            if (value != null)
                yield value;
            else {
                for (const long of unpackVarint(wireValue)) {
                    yield decodeVarintFns[type](long);
                }
            }
        }
    },
]));
const unpackFns = {
    ...unpackVarintFns,
    *double(wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns.double(wireValue);
            if (value != null)
                yield value;
            else
                yield* unpackDouble(wireValue);
        }
    },
    *float(wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns.float(wireValue);
            if (value != null)
                yield value;
            else
                yield* unpackFloat(wireValue);
        }
    },
    *fixed32(wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns.fixed32(wireValue);
            if (value != null)
                yield value;
            else
                for (const value of unpackFixed32(wireValue))
                    yield value >>> 0;
        }
    },
    *fixed64(wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns.fixed64(wireValue);
            if (value != null)
                yield value;
            else {
                for (const value of unpackFixed64(wireValue)) {
                    yield value.toString(false);
                }
            }
        }
    },
    *sfixed32(wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns.sfixed32(wireValue);
            if (value != null)
                yield value;
            else
                for (const value of unpackFixed32(wireValue))
                    yield value | 0;
        }
    },
    *sfixed64(wireValues) {
        for (const wireValue of wireValues) {
            const value = wireValueToTsValueFns.sfixed64(wireValue);
            if (value != null)
                yield value;
            else {
                for (const value of unpackFixed64(wireValue)) {
                    yield value.toString(true);
                }
            }
        }
    },
};
const packVarintFns = Object.fromEntries(Object.keys(encodeVarintFns).map((type) => [
    type,
    function (tsValues) {
        return {
            type: wire/* WireType */.O.LengthDelimited,
            value: (0,serialize/* concat */.x)(tsValues.map((tsValue) => {
                const value = encodeVarintFns[type](tsValue);
                return (0,varint/* encode */.l)(value);
            })),
        };
    },
]));
function getFixedPackFn(size, setFn) {
    return function pack(values) {
        const value = new Uint8Array(values.length * size);
        const dataview = new DataView(value.buffer);
        for (let i = 0; i < values.length; ++i) {
            setFn(dataview, i * size, values[i]);
        }
        return { type: wire/* WireType */.O.LengthDelimited, value };
    };
}
const packFns = {
    ...packVarintFns,
    double: getFixedPackFn(8, (dataView, byteOffset, value) => {
        dataView.setFloat64(byteOffset, value, true);
    }),
    float: getFixedPackFn(4, (dataView, byteOffset, value) => {
        dataView.setFloat32(byteOffset, value, true);
    }),
    fixed32: getFixedPackFn(4, (dataView, byteOffset, value) => {
        dataView.setUint32(byteOffset, value, true);
    }),
    fixed64: getFixedPackFn(8, (dataView, byteOffset, value) => {
        const long = Long/* default */.Ay.parse(value);
        dataView.setUint32(byteOffset, long[0], true);
        dataView.setUint32(byteOffset + 4, long[1], true);
    }),
    sfixed32: getFixedPackFn(4, (dataView, byteOffset, value) => {
        dataView.setInt32(byteOffset, value, true);
    }),
    sfixed64: getFixedPackFn(8, (dataView, byteOffset, value) => {
        const long = Long/* default */.Ay.parse(value);
        dataView.setUint32(byteOffset, long[0], true);
        dataView.setUint32(byteOffset + 4, long[1], true);
    }),
};
function* unpackDouble(wireValue) {
    if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
        return;
    const { value } = wireValue;
    let idx = 0;
    const dataview = new DataView(value.buffer, value.byteOffset);
    while (idx < value.length) {
        const double = dataview.getFloat64(idx, true);
        idx += 4;
        yield double;
    }
}
function* unpackFloat(wireValue) {
    if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
        return;
    const { value } = wireValue;
    let idx = 0;
    const dataview = new DataView(value.buffer, value.byteOffset);
    while (idx < value.length) {
        const float = dataview.getFloat32(idx, true);
        idx += 4;
        yield float;
    }
}
function* unpackVarint(wireValue) {
    if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
        return;
    const { value } = wireValue;
    let idx = 0;
    const offset = value.byteOffset;
    while (idx < value.length) {
        const decodeResult = (0,varint/* decode */.D)(new DataView(value.buffer, offset + idx));
        idx += decodeResult[0];
        yield decodeResult[1];
    }
}
function* unpackFixed32(wireValue) {
    if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
        return;
    const { value } = wireValue;
    let idx = 0;
    const dataview = new DataView(value.buffer, value.byteOffset);
    while (idx < value.length) {
        const fixed32 = dataview.getUint32(idx, true);
        idx += 4;
        yield fixed32;
    }
}
function* unpackFixed64(wireValue) {
    if (wireValue.type !== wire/* WireType */.O.LengthDelimited)
        return;
    const { value } = wireValue;
    let idx = 0;
    const dataview = new DataView(value.buffer, value.byteOffset);
    while (idx < value.length) {
        const lo = dataview.getUint32(idx, true);
        idx += 4;
        const hi = dataview.getUint32(idx, true);
        idx += 4;
        yield new Long/* default */.Ay(lo, hi);
    }
}


/***/ }),

/***/ 8429:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (/* binding */ serialize),
/* harmony export */   x: () => (/* binding */ concat)
/* harmony export */ });
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8047);
/* harmony import */ var _varint_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1233);


function serialize(wireMessage) {
    const result = [];
    wireMessage.forEach(([fieldNumber, field]) => {
        result.push((0,_varint_js__WEBPACK_IMPORTED_MODULE_1__/* .encode */ .l)((fieldNumber << 3) | field.type));
        switch (field.type) {
            case _index_js__WEBPACK_IMPORTED_MODULE_0__/* .WireType */ .O.Varint:
                result.push((0,_varint_js__WEBPACK_IMPORTED_MODULE_1__/* .encode */ .l)(field.value));
                break;
            case _index_js__WEBPACK_IMPORTED_MODULE_0__/* .WireType */ .O.Fixed64: {
                const arr = new Uint8Array(8);
                const dataview = new DataView(arr.buffer);
                dataview.setUint32(0, field.value[0], true);
                dataview.setUint32(4, field.value[1], true);
                result.push(arr);
                break;
            }
            case _index_js__WEBPACK_IMPORTED_MODULE_0__/* .WireType */ .O.LengthDelimited:
                result.push((0,_varint_js__WEBPACK_IMPORTED_MODULE_1__/* .encode */ .l)(field.value.byteLength));
                result.push(field.value);
                break;
            case _index_js__WEBPACK_IMPORTED_MODULE_0__/* .WireType */ .O.Fixed32: {
                const arr = new Uint8Array(4);
                const dataview = new DataView(arr.buffer);
                dataview.setUint32(0, field.value, true);
                result.push(arr);
                break;
            }
        }
    });
    return concat(result);
}
function concat(arrays) {
    const totalLength = arrays.reduce((acc, value) => {
        return acc + value.byteLength;
    }, 0);
    const result = new Uint8Array(totalLength);
    arrays.reduce((acc, array) => {
        result.set(array, acc);
        return acc + array.byteLength;
    }, 0);
    return result;
}


/***/ }),

/***/ 1233:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ decode),
/* harmony export */   l: () => (/* binding */ encode)
/* harmony export */ });
/* harmony import */ var _Long_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1055);

function encode(value) {
    const result = [];
    const mask = 0b1111111;
    const head = 1 << 7;
    let long = typeof value === "number" ? new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(value) : value;
    while (long[0] || long[1]) {
        const [lo, hi] = long;
        const chunk = lo & mask;
        const nextHi = hi >>> 7;
        const nextLo = (lo >>> 7) | ((hi & mask) << (32 - 7));
        long = new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(nextLo, nextHi);
        const resultChunk = !(long[0] || long[1]) ? chunk : chunk | head;
        result.push(resultChunk);
    }
    if (result.length < 1)
        return new Uint8Array(1);
    return Uint8Array.from(result);
}
function decode(dataview) {
    let result = new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(0);
    let i = 0;
    while (true) {
        const curr = dataview.getUint8(i);
        result = or(result, leftshift(new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(curr & 0b1111111), i * 7));
        ++i;
        if (curr >>> 7)
            continue;
        return [i, result];
    }
}
function or(a, b) {
    return new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(a[0] | b[0], a[1] | b[1]);
}
function leftshift(a, count) {
    if (count === 0)
        return a;
    if (count >= 32)
        return new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(0, a[0] << (count - 32));
    return new _Long_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay(a[0] << count, (a[1] << count) | (a[0] >>> (32 - count)));
}


/***/ }),

/***/ 2073:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Y2: () => (/* binding */ WatchCache),
/* harmony export */   lY: () => (/* binding */ ProtoBasedKv)
/* harmony export */ });
/* harmony import */ var _bytes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6528);
/* harmony import */ var _kv_key_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1118);
/* harmony import */ var _kv_util_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6765);
/* harmony import */ var _v8_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(33);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.




class ProtoBasedKv extends _kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .BaseKv */ .JM {
    constructor(debug, decodeV8, encodeV8) {
        super({ debug });
        Object.defineProperty(this, "decodeV8", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "encodeV8", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.decodeV8 = decodeV8;
        this.encodeV8 = encodeV8;
    }
    async get_(key, consistency) {
        const { decodeV8 } = this;
        const packedKey = (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(key);
        const req = {
            ranges: [computeReadRangeForKey(packedKey)],
        };
        const res = await this.snapshotRead(req, consistency);
        for (const range of res.ranges) {
            for (const item of range.values) {
                if ((0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .equalBytes */ .ex)(item.key, packedKey)) {
                    return {
                        key,
                        value: (0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .readValue */ .wK)(item.value, item.encoding, decodeV8),
                        versionstamp: (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(item.versionstamp),
                    };
                }
            }
        }
        return { key, value: null, versionstamp: null };
    }
    async getMany_(keys, consistency) {
        const { decodeV8 } = this;
        const packedKeys = keys.map(_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7);
        const packedKeysHex = packedKeys.map(_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU);
        const req = {
            ranges: packedKeys.map(computeReadRangeForKey),
        };
        const res = await this.snapshotRead(req, consistency);
        const rowMap = new Map();
        for (const range of res.ranges) {
            for (const { key, value, encoding, versionstamp } of range.values) {
                rowMap.set((0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(key), {
                    key: (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .unpackKey */ .mZ)(key),
                    value: (0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .readValue */ .wK)(value, encoding, decodeV8),
                    versionstamp: (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(versionstamp),
                });
            }
        }
        return keys.map((key, i) => {
            const row = rowMap.get(packedKeysHex[i]);
            return row
                ? { key, value: row.value, versionstamp: row.versionstamp }
                : { key, value: null, versionstamp: null };
        });
    }
    async commit(checks, mutations, enqueues) {
        const write = {
            checks: checks.map(computeKvCheckMessage),
            mutations: mutations.map((v) => computeKvMutationMessage(v, this.encodeV8)),
            enqueues: enqueues.map(({ value, opts }) => computeEnqueueMessage(value, this.encodeV8, opts)),
        };
        const { status, versionstamp } = await this.atomicWrite(write);
        if (status === "AW_CHECK_FAILURE")
            return { ok: false };
        if (status !== "AW_SUCCESS") {
            throw new Error(`commit failed with status: ${status}`);
        }
        return { ok: true, versionstamp: (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(versionstamp) };
    }
    async *listStream(outCursor, selector, { batchSize, consistency, cursor: cursorOpt, limit, reverse = false } = {}) {
        const { decodeV8 } = this;
        let yielded = 0;
        if (typeof limit === "number" && yielded >= limit)
            return;
        const cursor = typeof cursorOpt === "string"
            ? (0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .unpackCursor */ .$9)(cursorOpt)
            : undefined;
        let lastYieldedKeyBytes = cursor?.lastYieldedKeyBytes;
        let pass = 0;
        const prefixBytes = "prefix" in selector
            ? (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(selector.prefix)
            : undefined;
        while (true) {
            pass++;
            // console.log({ pass });
            const req = { ranges: [] };
            let start;
            let end;
            if ("prefix" in selector) {
                start = "start" in selector ? (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(selector.start) : prefixBytes;
                end = "end" in selector
                    ? (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(selector.end)
                    : new Uint8Array([...prefixBytes, 0xff]);
            }
            else {
                start = (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(selector.start);
                end = (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(selector.end);
            }
            if (reverse) {
                end = lastYieldedKeyBytes ?? end;
            }
            else {
                start = lastYieldedKeyBytes ?? start;
            }
            if (start === undefined || end === undefined)
                throw new Error();
            const batchLimit = Math.min(batchSize ?? 100, 500, limit ?? Number.MAX_SAFE_INTEGER) +
                (lastYieldedKeyBytes ? 1 : 0);
            req.ranges.push({ start, end, limit: batchLimit, reverse });
            const res = await this.snapshotRead(req, consistency);
            let entries = 0;
            for (const range of res.ranges) {
                for (const entry of range.values) {
                    if (entries++ === 0 &&
                        (lastYieldedKeyBytes &&
                            (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .equalBytes */ .ex)(lastYieldedKeyBytes, entry.key) ||
                            prefixBytes && (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .equalBytes */ .ex)(prefixBytes, entry.key)))
                        continue;
                    const key = (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .unpackKey */ .mZ)(entry.key);
                    const value = (0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .readValue */ .wK)(entry.value, entry.encoding, decodeV8);
                    const versionstamp = (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(entry.versionstamp);
                    lastYieldedKeyBytes = entry.key;
                    outCursor.set((0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .packCursor */ .mF)({ lastYieldedKeyBytes })); // cursor needs to be set before yield
                    yield { key, value, versionstamp };
                    yielded++;
                    // console.log({ yielded, entries, limit });
                    if (typeof limit === "number" && yielded >= limit)
                        return;
                }
            }
            if (entries < batchLimit)
                return;
        }
    }
}
class WatchCache {
    constructor(decodeV8, keys) {
        Object.defineProperty(this, "decodeV8", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "keys", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "lastValues", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.decodeV8 = decodeV8;
        this.keys = keys;
    }
    processOutputKeys(outputKeys) {
        const { lastValues, decodeV8, keys } = this;
        const initial = lastValues.length === 0;
        outputKeys.forEach((v, i) => {
            const { changed, entryIfChanged } = v;
            if (initial && !changed) {
                throw new Error(`watch: Expect all values in first message: ${JSON.stringify(outputKeys)}`);
            }
            if (!changed)
                return;
            if (entryIfChanged) {
                const { value: bytes, encoding } = entryIfChanged;
                const value = (0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .readValue */ .wK)(bytes, encoding, decodeV8);
                const versionstamp = (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .encodeHex */ .mU)(entryIfChanged.versionstamp);
                lastValues[i] = [value, versionstamp];
            }
            else {
                lastValues[i] = undefined; // deleted
            }
        });
        return keys.map((key, i) => {
            const lastValue = lastValues[i];
            if (lastValue === undefined) {
                return { key, value: null, versionstamp: null };
            }
            const [value, versionstamp] = lastValue;
            return { key, value, versionstamp };
        });
    }
}
function computeReadRangeForKey(packedKey) {
    return {
        start: packedKey,
        end: new Uint8Array([0xff]),
        limit: 1,
        reverse: false,
    };
}
function computeKvCheckMessage({ key, versionstamp }) {
    return {
        key: (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(key),
        versionstamp: (versionstamp === null || versionstamp === undefined)
            /* in proto3 all fields are optional, but the generated types don't
             * like it, so we have to cast it manually */
            ? undefined
            : (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .decodeHex */ .EF)(versionstamp),
    };
}
function computeKvMutationMessage(mut, encodeV8) {
    const { key, type } = mut;
    return {
        key: (0,_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7)(key),
        mutationType: type === "delete"
            ? "M_DELETE"
            : type === "max"
                ? "M_MAX"
                : type === "min"
                    ? "M_MIN"
                    : type == "set"
                        ? "M_SET"
                        : type === "sum"
                            ? "M_SUM"
                            : "M_UNSPECIFIED",
        value: mut.type === "delete" ? undefined : (0,_kv_util_js__WEBPACK_IMPORTED_MODULE_2__/* .packKvValue */ .YA)(mut.value, encodeV8),
        expireAtMs: mut.type === "set" && typeof mut.expireIn === "number"
            ? (Date.now() + mut.expireIn).toString()
            : "0",
    };
}
function computeEnqueueMessage(value, encodeV8, { delay = 0, keysIfUndelivered = [] } = {}) {
    return {
        backoffSchedule: [100, 200, 400, 800],
        deadlineMs: `${Date.now() + delay}`,
        keysIfUndelivered: keysIfUndelivered.map(_kv_key_js__WEBPACK_IMPORTED_MODULE_1__/* .packKey */ .l7),
        payload: encodeV8(value),
    };
}


/***/ }),

/***/ 4288:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  K: () => (/* binding */ makeRemoteService)
});

// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/bytes.js + 3 modules
var bytes = __webpack_require__(6528);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/check.js
var check = __webpack_require__(2423);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/kv_connect_api.js + 4 modules
var kv_connect_api = __webpack_require__(2637);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/kv_key.js
var kv_key = __webpack_require__(1118);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/AtomicWrite.js + 5 modules
var AtomicWrite = __webpack_require__(2186);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/SnapshotRead.js + 1 modules
var SnapshotRead = __webpack_require__(6111);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/Watch.js + 1 modules
var Watch = __webpack_require__(9160);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto/messages/com/deno/kv/datapath/WatchOutput.js + 1 modules
var WatchOutput = __webpack_require__(4635);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/proto_based.js
var proto_based = __webpack_require__(2073);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/sleep.js
var sleep = __webpack_require__(5384);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/unraw_watch_stream.js
var unraw_watch_stream = __webpack_require__(4503);
// EXTERNAL MODULE: ./node_modules/@deno/kv/esm/v8.js
var v8 = __webpack_require__(33);
;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/deps/deno.land/std@0.208.0/async/_util.js
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
function _exponentialBackoffWithJitter(cap, base, attempt, multiplier, jitter) {
    const exp = Math.min(cap, base * multiplier ** attempt);
    return (1 - jitter * Math.random()) * exp;
}

;// CONCATENATED MODULE: ./node_modules/@deno/kv/esm/remote.js
// Copyright 2023 the Deno authors. All rights reserved. MIT license.













/**
 * Return a new KvService that can be used to open a remote KV database.
 */
function makeRemoteService(opts) {
    return {
        openKv: async (url) => await RemoteKv.of(url, opts),
    };
}
//
function resolveEndpointUrl(url, responseUrl) {
    const u = new URL(url, responseUrl);
    const str = u.toString();
    return u.pathname === "/" ? str.substring(0, str.length - 1) : str;
}
async function fetchNewDatabaseMetadata(url, accessToken, debug, fetcher, maxRetries, supportedVersions) {
    if (debug)
        console.log(`fetchNewDatabaseMetadata: Fetching ${url}...`);
    const { metadata, responseUrl } = await (0,kv_connect_api/* fetchDatabaseMetadata */.Lo)(url, accessToken, fetcher, maxRetries, supportedVersions);
    const { version, endpoints, token } = metadata;
    if (version !== 1 && version !== 2 && version !== 3 ||
        !supportedVersions.includes(version))
        throw new Error(`Unsupported version: ${version}`);
    if (debug) {
        console.log(`fetchNewDatabaseMetadata: Using protocol version ${version}`);
    }
    if (typeof token !== "string" || token === "") {
        throw new Error(`Unsupported token: ${token}`);
    }
    if (endpoints.length === 0)
        throw new Error(`No endpoints`);
    const expiresMillis = computeExpiresInMillis(metadata);
    if (debug) {
        console.log(`fetchNewDatabaseMetadata: Expires in ${Math.round(expiresMillis / 1000 / 60)} minutes`); // expect 60 minutes
    }
    const responseEndpoints = endpoints.map(({ url, consistency }) => ({
        url: resolveEndpointUrl(url, responseUrl),
        consistency,
    })); // metadata url might have been redirected
    if (debug) {
        responseEndpoints.forEach(({ url, consistency }) => console.log(`fetchNewDatabaseMetadata: ${url} (${consistency})`));
    }
    return { ...metadata, endpoints: responseEndpoints };
}
function computeExpiresInMillis({ expiresAt }) {
    const expiresTime = new Date(expiresAt).getTime();
    return expiresTime - Date.now();
}
function isValidHttpUrl(url) {
    try {
        const { protocol } = new URL(url);
        return protocol === "http:" || protocol === "https:";
    }
    catch {
        return false;
    }
}
function snapshotReadToString(req) {
    return JSON.stringify((0,SnapshotRead/* encodeJson */.Pr)(req));
}
function atomicWriteToString(req) {
    return JSON.stringify((0,AtomicWrite/* encodeJson */.Pr)(req));
}
function watchToString(req) {
    return JSON.stringify((0,Watch/* encodeJson */.Pr)(req));
}
//
class RemoteKv extends proto_based/* ProtoBasedKv */.lY {
    constructor(url, accessToken, debug, encodeV8, decodeV8, fetcher, maxRetries, supportedVersions, metadata) {
        super(debug, decodeV8, encodeV8);
        Object.defineProperty(this, "url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "accessToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetcher", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxRetries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "supportedVersions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "watches", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.url = url;
        this.accessToken = accessToken;
        this.fetcher = fetcher;
        this.maxRetries = maxRetries;
        this.supportedVersions = supportedVersions;
        this.metadata = metadata;
    }
    static async of(url, opts) {
        (0,check/* checkOptionalString */.UW)("url", url);
        (0,check/* checkRecord */.EQ)("opts", opts);
        (0,check/* checkString */.Em)("opts.accessToken", opts.accessToken);
        (0,check/* checkOptionalBoolean */.pm)("opts.wrapUnknownValues", opts.wrapUnknownValues);
        (0,check/* checkOptionalBoolean */.pm)("opts.debug", opts.debug);
        (0,check/* checkOptionalFunction */.vS)("opts.fetcher", opts.fetcher);
        (0,check/* checkOptionalNumber */.c8)("opts.maxRetries", opts.maxRetries);
        (0,check/* check */.z6)("opts.supportedVersions", opts.supportedVersions, opts.supportedVersions === undefined ||
            Array.isArray(opts.supportedVersions) &&
                opts.supportedVersions.every((v) => typeof v === "number" && Number.isSafeInteger(v) && v > 0));
        const { accessToken, wrapUnknownValues = false, debug = false, fetcher = fetch, maxRetries = 10, supportedVersions = [1, 2, 3], } = opts;
        if (url === undefined || !isValidHttpUrl(url)) {
            throw new Error(`Bad 'path': must be an http(s) url, found ${url}`);
        }
        const metadata = await fetchNewDatabaseMetadata(url, accessToken, debug, fetcher, maxRetries, supportedVersions);
        const encodeV8 = opts.encodeV8 ?? v8/* encodeV8 */.fT;
        const decodeV8 = opts.decodeV8 ??
            ((v) => (0,v8/* decodeV8 */.Vk)(v, { wrapUnknownValues }));
        return new RemoteKv(url, accessToken, debug, encodeV8, decodeV8, fetcher, maxRetries, supportedVersions, metadata);
    }
    listenQueue_(_handler) {
        throw new Error(`'listenQueue' is not possible over KV Connect`);
    }
    watch_(keys, raw) {
        const { watches, debug } = this;
        const watchId = [...watches.keys()].reduce((a, b) => Math.max(a, b), 0) + 1;
        let readDisabled = false;
        let endOfStreamReached = false;
        let readerCancelled = false;
        let attempt = 1;
        let readStarted = -1;
        let reader;
        async function* yieldResults(kv) {
            const { metadata, fetcher, maxRetries, decodeV8 } = kv;
            if (metadata.version < 3) {
                throw new Error(`watch: Only supported in version 3 of the protocol or higher`);
            }
            const endpointUrl = await kv.locateEndpointUrl("eventual", readDisabled); // force refetch if retrying after receiving read disabled
            const watchUrl = `${endpointUrl}/watch`;
            const accessToken = metadata.token;
            const req = {
                keys: keys.map((v) => ({ key: (0,kv_key/* packKey */.l7)(v) })),
            };
            if (debug)
                console.log(`watch: ${watchToString(req)}`);
            const stream = await (0,kv_connect_api/* fetchWatchStream */.ko)(watchUrl, accessToken, metadata.databaseId, req, fetcher, maxRetries, metadata.version);
            reader = stream.getReader(); // can't use byob for node compat (fetch() response body streams are ReadableStream { locked: false, state: 'readable', supportsBYOB: false }), see https://github.com/nodejs/undici/issues/1873
            const byteReader = new bytes/* ByteReader */.kP(reader); // use our own buffered reader
            endOfStreamReached = false;
            readerCancelled = false;
            readStarted = Date.now();
            try {
                const cache = new proto_based/* WatchCache */.Y2(decodeV8, keys);
                while (true) {
                    const { done, value } = await byteReader.read(4);
                    if (done) {
                        if (debug)
                            console.log(`watch: done! returning`);
                        endOfStreamReached = true;
                        return;
                    }
                    const n = new DataView(value.buffer).getInt32(0, true);
                    if (debug)
                        console.log(`watch: ${n}-byte message`);
                    if (n > 0) {
                        const { done, value } = await byteReader.read(n);
                        if (done) {
                            if (debug)
                                console.log(`watch: done before message! returning`);
                            endOfStreamReached = true;
                            return;
                        }
                        const output = (0,WatchOutput/* decodeBinary */.AQ)(value);
                        const { status, keys: outputKeys } = output;
                        if (status === "SR_READ_DISABLED") {
                            if (!readDisabled) {
                                readDisabled = true; // retry in the next go-around
                                if (debug) {
                                    console.log(`watch: received SR_READ_DISABLED, retry after refreshing metadata`);
                                }
                                return;
                            }
                            else {
                                throw new Error(`watch: Read disabled after retry`);
                            }
                        }
                        if (status !== "SR_SUCCESS") {
                            throw new Error(`Unexpected status: ${status}`);
                        }
                        const entries = cache.processOutputKeys(outputKeys);
                        yield entries;
                    }
                }
            }
            finally {
                await reader.cancel();
                reader = undefined;
            }
        }
        async function* yieldResultsLoop(kv) {
            while (true) {
                for await (const entries of yieldResults(kv)) {
                    yield entries;
                }
                if (readDisabled) {
                    if (debug) {
                        console.log(`watch: readDisabled, retry and refresh metadata`);
                    }
                }
                else if (endOfStreamReached && !readerCancelled) {
                    const readDuration = readStarted > -1
                        ? (Date.now() - readStarted)
                        : 0;
                    if (readDuration > 60000)
                        attempt = 1; // we read for at least a minute, reset attempt counter to avoid missing updates
                    const timeout = Math.round(_exponentialBackoffWithJitter(60000, // max timeout
                    1000, // min timeout
                    attempt, 2, // multiplier
                    1));
                    if (debug) {
                        console.log(`watch: endOfStreamReached, retry after ${timeout}ms, attempt=${attempt}`);
                    }
                    await (0,sleep/* sleep */.yy)(timeout);
                    attempt++;
                }
                else {
                    if (debug)
                        console.log(`watch: end of retry loop`);
                    return;
                }
            }
        }
        // return ReadableStream.from(yieldResultsLoop(this)); // not supported by dnt/node
        const generator = yieldResultsLoop(this);
        const cancelReaderIfNecessary = async () => {
            readerCancelled = true;
            await reader?.cancel();
            reader = undefined;
        };
        watches.set(watchId, { onFinalize: cancelReaderIfNecessary });
        const rawStream = new ReadableStream({
            async pull(controller) {
                const { done, value } = await generator.next();
                if (done || value === undefined)
                    return;
                controller.enqueue(value);
            },
            async cancel() {
                await cancelReaderIfNecessary();
            },
        });
        return raw
            ? rawStream
            : (0,unraw_watch_stream/* makeUnrawWatchStream */.p)(rawStream, async () => await cancelReaderIfNecessary());
    }
    close_() {
        [...this.watches.values()].forEach((v) => v.onFinalize());
    }
    async snapshotRead(req, consistency = "strong") {
        const { url, accessToken, metadata, debug, fetcher, maxRetries, supportedVersions, } = this;
        const read = async () => {
            const endpointUrl = await this.locateEndpointUrl(consistency);
            const snapshotReadUrl = `${endpointUrl}/snapshot_read`;
            const accessToken = metadata.token;
            if (debug)
                console.log(`snapshotRead: ${snapshotReadToString(req)}`);
            return await (0,kv_connect_api/* fetchSnapshotRead */.BV)(snapshotReadUrl, accessToken, metadata.databaseId, req, fetcher, maxRetries, metadata.version);
        };
        const responseCheck = (res) => !(this.metadata.version >= 3 && res.status === "SR_READ_DISABLED" ||
            res.readDisabled ||
            consistency === "strong" && !res.readIsStronglyConsistent);
        const res = await read();
        if (!responseCheck(res)) {
            if (debug) {
                if (debug) {
                    console.log(`snapshotRead: response checks failed, refresh metadata and retry`);
                }
            }
            this.metadata = await fetchNewDatabaseMetadata(url, accessToken, debug, fetcher, maxRetries, supportedVersions);
            const res = await read();
            if (!responseCheck(res)) {
                const { readDisabled, readIsStronglyConsistent, status } = res;
                throw new Error(`snapshotRead: response checks failed after retry: ${JSON.stringify({ readDisabled, readIsStronglyConsistent, status })}`);
            }
            return res;
        }
        else {
            return res;
        }
    }
    async atomicWrite(req) {
        const { metadata, debug, fetcher, maxRetries } = this;
        const endpointUrl = await this.locateEndpointUrl("strong");
        const atomicWriteUrl = `${endpointUrl}/atomic_write`;
        const accessToken = metadata.token;
        if (debug)
            console.log(`fetchAtomicWrite: ${atomicWriteToString(req)}`);
        return await (0,kv_connect_api/* fetchAtomicWrite */.DX)(atomicWriteUrl, accessToken, metadata.databaseId, req, fetcher, maxRetries, metadata.version);
    }
    //
    async locateEndpointUrl(consistency, forceRefetch = false) {
        const { url, accessToken, debug, fetcher, maxRetries, supportedVersions } = this;
        if (forceRefetch || computeExpiresInMillis(this.metadata) < 1000 * 60 * 5) {
            this.metadata = await fetchNewDatabaseMetadata(url, accessToken, debug, fetcher, maxRetries, supportedVersions);
        }
        const { metadata } = this;
        const firstStrong = metadata.endpoints.filter((v) => v.consistency === "strong")[0];
        const firstNonStrong = metadata.endpoints.filter((v) => v.consistency !== "strong")[0];
        const endpoint = consistency === "strong"
            ? firstStrong
            : (firstNonStrong ?? firstStrong);
        if (endpoint === undefined) {
            throw new Error(`Unable to find endpoint for: ${consistency}`);
        }
        return endpoint.url; // guaranteed not to end in "/"
    }
}


/***/ }),

/***/ 5384:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   dw: () => (/* binding */ RetryableError),
/* harmony export */   qP: () => (/* binding */ executeWithRetries),
/* harmony export */   yy: () => (/* binding */ sleep)
/* harmony export */ });
// Copyright 2023 the Deno authors. All rights reserved. MIT license.
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function executeWithRetries(tag, fn, opts = {}) {
    const { maxRetries = 10, isRetryable = (e) => e instanceof RetryableError } = opts;
    let retries = 0;
    while (true) {
        try {
            if (retries > 0) {
                const waitMillis = retries * 1000;
                await sleep(waitMillis);
            }
            return await fn();
        }
        catch (e) {
            if (isRetryable(e)) {
                if (retries >= maxRetries) {
                    throw new Error(`${tag}: Out of retries (max=${maxRetries}): ${e.stack || e}`);
                }
                retries++;
            }
            else {
                throw e;
            }
        }
    }
}
class RetryableError extends Error {
    constructor(message) {
        super(message);
    }
}


/***/ }),

/***/ 4503:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   p: () => (/* binding */ makeUnrawWatchStream)
/* harmony export */ });
/* harmony import */ var _proto_runtime_async_observer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8762);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.

// take an underlying raw kv watch stream, and create a deferred stream that dedups (by key+versionstamp) based on when it's pulled
function makeUnrawWatchStream(rawWatchStream, onCancel) {
    let pulled;
    let latest;
    let signal = (0,_proto_runtime_async_observer_js__WEBPACK_IMPORTED_MODULE_0__/* .defer */ .v6)();
    let cancelled = false;
    return new ReadableStream({
        start(controller) {
            (async () => {
                const reader = rawWatchStream.getReader();
                while (true) {
                    const { done, value: entries } = await reader.read();
                    if (done)
                        break;
                    if (cancelled)
                        break;
                    latest = entries;
                    signal.resolve();
                    signal = (0,_proto_runtime_async_observer_js__WEBPACK_IMPORTED_MODULE_0__/* .defer */ .v6)();
                }
                await reader.cancel();
                signal.resolve();
                try {
                    controller.close();
                }
                catch { /* noop */ }
            })();
        },
        async pull(controller) {
            if (!latest)
                await signal;
            if (!latest)
                return;
            while (true) {
                let changed = false;
                if (pulled) {
                    for (let i = 0; i < latest.length; i++) {
                        if (latest[i].versionstamp === pulled[i].versionstamp)
                            continue;
                        changed = true;
                        break;
                    }
                }
                else {
                    pulled = latest;
                    changed = pulled.some((v) => v.versionstamp !== null);
                }
                if (changed) {
                    pulled = latest;
                    controller.enqueue(pulled);
                    return;
                }
                else {
                    await signal;
                }
            }
        },
        async cancel() {
            cancelled = true;
            await onCancel();
        },
    }, {
        highWaterMark: 0, // ensure all pulls are user-initiated
    });
}


/***/ }),

/***/ 33:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Vk: () => (/* binding */ decodeV8),
/* harmony export */   fT: () => (/* binding */ encodeV8)
/* harmony export */ });
/* unused harmony exports makeLimitedV8Serializer, UnknownV8 */
/* harmony import */ var _bytes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6528);
// Copyright 2023 the Deno authors. All rights reserved. MIT license.
// https://chromium.googlesource.com/v8/v8/+/refs/heads/main/src/objects/value-serializer.cc

/**
 * Returns encodeV8, decodeV8 functions that support V8-compatible serialization for limited set of types (strings, null, undefined, boolean).
 *
 * Consider using JSON.parse/stringify to marshall values to save when using this serializer.
 *
 * All other values will throw during encode/decode.
 */
function makeLimitedV8Serializer() {
    return { encodeV8, decodeV8 };
}
function decodeV8(bytes, { wrapUnknownValues = false } = {}) {
    if (bytes.length === 0)
        throw new Error(`decode error: empty input`);
    let pos = 0;
    const kVersion = bytes[pos++];
    if (kVersion !== SerializationTag.kVersion && wrapUnknownValues) {
        return new UnknownV8(bytes);
    }
    if (kVersion !== SerializationTag.kVersion) {
        throw new Error(`decode error: Unsupported kVersion ${kVersion} [${[...bytes].join(", ")}]`);
    }
    const version = bytes[pos++];
    if (version !== kLatestVersion) {
        throw new Error(`decode error: Unsupported version ${version}`);
    }
    const tag = bytes[pos++];
    if (tag === SerializationTag.kOneByteString) {
        const len = bytes[pos++];
        const arr = bytes.subarray(pos, pos + len);
        const rt = new TextDecoder().decode(arr);
        pos += len;
        (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
        return rt;
    }
    else if (tag === SerializationTag.kTwoByteString) {
        const len = bytes[pos++];
        const arr = bytes.subarray(pos, pos + len);
        const rt = new TextDecoder("utf-16").decode(arr);
        pos += len;
        (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
        return rt;
    }
    else if (tag === SerializationTag.kNull) {
        (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
        return null;
    }
    else if (tag === SerializationTag.kUndefined) {
        (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
        return undefined;
    }
    else if (tag === SerializationTag.kTrue) {
        (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
        return true;
    }
    else if (tag === SerializationTag.kFalse) {
        (0,_bytes_js__WEBPACK_IMPORTED_MODULE_0__/* .checkEnd */ .cF)(bytes, pos);
        return false;
    }
    else if (tag === SerializationTag.kBigInt && bytes.length === 4 && bytes[3] === 0) {
        return 0n;
    }
    else if (wrapUnknownValues) {
        return new UnknownV8(bytes);
    }
    else {
        throw new Error(`decode error: Unsupported v8 tag ${tag} ('${String.fromCharCode(tag)}') at ${pos} in [${bytes.join(", ")}]`);
    }
}
function encodeV8(value) {
    if (value instanceof UnknownV8) {
        return value.bytes;
    }
    else if (typeof value === "string") {
        const chars = [...value];
        if (chars.every(isOneByteChar)) {
            const charCodes = chars.map((v) => v.charCodeAt(0));
            return new Uint8Array([
                SerializationTag.kVersion,
                kLatestVersion,
                SerializationTag.kOneByteString,
                charCodes.length,
                ...charCodes,
            ]);
        }
        const bytes = [];
        for (let i = 0; i < value.length; i++) {
            const charCode = value.charCodeAt(i);
            const msb = (charCode & 0xff00) >> 8;
            const lsb = charCode & 0x00ff;
            bytes.push(lsb);
            bytes.push(msb);
        }
        return new Uint8Array([
            SerializationTag.kVersion,
            kLatestVersion,
            SerializationTag.kTwoByteString,
            value.length * 2,
            ...bytes,
        ]);
    }
    else if (value === null) {
        return new Uint8Array([
            SerializationTag.kVersion,
            kLatestVersion,
            SerializationTag.kNull,
        ]);
    }
    else if (value === undefined) {
        return new Uint8Array([
            SerializationTag.kVersion,
            kLatestVersion,
            SerializationTag.kUndefined,
        ]);
    }
    else if (value === true) {
        return new Uint8Array([
            SerializationTag.kVersion,
            kLatestVersion,
            SerializationTag.kTrue,
        ]);
    }
    else if (value === false) {
        return new Uint8Array([
            SerializationTag.kVersion,
            kLatestVersion,
            SerializationTag.kFalse,
        ]);
    }
    else if (value === 0n) {
        return new Uint8Array([
            SerializationTag.kVersion,
            kLatestVersion,
            SerializationTag.kBigInt,
            0,
        ]);
    }
    throw new Error(`encode error: Unsupported v8 value ${typeof value} ${value}`);
}
//
const kLatestVersion = 15;
var SerializationTag;
(function (SerializationTag) {
    SerializationTag[SerializationTag["kVersion"] = 255] = "kVersion";
    SerializationTag[SerializationTag["kOneByteString"] = '"'.charCodeAt(0)] = "kOneByteString";
    SerializationTag[SerializationTag["kTwoByteString"] = "c".charCodeAt(0)] = "kTwoByteString";
    SerializationTag[SerializationTag["kNull"] = "0".charCodeAt(0)] = "kNull";
    SerializationTag[SerializationTag["kUndefined"] = "_".charCodeAt(0)] = "kUndefined";
    SerializationTag[SerializationTag["kTrue"] = "T".charCodeAt(0)] = "kTrue";
    SerializationTag[SerializationTag["kFalse"] = "F".charCodeAt(0)] = "kFalse";
    SerializationTag[SerializationTag["kBigInt"] = "Z".charCodeAt(0)] = "kBigInt";
})(SerializationTag || (SerializationTag = {}));
function isOneByteChar(char) {
    const cp = char.codePointAt(0);
    return cp >= 0 && cp <= 0xff;
}
//
/** Raw V8-serialized bytes */
class UnknownV8 {
    constructor(bytes) {
        Object.defineProperty(this, "bytes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.bytes = bytes;
    }
}


/***/ })

};
