// Coordinate and Excel-style reference helpers

// Expand grid to a maximum of 30x30
export const GRID_MIN = -14; // leftmost column index
export const GRID_MAX = 15;  // topmost row index when y increases upwards
export const GRID_SIZE = GRID_MAX - GRID_MIN + 1; // 30

export function coordKey(x, y) {
	return `${x},${y}`;
}

export function parseCoordKey(key) {
	const [xs, ys] = key.split(',');
	return { x: parseInt(xs, 10), y: parseInt(ys, 10) };
}

// A1 at {0,0}; B1 is {1,0}; rows increase top->bottom; our y increases upwards
// So: row = 1 - y
export function xyToCellRef(x, y) {
    // Map grid coordinates to A1-style where A1 is the top-left of the bounded grid
    // Column index is zero-based from GRID_MIN → A, rows increase downward
    const colIndex = x - GRID_MIN; // 0..29
    const rowIndex = GRID_MAX - y + 1; // 1..30
    const col = xToColumnLetters(colIndex);
    return `${col}${rowIndex}`;
}

export function cellRefToXY(ref) {
    // Handle null, undefined, or empty refs
    if (!ref || typeof ref !== 'string') {
        console.warn('[cellRefToXY] Received invalid ref:', ref, typeof ref);
        return null;
    }

    const trimmedRef = ref.trim();
    if (!trimmedRef) {
        console.warn('[cellRefToXY] Received empty ref after trim:', ref);
        return null;
    }

    const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(trimmedRef);
    if (!match) {
        console.warn('[cellRefToXY] Invalid cell reference format:', trimmedRef);
        return null;
    }

    const colLetters = match[1];
    const row = parseInt(match[2], 10);
    const x = GRID_MIN + columnLettersToX(colLetters);
    const y = GRID_MAX - (row - 1);
    return { x, y };
}

export function xToColumnLetters(x) {
	// x=0 -> A, 1->B, ...
	let n = x + 1; // 1-indexed
	let result = '';
	while (n > 0) {
		const rem = (n - 1) % 26;
		result = String.fromCharCode(65 + rem) + result;
		n = Math.floor((n - 1) / 26);
	}
	return result;
}

export function columnLettersToX(letters) {
	let n = 0;
	for (let i = 0; i < letters.length; i++) {
		n = n * 26 + (letters.charCodeAt(i) - 65 + 1);
	}
	return n - 1; // back to 0-indexed
}

export function withinBounds(x, y) {
	return x >= GRID_MIN && x <= GRID_MAX && y >= GRID_MIN && y <= GRID_MAX;
}


