import React, { useMemo, useRef, useState, memo, useCallback } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { coordKey, GRID_MIN, GRID_MAX } from '../utils/coords';
import { UI_CONSTANTS } from '../utils/constants';
import { useCanvasGestures } from '../hooks/useCanvasGestures';

const CELL_BASE_WIDTH = UI_CONSTANTS.CELL_DIMENSIONS.WIDTH;
const CELL_BASE_HEIGHT = UI_CONSTANTS.CELL_DIMENSIONS.HEIGHT;
const GRID_WORLD_X = CELL_BASE_WIDTH * (GRID_MAX - GRID_MIN + 1);
const GRID_WORLD_Y = CELL_BASE_HEIGHT * (GRID_MAX - GRID_MIN + 1);

// Import the optimized Cell component
import Cell from './Cell';
import Grid from './Grid';

export default function Canvas({
	cells,
	displayValues,
	focused,
	onFocusCell,
	onTapRefWhileFormula,
	isFormula,
	referencedColors = {},
	onDoubleTapCell,
	onShakeUndo
}) {
	const [scale, setScale] = useState(UI_CONSTANTS.ZOOM_LIMITS.DEFAULT);
	const [translate, setTranslate] = useState({ x: 0, y: 0 });
	const lastPan = useRef({ x: 0, y: 0 });
	const lastScale = useRef(UI_CONSTANTS.ZOOM_LIMITS.DEFAULT);
	const lastTapAt = useRef(0);

	// Cell rendering is now handled by the Grid component

	// Memoize cell press handler to prevent recreation
	const onCellPress = useCallback((x, y) => {
		const now = Date.now();
		if (now - lastTapAt.current < UI_CONSTANTS.DOUBLE_TAP_THRESHOLD) {
			// double tap
			if (isFormula) {
				// when editing a formula, treat double-tap as insert-ref as well
				onTapRefWhileFormula(x, y);
			} else {
				onFocusCell(x, y);
				if (onDoubleTapCell) onDoubleTapCell();
			}
			lastTapAt.current = 0;
			return;
		}
		lastTapAt.current = now;
		if (isFormula) {
			// insert reference and keep current focus/cursor on the original cell
			onTapRefWhileFormula(x, y);
			return;
		}
		onFocusCell(x, y);
	}, [isFormula, onTapRefWhileFormula, onFocusCell, onDoubleTapCell]);

	// Use extracted gesture handlers
	const { onPanEvent, onPinchEvent } = useCanvasGestures({
		scale,
		setScale,
		translate,
		setTranslate,
		lastPan,
		lastScale,
		onShakeUndo
	});

	return (
		<View
			style={styles.container}
			accessible={true}
			accessibilityLabel="Spreadsheet canvas - pan and zoom to navigate, tap cells to edit"
			accessibilityHint="Use two fingers to pinch and zoom, or drag to pan around the spreadsheet"
			accessibilityRole="scrollView"
		>
			<PanGestureHandler onHandlerStateChange={onPanEvent} onGestureEvent={onPanEvent}>
				<View style={StyleSheet.absoluteFill}>
					<PinchGestureHandler onHandlerStateChange={onPinchEvent} onGestureEvent={onPinchEvent}>
						<View style={StyleSheet.absoluteFill}>
                            <View
								style={[styles.inner, { transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }] }]}
								accessibilityLabel={`Spreadsheet grid showing ${Object.keys(cells).length} cells`}
							>
								<Grid
									cells={cells}
									displayValues={displayValues}
									focused={focused}
									onCellPress={onCellPress}
									referencedColors={referencedColors}
								/>
							</View>
						</View>
					</PinchGestureHandler>
				</View>
			</PanGestureHandler>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, overflow: 'hidden' },
	inner: {
		position: 'absolute',
		left: '50%',
		top: '50%',
		width: GRID_WORLD_X,
		height: GRID_WORLD_Y,
		marginLeft: -(GRID_WORLD_X / 2),
		marginTop: -(GRID_WORLD_Y / 2)
	},
});


