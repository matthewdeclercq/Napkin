import React, { useMemo, useRef, useState, memo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { coordKey, GRID_MIN, GRID_MAX } from '../utils/coords';

const CELL_BASE_WIDTH = 96;
const CELL_BASE_HEIGHT = 48; // half of previous height
const GRID_WORLD_X = CELL_BASE_WIDTH * (GRID_MAX - GRID_MIN + 1);
const GRID_WORLD_Y = CELL_BASE_HEIGHT * (GRID_MAX - GRID_MIN + 1);

// Memoized cell component to prevent unnecessary re-renders
const Cell = memo(({ cell, displayValues, focused, isFocused, onCellPress, referencedColors }) => {
	const value = displayValues[coordKey(cell.x, cell.y)] ?? '';
	const left = (cell.x - GRID_MIN) * CELL_BASE_WIDTH;
	const top = (GRID_MAX - cell.y) * CELL_BASE_HEIGHT;
	const hasContent = Boolean(cell.content && String(cell.content).trim().length > 0);
	const refColor = referencedColors[coordKey(cell.x, cell.y)];
	const borderColor = isFocused ? '#000' : refColor ? refColor : hasContent ? '#666' : '#bbb';
	const borderWidth = isFocused || refColor ? 2 : hasContent ? 1 : StyleSheet.hairlineWidth;
	const zIndex = isFocused ? 3 : refColor ? 2 : hasContent ? 1 : 0;

	// Generate accessibility label based on cell state and content
	const getAccessibilityLabel = () => {
		const position = `${cell.x}, ${cell.y}`;
		const isFormula = cell.content?.startsWith('=');
		const isReferenced = Boolean(refColor);

		let label = `Cell ${position}`;

		if (isFocused) {
			label += ', currently selected';
		}

		if (hasContent) {
			if (isFormula) {
				label += `, formula: ${cell.content}`;
			} else {
				label += `, contains: ${value}`;
			}
		} else {
			label += ', empty';
		}

		if (isReferenced) {
			label += ', referenced by formula';
		}

		return label;
	};

	const getAccessibilityHint = () => {
		if (isFocused) {
			return 'Double tap to select all text, or use the input bar below to edit';
		}
		return 'Tap to select this cell for editing';
	};

	return (
		<TouchableOpacity
			style={[styles.cell, { left, top, borderColor, borderWidth, zIndex }, isFocused && styles.cellFocused]}
			onPress={() => onCellPress(cell.x, cell.y)}
			accessible
			accessibilityLabel={getAccessibilityLabel()}
			accessibilityHint={getAccessibilityHint()}
			accessibilityRole="button"
			accessibilityState={{
				selected: isFocused,
				disabled: false
			}}
		>
			<Text style={styles.cellText} numberOfLines={6}>{value}</Text>
		</TouchableOpacity>
	);
});

export default function Canvas({ cells, displayValues, focused, onFocusCell, onTapRefWhileFormula, isFormula, referencedColors = {}, onDoubleTapCell, onShakeUndo }) {
	const [scale, setScale] = useState(1);
	const [translate, setTranslate] = useState({ x: 0, y: 0 });
	const lastPan = useRef({ x: 0, y: 0 });
	const lastScale = useRef(1);
	const lastTapAt = useRef(0);

	const cellEntries = useMemo(() => Object.values(cells), [cells]);

	const onCellPress = (x, y) => {
		const now = Date.now();
		if (now - lastTapAt.current < 250) {
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
	};

	const onPanEvent = (e) => {
		const { translationX, translationY, velocityX, velocityY, state } = e.nativeEvent;
		if (state === State.ACTIVE) {
			setTranslate({ x: lastPan.current.x + translationX, y: lastPan.current.y + translationY });
		} else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
			const vx = Math.abs(velocityX);
			const vy = Math.abs(velocityY);
			if (vx + vy > 6000 && typeof onShakeUndo === 'function') {
				// Heuristic "shake" via vigorous pan velocity -> trigger undo
				onShakeUndo();
			}
			lastPan.current = { x: lastPan.current.x + translationX, y: lastPan.current.y + translationY };
		}
	};

	const onPinchEvent = (e) => {
		if (e.nativeEvent.state === State.ACTIVE) {
			const next = Math.min(3, Math.max(0.5, lastScale.current * e.nativeEvent.scale));
			setScale(next);
		} else if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED || e.nativeEvent.state === State.FAILED) {
			lastScale.current = Math.min(3, Math.max(0.5, lastScale.current * e.nativeEvent.scale));
		}
	};

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
								accessibilityLabel={`Spreadsheet grid showing ${cellEntries.length} cells`}
							>
								{cellEntries.map((cell) => {
									const isFocused = focused ? (cell.x === focused.x && cell.y === focused.y) : false;
									return (
										<Cell
											key={coordKey(cell.x, cell.y)}
											cell={cell}
											displayValues={displayValues}
											focused={focused}
											isFocused={isFocused}
											onCellPress={onCellPress}
											referencedColors={referencedColors}
										/>
									);
								})}
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
	inner: { position: 'absolute', left: '50%', top: '50%', width: GRID_WORLD_X, height: GRID_WORLD_Y, marginLeft: -(GRID_WORLD_X / 2), marginTop: -(GRID_WORLD_Y / 2) },
	cell: { position: 'absolute', width: CELL_BASE_WIDTH, height: CELL_BASE_HEIGHT, borderWidth: StyleSheet.hairlineWidth, borderColor: '#aaa', padding: 6, backgroundColor: 'transparent' },
	cellFocused: { borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
	cellText: { fontSize: 14 },
});


