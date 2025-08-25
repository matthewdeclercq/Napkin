import { coordKey, withinBounds } from './coords';

export function createInitialCells() {
	const cells = {};
	const key = coordKey(0, 0);
	cells[key] = { x: 0, y: 0, content: '' };
	return cells;
}

export function getCell(cells, x, y) {
	return cells[coordKey(x, y)];
}

export function setCell(cells, x, y, content) {
	const next = { ...cells };
	const key = coordKey(x, y);
	next[key] = { x, y, content };
	return next;
}

export function hasCell(cells, x, y) {
	return !!cells[coordKey(x, y)];
}

export function expandIfAllowed(cells, x, y) {
	// Only add missing adjacent cells (top, right, bottom, left)
	// Block entire expansion if any would exceed bounds
	const candidates = [
		{ x: x, y: y + 1 }, // top
		{ x: x + 1, y: y }, // right
		{ x: x, y: y - 1 }, // bottom
		{ x: x - 1, y: y }, // left
	];

	for (const c of candidates) {
		if (!withinBounds(c.x, c.y)) {
			return cells; // block all
		}
	}

	let next = { ...cells };
	for (const c of candidates) {
		if (!hasCell(next, c.x, c.y)) {
			next = setCell(next, c.x, c.y, '');
		}
	}
	return next;
}

// Removed implicit name derivation from cells; names are user-controlled only

export function listAllCells(cells) {
	return Object.values(cells);
}

function neighbors4(x, y) {
	return [
		{ x, y: y + 1 },
		{ x: x + 1, y },
		{ x, y: y - 1 },
		{ x: x - 1, y },
	];
}

function hasNonEmptyNeighbor(cells, x, y) {
	for (const n of neighbors4(x, y)) {
		const c = getCell(cells, n.x, n.y);
		if (c && c.content && String(c.content).trim().length > 0) return true;
	}
	return false;
}

export function pruneAdjacentIsolatedEmpties(cells, x, y) {
	let next = { ...cells };
	for (const n of neighbors4(x, y)) {
		const c = getCell(next, n.x, n.y);
		if (!c) continue;
		const isEmpty = !c.content || String(c.content).trim().length === 0;
		if (!isEmpty) continue;
		if (!hasNonEmptyNeighbor(next, n.x, n.y)) {
			const key = coordKey(n.x, n.y);
			// Remove isolated empty adjacent cell
			next = { ...next };
			delete next[key];
		}
	}
	return next;
}


