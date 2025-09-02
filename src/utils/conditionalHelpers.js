/**
 * Utility functions for common conditional logic patterns
 * Helps simplify complex component logic and improve readability
 */

/**
 * Determines the appropriate loading state based on multiple conditions
 * @param {Object} conditions - Object containing different loading states
 * @param {boolean} conditions.initialLoading - Whether this is the initial load
 * @param {boolean} conditions.isLoading - Whether data is currently loading
 * @param {boolean} conditions.hasError - Whether there's an error
 * @param {boolean} conditions.isEmpty - Whether the data is empty
 * @returns {string} The current state: 'initial', 'loading', 'error', 'empty', or 'loaded'
 */
export function getLoadingState({ initialLoading, isLoading, hasError, isEmpty }) {
	if (initialLoading) return 'initial';
	if (isLoading) return 'loading';
	if (hasError) return 'error';
	if (isEmpty) return 'empty';
	return 'loaded';
}

/**
 * Creates a conditional style object based on multiple conditions
 * @param {Object} conditions - Object mapping condition names to boolean values
 * @param {Object} styles - Object mapping condition names to style objects
 * @returns {Object} Combined style object for matching conditions
 * @example
 * const style = getConditionalStyle(
 *   { isFocused: true, hasError: false },
 *   {
 *     isFocused: { borderWidth: 2, borderColor: 'blue' },
 *     hasError: { borderColor: 'red' }
 *   }
 * );
 */
export function getConditionalStyle(conditions, styles) {
	let combinedStyle = {};

	for (const [condition, isTrue] of Object.entries(conditions)) {
		if (isTrue && styles[condition]) {
			combinedStyle = { ...combinedStyle, ...styles[condition] };
		}
	}

	return combinedStyle;
}

/**
 * Safely accesses nested object properties with a fallback
 * @param {Object} obj - The object to access
 * @param {string} path - Dot-separated path to the property (e.g., 'user.profile.name')
 * @param {*} fallback - Fallback value if property doesn't exist
 * @returns {*} The property value or fallback
 * @example
 * const name = safeGet(user, 'profile.name', 'Unknown');
 */
export function safeGet(obj, path, fallback = undefined) {
	if (!obj || typeof path !== 'string') return fallback;

	const keys = path.split('.');
	let current = obj;

	for (const key of keys) {
		if (current == null || typeof current !== 'object') {
			return fallback;
		}
		current = current[key];
	}

	return current !== undefined ? current : fallback;
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @param {Object} options - Options object
 * @param {boolean} options.leading - Whether to invoke on the leading edge
 * @returns {Function} The debounced function
 */
export function debounce(func, wait, options = {}) {
	let timeout;
	const { leading = false } = options;

	return function debounced(...args) {
		const later = () => {
			timeout = null;
			if (!leading) func.apply(this, args);
		};

		const callNow = leading && !timeout;

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);

		if (callNow) func.apply(this, args);
	};
}

/**
 * Checks if two objects are shallowly equal
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} Whether objects are shallowly equal
 */
export function shallowEqual(obj1, obj2) {
	if (obj1 === obj2) return true;

	if (!obj1 || !obj2) return false;
	if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) return false;

	for (const key of keys1) {
		if (obj1[key] !== obj2[key]) return false;
	}

	return true;
}

/**
 * Validates if a string is a valid formula (starts with = and has content)
 * @param {string} str - String to validate
 * @returns {boolean} Whether the string is a valid formula
 */
export function isValidFormula(str) {
	return typeof str === 'string' && str.startsWith('=') && str.length > 1;
}

/**
 * Extracts the formula part from a string (removes the = prefix)
 * @param {string} formula - Formula string (e.g., "=A1+B1")
 * @returns {string} The formula without the = prefix (e.g., "A1+B1")
 */
export function extractFormula(formula) {
	if (!isValidFormula(formula)) return '';
	return formula.slice(1);
}

/**
 * Determines if content should trigger grid expansion
 * @param {string} oldContent - Previous cell content
 * @param {string} newContent - New cell content
 * @returns {boolean} Whether grid should expand
 */
export function shouldExpandGrid(oldContent, newContent) {
	const hadContent = Boolean(oldContent && oldContent.trim());
	const hasNewContent = Boolean(newContent && newContent.trim());

	return !hadContent && hasNewContent;
}

/**
 * Determines if content should trigger grid pruning
 * @param {string} oldContent - Previous cell content
 * @param {string} newContent - New cell content
 * @returns {boolean} Whether grid should prune
 */
export function shouldPruneGrid(oldContent, newContent) {
	const hadContent = Boolean(oldContent && oldContent.trim());
	const hasNewContent = Boolean(newContent && newContent.trim());

	return hadContent && !hasNewContent;
}
