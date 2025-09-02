import { useCallback } from 'react';
import { State } from 'react-native-gesture-handler';
import { UI_CONSTANTS } from '../utils/constants';

/**
 * Custom hook for handling canvas gesture interactions
 * Manages pan, zoom, and shake-to-undo functionality
 *
 * @param {Object} params - Hook parameters
 * @param {number} params.scale - Current zoom scale
 * @param {Function} params.setScale - Function to update zoom scale
 * @param {Object} params.translate - Current translation position
 * @param {Function} params.setTranslate - Function to update translation
 * @param {Object} params.lastPan - Reference to last pan position
 * @param {Object} params.lastScale - Reference to last scale value
 * @param {Function} params.onShakeUndo - Callback for shake-to-undo gesture
 * @returns {Object} Gesture event handlers
 */
export function useCanvasGestures({
	scale,
	setScale,
	translate,
	setTranslate,
	lastPan,
	lastScale,
	onShakeUndo
}) {
	// Handle pan gestures (dragging to move around)
	const onPanEvent = useCallback((e) => {
		const { translationX, translationY, velocityX, velocityY, state } = e.nativeEvent;

		if (state === State.ACTIVE) {
			// Update translation during active pan
			setTranslate({
				x: lastPan.current.x + translationX,
				y: lastPan.current.y + translationY
			});
		} else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
			// Detect shake gesture for undo
			const vx = Math.abs(velocityX);
			const vy = Math.abs(velocityY);

			if (vx + vy > UI_CONSTANTS.SHAKE_VELOCITY_THRESHOLD && typeof onShakeUndo === 'function') {
				// Heuristic "shake" via vigorous pan velocity -> trigger undo
				onShakeUndo();
			}

			// Update last pan position
			lastPan.current = {
				x: lastPan.current.x + translationX,
				y: lastPan.current.y + translationY
			};
		}
	}, [setTranslate, lastPan, onShakeUndo]);

	// Handle pinch gestures (zooming in/out)
	const onPinchEvent = useCallback((e) => {
		const { scale: pinchScale, state } = e.nativeEvent;

		if (state === State.ACTIVE) {
			// Calculate new scale during pinch
			const nextScale = Math.min(
				UI_CONSTANTS.ZOOM_LIMITS.MAX,
				Math.max(UI_CONSTANTS.ZOOM_LIMITS.MIN, lastScale.current * pinchScale)
			);
			setScale(nextScale);
		} else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
			// Update last scale when pinch ends
			lastScale.current = Math.min(
				UI_CONSTANTS.ZOOM_LIMITS.MAX,
				Math.max(UI_CONSTANTS.ZOOM_LIMITS.MIN, lastScale.current * pinchScale)
			);
		}
	}, [setScale, lastScale]);

	return {
		onPanEvent,
		onPinchEvent
	};
}
