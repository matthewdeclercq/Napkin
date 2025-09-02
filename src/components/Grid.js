import React, { useMemo } from 'react';
import { coordKey } from '../utils/coords';

// Import the optimized Cell component
import Cell from './Cell';

/**
 * Grid component for rendering spreadsheet cells
 *
 * This component handles the rendering of all cells in the spreadsheet grid.
 * It optimizes performance by memoizing cell entries and providing focused
 * cell detection.
 *
 * @param {Object} props - Component props
 * @param {Object.<string, {x: number, y: number, content: string}>} props.cells - All cells in the spreadsheet
 * @param {Object.<string, string>} props.displayValues - Computed display values for all cells
 * @param {Object} props.focused - Currently focused cell coordinates
 * @param {Function} props.onCellPress - Cell press handler function
 * @param {Object} props.referencedColors - Colors for cells referenced by formulas
 * @returns {JSX.Element} Grid of cells
 */
export default function Grid({
	cells,
	displayValues,
	focused,
	onCellPress,
	referencedColors
}) {
	// Memoize cell entries to prevent recreation on every render
	const cellEntries = useMemo(() => Object.values(cells), [cells]);

	return (
		<>
			{cellEntries.map((cell) => {
				const cellKey = coordKey(cell.x, cell.y);
				const isFocused = focused ? (cell.x === focused.x && cell.y === focused.y) : false;

				return (
					<Cell
						key={cellKey}
						cell={cell}
						displayValues={displayValues}
						focused={focused}
						isFocused={isFocused}
						onCellPress={onCellPress}
						referencedColors={referencedColors}
					/>
				);
			})}
		</>
	);
}
