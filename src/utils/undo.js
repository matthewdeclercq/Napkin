const MAX_HISTORY = 50;

export function pushHistory(napkin) {
	const { history, cells } = napkin;
	const snapshot = JSON.stringify(cells);
	const nextHistory = [...history, snapshot].slice(-MAX_HISTORY);
	return { ...napkin, history: nextHistory };
}

export function undoOnce(napkin) {
	const { history } = napkin;
	if (!history || history.length === 0) return { napkin, changed: false };
	const prevSnapshot = history[history.length - 1];
	const prevCells = JSON.parse(prevSnapshot);
	const nextHistory = history.slice(0, -1);
	return { napkin: { ...napkin, cells: prevCells, history: nextHistory }, changed: true };
}


