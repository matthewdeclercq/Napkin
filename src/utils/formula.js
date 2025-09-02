/**
 * Formula Evaluation System with Dependency Tracking
 *
 * This module provides the core formula evaluation functionality for the Napkin spreadsheet app.
 * It handles mathematical expressions, cell references, circular dependency detection, and
 * real-time formula preview during editing.
 *
 * Key Features:
 * - MathJS-powered expression evaluation
 * - A1-style cell reference support (e.g., A1, B2, C10)
 * - Memoization for performance optimization
 * - Circular reference detection and error handling
 * - Real-time formula preview during editing
 * - Dependency tracking for selective updates (NEW)
 * - Intelligent recalculation of only affected cells (NEW)
 *
 * @module formula
 */

import { create, all } from 'mathjs';
import { cellRefToXY, xyToCellRef, coordKey } from './coords';
import { FORMULA_CONSTANTS } from './constants';
import { ObjectPool } from './memoryOptimization';

// Create math instance with all functions for reliability
// TODO: Re-implement selective imports after ensuring stability
const math = create(all, {});

/**
 * Regular expression for matching A1-style cell references (e.g., A1, B2, AA10)
 * Uses word boundaries to ensure we don't match partial strings
 */
const REF_REGEX = /\b([A-Z]+[1-9][0-9]*)\b/g;

// Create scope objects for formula evaluation
function createScope() {
	return {}; // Regular objects work reliably with mathjs
}

/**
 * Extracts all cell reference strings (like A1, B2, C10) from a formula string
 * @param {string} formula - The formula string to parse (without the '=' prefix)
 * @returns {string[]} Array of unique cell references found in the formula
 * @example
 * extractRefs("A1 + B2 * C3") // returns ["A1", "B2", "C3"]
 * extractRefs("SUM(A1:A10)") // returns ["A1", "A10"]
 */
export function extractRefs(formula) {
	const refs = new Set();
	let m;
	while ((m = REF_REGEX.exec(formula)) !== null) {
		refs.add(m[1]);
	}
	return Array.from(refs);
}

/**
 * Evaluates a cell's display value with memoization and circular reference detection
 *
 * This function handles the core formula evaluation logic with several key features:
 * - Memoization to avoid redundant calculations
 * - Circular reference detection to prevent infinite loops
 * - Error handling for invalid formulas
 * - Automatic conversion of cell references to numeric values
 *
 * @param {Object.<string, {x: number, y: number, content: string}>} cells - All cells in the spreadsheet
 * @param {string} key - Coordinate key for the cell to evaluate (e.g., "0,0")
 * @param {Object.<string, string>} memo - Memoization cache to store computed values
 * @param {Set<string>} visiting - Set of cell keys currently being evaluated (for cycle detection)
 * @returns {string} The computed display value for the cell
 *
 * @example
 * // Simple value cell
 * getDisplayValueForCell(cells, "0,0") // returns "42"
 *
 * // Formula cell
 * getDisplayValueForCell(cells, "1,1") // returns "84" for formula "=A1*2"
 *
 * // Circular reference
 * getDisplayValueForCell(cells, "0,0") // returns "#ERROR" for circular refs
 */
export function getDisplayValueForCell(cells, key, memo = {}, visiting = new Set()) {
	if (memo[key] !== undefined) return memo[key];
	const cell = cells[key];
	if (!cell || !cell.content) {
		memo[key] = '';
		return '';
	}
	const content = cell.content;
	if (!content.startsWith('=')) {
		memo[key] = content;
		return content;
	}
	if (visiting.has(key)) {
		memo[key] = FORMULA_CONSTANTS.ERROR_VALUE;
		return FORMULA_CONSTANTS.ERROR_VALUE;
	}
	visiting.add(key);
	const formula = content.slice(1);
	let expr = formula;
	const refs = extractRefs(formula);
	const scope = createScope(); // Create fresh scope object
	for (const ref of refs) {
		const xy = cellRefToXY(ref);
		if (!xy) {
			scope[ref] = FORMULA_CONSTANTS.DEFAULT_NUMERIC_VALUE;
			continue;
		}
		const refKey = coordKey(xy.x, xy.y);
		const value = getDisplayValueForCell(cells, refKey, memo, visiting);
		const numeric = parseFloat(String(value).replace(/,/g, ''));
		scope[ref] = Number.isFinite(numeric) ? numeric : FORMULA_CONSTANTS.DEFAULT_NUMERIC_VALUE;
	}
	try {
		const result = math.evaluate(expr, scope);
		memo[key] = String(result);
		visiting.delete(key);
		return memo[key];
	} catch (e) {
		memo[key] = FORMULA_CONSTANTS.ERROR_VALUE;
		visiting.delete(key);
		return FORMULA_CONSTANTS.ERROR_VALUE;
	}
}

