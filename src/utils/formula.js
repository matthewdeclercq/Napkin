import { create, all } from 'mathjs';
import { cellRefToXY, xyToCellRef, coordKey } from './coords';

const math = create(all, {});

const REF_REGEX = /\b([A-Z]+[1-9][0-9]*)\b/g;

export function extractRefs(formula) {
	const refs = new Set();
	let m;
	while ((m = REF_REGEX.exec(formula)) !== null) {
		refs.add(m[1]);
	}
	return Array.from(refs);
}

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
		memo[key] = '#ERROR';
		return '#ERROR';
	}
	visiting.add(key);
	const formula = content.slice(1);
	let expr = formula;
	const refs = extractRefs(formula);
	const scope = {};
	for (const ref of refs) {
		const xy = cellRefToXY(ref);
		if (!xy) {
			scope[ref] = 0;
			continue;
		}
		const refKey = coordKey(xy.x, xy.y);
		const value = getDisplayValueForCell(cells, refKey, memo, visiting);
		const numeric = parseFloat(String(value).replace(/,/g, ''));
		scope[ref] = Number.isFinite(numeric) ? numeric : 0;
	}
	try {
		const result = math.evaluate(expr, scope);
		memo[key] = String(result);
		visiting.delete(key);
		return memo[key];
	} catch (e) {
		memo[key] = '#ERROR';
		visiting.delete(key);
		return '#ERROR';
	}
}

export function computeAllDisplayValues(cells) {
	const memo = {};
	for (const key of Object.keys(cells)) {
		getDisplayValueForCell(cells, key, memo, new Set());
	}
	return memo;
}

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


