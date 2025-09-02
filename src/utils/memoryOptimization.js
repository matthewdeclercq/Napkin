/**
 * Memory optimization utilities
 *
 * This module provides utilities for reducing memory allocations and improving
 * performance by reusing objects, arrays, and other data structures.
 */

/**
 * Object pool for reusing objects to reduce GC pressure
 */
export class ObjectPool {
	constructor(createFn, resetFn = null, initialSize = 10) {
		this.createFn = createFn;
		this.resetFn = resetFn;
		this.pool = [];
		this.index = 0;

		// Pre-populate the pool
		for (let i = 0; i < initialSize; i++) {
			this.pool.push(this.createFn());
		}
	}

	/**
	 * Get an object from the pool
	 * @returns {*} Object from pool or newly created
	 */
	get() {
		if (this.index < this.pool.length) {
			const obj = this.pool[this.index];
			if (this.resetFn) {
				this.resetFn(obj);
			}
			this.index++;
			return obj;
		}

		// Pool exhausted, create new object
		const obj = this.createFn();
		this.pool.push(obj);
		this.index++;
		return obj;
	}

	/**
	 * Reset the pool index to reuse objects from the beginning
	 */
	reset() {
		this.index = 0;
	}

	/**
	 * Clear all objects from the pool
	 */
	clear() {
		this.pool.length = 0;
		this.index = 0;
	}
}

/**
 * Array pool for reusing arrays to reduce allocations
 */
export class ArrayPool {
	constructor(initialSize = 10) {
		this.pool = new ObjectPool(
			() => [],
			(arr) => { arr.length = 0; }, // Clear array efficiently
			initialSize
		);
	}

	get() {
		return this.pool.get();
	}

	reset() {
		this.pool.reset();
	}
}

/**
 * String builder for efficient string concatenation
 */
export class StringBuilder {
	constructor(initialCapacity = 256) {
		this.buffer = new Array(initialCapacity);
		this.length = 0;
	}

	/**
	 * Append a string to the buffer
	 * @param {string} str - String to append
	 */
	append(str) {
		this.buffer[this.length++] = str;
		return this;
	}

	/**
	 * Clear the buffer
	 */
	clear() {
		this.length = 0;
		return this;
	}

	/**
	 * Convert buffer to string
	 * @returns {string} Concatenated string
	 */
	toString() {
		return this.buffer.slice(0, this.length).join('');
	}

	/**
	 * Get current length
	 * @returns {number} Number of strings in buffer
	 */
	size() {
		return this.length;
	}
}

/**
 * Memoization utility with automatic cleanup
 */
export class MemoCache {
	constructor(maxSize = 100) {
		this.cache = new Map();
		this.maxSize = maxSize;
		this.accessOrder = [];
	}

	/**
	 * Get cached value or compute and cache it
	 * @param {*} key - Cache key
	 * @param {Function} computeFn - Function to compute value if not cached
	 * @returns {*} Cached or computed value
	 */
	get(key, computeFn) {
		if (this.cache.has(key)) {
			// Move to end of access order (most recently used)
			const index = this.accessOrder.indexOf(key);
			if (index > -1) {
				this.accessOrder.splice(index, 1);
				this.accessOrder.push(key);
			}
			return this.cache.get(key);
		}

		// Compute and cache
		const value = computeFn();
		this.set(key, value);
		return value;
	}

	/**
	 * Set a value in cache
	 * @param {*} key - Cache key
	 * @param {*} value - Value to cache
	 */
	set(key, value) {
		if (this.cache.size >= this.maxSize) {
			// Remove least recently used
			const lruKey = this.accessOrder.shift();
			this.cache.delete(lruKey);
		}

		this.cache.set(key, value);
		this.accessOrder.push(key);
	}

	/**
	 * Clear all cached values
	 */
	clear() {
		this.cache.clear();
		this.accessOrder.length = 0;
	}

	/**
	 * Check if key exists in cache
	 * @param {*} key - Cache key
	 * @returns {boolean} Whether key exists
	 */
	has(key) {
		return this.cache.has(key);
	}

	/**
	 * Get current cache size
	 * @returns {number} Number of cached items
	 */
	size() {
		return this.cache.size;
	}
}

/**
 * Efficient array deduplication using Set
 * @param {Array} arr - Array to deduplicate
 * @returns {Array} Deduplicated array
 */
export function deduplicateArray(arr) {
	return Array.from(new Set(arr));
}

/**
 * Efficient object property access with fallback
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path
 * @param {*} fallback - Fallback value
 * @returns {*} Property value or fallback
 */
export function fastGet(obj, path, fallback = undefined) {
	if (!obj || typeof obj !== 'object') return fallback;

	const keys = path.split('.');
	let current = obj;

	for (const key of keys) {
		if (current == null || typeof current !== 'object' || !(key in current)) {
			return fallback;
		}
		current = current[key];
	}

	return current;
}

/**
 * Create a shallow clone of an object without prototype properties
 * @param {Object} obj - Object to clone
 * @returns {Object} Shallow clone
 */
export function fastClone(obj) {
	if (!obj || typeof obj !== 'object') return obj;

	const clone = Object.create(null);
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			clone[key] = obj[key];
		}
	}
	return clone;
}

/**
 * Efficient array filtering with early termination
 * @param {Array} arr - Array to filter
 * @param {Function} predicate - Filter predicate
 * @param {number} maxResults - Maximum number of results (optional)
 * @returns {Array} Filtered array
 */
export function fastFilter(arr, predicate, maxResults = Infinity) {
	const result = [];
	let count = 0;

	for (const item of arr) {
		if (predicate(item)) {
			result.push(item);
			count++;
			if (count >= maxResults) break;
		}
	}

	return result;
}

/**
 * Pre-allocated common objects to reduce allocations
 */
export const EMPTY_OBJECT = Object.freeze({});
export const EMPTY_ARRAY = Object.freeze([]);

/**
 * Get an empty object (reuses frozen instance)
 * @returns {Object} Empty object
 */
export function getEmptyObject() {
	return EMPTY_OBJECT;
}

/**
 * Get an empty array (reuses frozen instance)
 * @returns {Array} Empty array
 */
export function getEmptyArray() {
	return EMPTY_ARRAY;
}