/**
 * Computes display values for all cells in the spreadsheet
 *
 * This function evaluates all formulas and values across the entire spreadsheet,
 * using memoization to efficiently handle interdependencies between cells.
 * It's typically called when the spreadsheet data changes to recalculate all values.
 *
 * @param {Object.<string, {x: number, y: number, content: string}>} cells - All cells in the spreadsheet
 * @returns {Object.<string, string>} Object mapping cell keys to their computed display values
 *
 * @example
 * const cells = {
 *   "0,0": { x: 0, y: 0, content: "42" },
 *   "1,0": { x: 1, y: 0, content: "=A1*2" }
 * };
 * const displayValues = computeAllDisplayValues(cells);
 * // displayValues = { "0,0": "42", "1,0": "84" }
 */
export function computeAllDisplayValues(cells) {
	const memo = {};
	for (const key of Object.keys(cells)) {
		getDisplayValueForCell(cells, key, memo, new Set());
	}
	return memo;
}

/**
 * Evaluates content for display in a specific cell position
 *
 * This function is used for real-time preview of formula results while editing.
 * It temporarily overrides the cell content to evaluate what the result would be
 * if the current input content were saved to the cell.
 *
 * @param {Object.<string, {x: number, y: number, content: string}>} cells - All cells in the spreadsheet
 * @param {number} x - X coordinate of the cell being evaluated
 * @param {number} y - Y coordinate of the cell being evaluated
 * @param {string} content - The content to evaluate (can be a formula or plain text)
 * @returns {string} The computed display value for the given content
 *
 * @example
 * // Preview a formula before saving
 * const result = evaluateContentForDisplay(cells, 0, 0, "=A1+B1");
 * // Returns the calculated result without modifying the actual cell
 *
 * // Preview plain text (returns as-is)
 * const result = evaluateContentForDisplay(cells, 0, 0, "Hello");
 * // Returns "Hello"
 */
export function evaluateContentForDisplay(cells, x, y, content) {
	if (!content) return '';
	if (!content.startsWith('=')) return content;
	const key = coordKey(x, y);
	const memo = {};
	const visiting = new Set();
	// Temporarily override the cell content for evaluation context
	const tmpCells = { ...cells, [key]: { x, y, content } };
	return getDisplayValueForCell(tmpCells, key, memo, visiting);
}

/**
 * Builds a dependency graph for all cells in the spreadsheet
 *
 * This function analyzes all formulas and creates a mapping of which cells
 * depend on which other cells. This is used for selective recalculation
 * when only some cells change.
 *
 * @param {Object.<string, {x: number, y: number, content: string}>} cells - All cells in the spreadsheet
 * @returns {Object} Dependency graph with dependents and dependencies
 * @returns {Object.<string, Set<string>>} returns.dependents - Map of cell -> cells that depend on it
 * @returns {Object.<string, Set<string>>} returns.dependencies - Map of cell -> cells it depends on
 *
 * @example
 * const graph = buildDependencyGraph(cells);
 * // graph.dependents["0,0"] = Set(["1,0", "2,0"]) // cells that depend on A1
 * // graph.dependencies["1,0"] = Set(["0,0"]) // cells that B1 depends on
 */
