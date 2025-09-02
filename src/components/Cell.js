import React, { memo, useMemo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { coordKey, GRID_MIN, GRID_MAX } from '../utils/coords';
import { UI_CONSTANTS } from '../utils/constants';

const CELL_BASE_WIDTH = UI_CONSTANTS.CELL_DIMENSIONS.WIDTH;
const CELL_BASE_HEIGHT = UI_CONSTANTS.CELL_DIMENSIONS.HEIGHT;

/**
 * Optimized Cell component with comprehensive memoization
 *
 * This component is heavily optimized to prevent unnecessary re-renders:
 * - Memoizes expensive calculations (position, styling, accessibility)
 * - Uses useCallback for event handlers
 * - Prevents recreation of objects and functions on every render
 *
 * @param {Object} props - Component props
 * @param {Object} props.cell - Cell data object with x, y, content
 * @param {Object} props.displayValues - Computed display values for all cells
 * @param {Object} props.focused - Currently focused cell coordinates
 * @param {boolean} props.isFocused - Whether this cell is currently focused
 * @param {Function} props.onCellPress - Cell press handler function
 * @param {Object} props.referencedColors - Colors for cells referenced by formulas
 */
const Cell = memo(({
	cell,
	displayValues,
	focused,
	isFocused,
	onCellPress,
	referencedColors
}) => {
	// Memoize expensive calculations
	const cellKey = useMemo(() => coordKey(cell.x, cell.y), [cell.x, cell.y]);
	const value = displayValues[cellKey] ?? '';

	const position = useMemo(() => ({
		left: (cell.x - GRID_MIN) * CELL_BASE_WIDTH,
		top: (GRID_MAX - cell.y) * CELL_BASE_HEIGHT
	}), [cell.x, cell.y]);

	const cellState = useMemo(() => {
		const hasContent = Boolean(cell.content && String(cell.content).trim().length > 0);
		const refColor = referencedColors[cellKey];
		const isFormula = cell.content?.startsWith('=');
		const isReferenced = Boolean(refColor);

		// Use constants for styling
		const borderColor = isFocused ? UI_CONSTANTS.COLORS.BORDER_FOCUSED
			: refColor ? refColor
			: hasContent ? UI_CONSTANTS.COLORS.BORDER_HAS_CONTENT
			: UI_CONSTANTS.COLORS.BORDER_DEFAULT;

		const borderWidth = isFocused || refColor ? UI_CONSTANTS.BORDER_WIDTH.FOCUSED_OR_REFERENCED
			: hasContent ? UI_CONSTANTS.BORDER_WIDTH.HAS_CONTENT
			: UI_CONSTANTS.BORDER_WIDTH.DEFAULT;

		const zIndex = isFocused ? UI_CONSTANTS.Z_INDEX.FOCUSED
			: refColor ? UI_CONSTANTS.Z_INDEX.REFERENCED
			: hasContent ? UI_CONSTANTS.Z_INDEX.HAS_CONTENT
			: UI_CONSTANTS.Z_INDEX.DEFAULT;

		return {
			hasContent,
			refColor,
			isFormula,
			isReferenced,
			borderColor,
			borderWidth,
			zIndex
		};
	}, [cell.content, cellKey, isFocused, referencedColors]);

	// Memoize accessibility functions to prevent recreation on every render
	const accessibilityLabel = useMemo(() => {
		const position = `${cell.x}, ${cell.y}`;
		let label = `Cell ${position}`;

		if (isFocused) {
			label += ', currently selected';
		}

		if (cellState.hasContent) {
			if (cellState.isFormula) {
				label += `, formula: ${cell.content}`;
			} else {
				label += `, contains: ${value}`;
			}
		} else {
			label += ', empty';
		}

		if (cellState.isReferenced) {
			label += ', referenced by formula';
		}

		return label;
	}, [cell.x, cell.y, cell.content, isFocused, cellState.hasContent, cellState.isFormula, cellState.isReferenced, value]);

	const accessibilityHint = useMemo(() => {
		if (isFocused) {
			return 'Double tap to select all text, or use the input bar below to edit';
		}
		return 'Tap to select this cell for editing';
	}, [isFocused]);

	// Memoize accessibility state to prevent recreation
	const accessibilityState = useMemo(() => ({
		selected: isFocused,
		disabled: false
	}), [isFocused]);

	// Memoize press handler to prevent recreation
	const handlePress = useCallback(() => {
		onCellPress(cell.x, cell.y);
	}, [onCellPress, cell.x, cell.y]);

	return (
		<TouchableOpacity
			style={[
				styles.cell,
				{
					left: position.left,
					top: position.top,
					borderColor: cellState.borderColor,
					borderWidth: cellState.borderWidth,
					zIndex: cellState.zIndex
				},
				isFocused && styles.cellFocused
			]}
			onPress={handlePress}
			accessible
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={accessibilityHint}
			accessibilityRole="button"
			accessibilityState={accessibilityState}
		>
			<Text style={styles.cellText} numberOfLines={6}>{value}</Text>
		</TouchableOpacity>
	);
});

const styles = StyleSheet.create({
	cell: {
		position: 'absolute',
		width: CELL_BASE_WIDTH,
		height: CELL_BASE_HEIGHT,
		borderWidth: UI_CONSTANTS.BORDER_WIDTH.DEFAULT,
		borderColor: '#aaa',
		padding: 6,
		backgroundColor: UI_CONSTANTS.COLORS.CELL_BACKGROUND
	},
	cellFocused: {
		borderColor: UI_CONSTANTS.COLORS.BORDER_FOCUSED,
		shadowColor: UI_CONSTANTS.COLORS.BORDER_FOCUSED,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 2
	},
	cellText: { fontSize: 14 },
});

export default Cell;