export function buildDependencyGraph(cells) {
	const cellKeys = Object.keys(cells);
	const dependents = {};
	const dependencies = {};

	// Initialize empty sets for all cells efficiently
	for (const key of cellKeys) {
		dependents[key] = new Set();
		dependencies[key] = new Set();
	}

	// Build the dependency relationships
	for (const [key, cell] of Object.entries(cells)) {
		if (!cell.content || !cell.content.startsWith('=')) {
			continue; // Skip non-formula cells
		}

		const refs = extractRefs(cell.content.slice(1));

		for (const ref of refs) {
			const xy = cellRefToXY(ref);
			if (!xy) continue;

			const refKey = coordKey(xy.x, xy.y);

			// This cell depends on the referenced cell
			dependencies[key].add(refKey);

			// The referenced cell has this cell as a dependent
			if (dependents[refKey]) {
				dependents[refKey].add(key);
			} else {
				// Handle case where referenced cell doesn't exist in our cells object
				dependents[refKey] = new Set([key]);
			}
		}
	}

	return { dependents, dependencies };
}

/**
 * Gets all cells that need to be recalculated when the given cells change
 *
 * This function traverses the dependency graph to find all cells that are
 * affected by changes to the input cells, including transitive dependencies.
 *
 * @param {string[]} changedKeys - Array of cell keys that have changed
 * @param {Object} dependencyGraph - Dependency graph from buildDependencyGraph
 * @returns {Set<string>} Set of all cell keys that need recalculation
 *
 * @example
 * const changedKeys = ["0,0"]; // A1 changed
 * const affectedCells = getAffectedCells(changedKeys, graph);
 * // Returns Set(["0,0", "1,0", "2,0"]) if B1 and C1 depend on A1
 */
export function getAffectedCells(changedKeys, { dependents }) {
	const affected = new Set(changedKeys);
	const toProcess = Array.from(changedKeys); // More explicit array creation

	while (toProcess.length > 0) {
		const currentKey = toProcess.pop(); // Use pop for better performance with large arrays

		// Add all cells that depend on this cell
		const cellDependents = dependents[currentKey];
		if (cellDependents) {
			for (const dependent of cellDependents) {
				if (!affected.has(dependent)) {
					affected.add(dependent);
					toProcess.push(dependent);
				}
			}
		}
	}

	return affected;
}

/**
 * Computes display values for only the cells affected by changes
 *
 * This optimized version only recalculates cells that are actually affected
 * by the changes, using dependency tracking for maximum efficiency.
 *
 * @param {Object.<string, {x: number, y: number, content: string}>} cells - All cells in the spreadsheet
 * @param {Object.<string, string>} previousValues - Previous display values for memoization
 * @param {string[]} changedKeys - Array of cell keys that have changed
 * @returns {Object.<string, string>} Updated display values (only changed cells)
 *
 * @example
 * const changedKeys = ["0,0"]; // Only A1 changed
 * const newValues = computeUpdatedDisplayValues(cells, oldValues, changedKeys);
 * // Only recalculates A1 and cells that depend on A1
 */
export function computeUpdatedDisplayValues(cells, previousValues = {}, changedKeys = []) {
	// If no specific changes provided, fall back to full recalculation
	if (!changedKeys || changedKeys.length === 0) {
		return computeAllDisplayValues(cells);
	}

	// Build dependency graph
	const dependencyGraph = buildDependencyGraph(cells);

	// Find all affected cells
	const affectedKeys = getAffectedCells(changedKeys, dependencyGraph);

	// Start with previous values
	const newValues = { ...previousValues };
	const memo = {};
	const visiting = new Set();

	// Only recalculate affected cells
	for (const key of affectedKeys) {
		const result = getDisplayValueForCell(cells, key, memo, visiting);
		newValues[key] = result;
	}

	return newValues;
}

/**
 * Enhanced version of computeAllDisplayValues that supports dependency tracking
 *
 * This function maintains the same API as the original but can optionally
 * use dependency tracking for better performance on updates.
 *
 * @param {Object.<string, {x: number, y: number, content: string}>} cells - All cells in the spreadsheet
 * @param {Object.<string, string>} [previousValues] - Previous values for optimization
 * @param {string[]} [changedKeys] - Specific keys that changed (optional)
 * @returns {Object.<string, string>} Display values for all cells
 */
export function computeDisplayValues(cells, previousValues, changedKeys) {
	if (previousValues && changedKeys && changedKeys.length > 0) {
		// Use optimized selective update
		return computeUpdatedDisplayValues(cells, previousValues, changedKeys);
	} else {
		// Fall back to full recalculation
		return computeAllDisplayValues(cells);
	}
}


