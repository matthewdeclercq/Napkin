import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import Canvas from '../components/Canvas';
import InputBar from '../components/InputBar';
import TopBar from '../components/TopBar';
import RenameModal from '../components/RenameModal';
import { expandIfAllowed, setCell, pruneAdjacentIsolatedEmpties } from '../utils/grid';
import { coordKey } from '../utils/coords';
import { pushHistory, undoOnce } from '../utils/undo';
import ErrorBoundary from '../components/ErrorBoundary';
import { useFormulaLogic } from '../hooks/useFormulaLogic';
import { useKeyboard } from '../hooks/useKeyboard';
import { shouldExpandGrid, shouldPruneGrid } from '../utils/conditionalHelpers';
import { useRenameDialog } from '../hooks/useRenameDialog';
// import { useCellEditor } from '../hooks/useCellEditor'; // Temporarily disabled

export default function NapkinScreen({ napkin, onSaveNapkin, onExit }) {
	const [state, setState] = useState(napkin);
	const [focused, setFocused] = useState({ x: 0, y: 0 });
	const [inputValue, setInputValue] = useState('');

	const [selection, setSelection] = useState(null);
	const prevNapkinIdRef = useRef(napkin.id);
	const [isSwitchingCells, setIsSwitchingCells] = useState(false);
	const previewKeyRef = useRef(null);

	// Define commitRename function first to avoid dependency issues
	const commitRename = useCallback(async (nextName) => {
		const trimmed = (nextName || '').trim();
		if (!trimmed) return;
		const updated = { ...state, name: trimmed, nameIsCustom: true, updatedAt: Date.now() };
		setState(updated);
		await onSaveNapkin(updated);
	}, [onSaveNapkin, state]);

	// Use extracted rename dialog hook
	const {
		renameVisible,
		renameText,
		setRenameText,
		showRenameDialog,
		hideRenameDialog,
		handleRenameSubmit
	} = useRenameDialog(state.name, commitRename);

	// Temporarily use inline logic to test if hooks work
	const [editingCell, setEditingCell] = useState({ x: 0, y: 0 });
	const [isEditingDirty, setIsEditingDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Restore actual cell saving functionality
	const saveCellIfChanged = useCallback(async (x, y, newContent) => {
		const key = coordKey(x, y);
		const prevContent = state.cells[key]?.content || '';

		// If content hasn't changed, return false
		if (prevContent === newContent) {
			return false;
		}

		// Create history entry for undo functionality
		const prevNapkinWithHistory = pushHistory(state);
		let nextNapkin = { ...prevNapkinWithHistory };

		// Update the cell content
		nextNapkin.cells = setCell(state.cells, x, y, newContent);

		// Handle grid expansion/pruning
		if (!prevContent && newContent.trim()) {
			// New content added - expand grid if needed
			const expanded = expandIfAllowed(nextNapkin.cells, x, y);
			nextNapkin.cells = expanded;
		} else if (prevContent && !newContent.trim()) {
			// Content removed - prune empty cells
			nextNapkin.cells = pruneAdjacentIsolatedEmpties(nextNapkin.cells, x, y);
		}

		// Update timestamp
		nextNapkin = { ...nextNapkin, updatedAt: Date.now() };

		// Update state and save
		setState(nextNapkin);
		await onSaveNapkin(nextNapkin);

		return true;
	}, [state, setState, onSaveNapkin]);

	// Use custom hook for formula logic
	const {
		displayValues,
		referencedColors,
		isFormula,
		insertRefAtCursor,
		onTapRefWhileFormula
	} = useFormulaLogic(
		state.cells,
		inputValue,
		editingCell,
		isEditingDirty,
		selection,
		setInputValue,
		setSelection
	);

	useEffect(() => {
		setState(napkin);
		if (napkin.id !== prevNapkinIdRef.current) {
			setFocused({ x: 0, y: 0 });
			const initialContent = napkin.cells[coordKey(0, 0)]?.content || '';
			setInputValue(initialContent);
			setEditingCell({ x: 0, y: 0 });
			setSelection({ start: initialContent.length, end: initialContent.length });
			prevNapkinIdRef.current = napkin.id;
		}
	}, [napkin]);

	// Use keyboard hook for keyboard visibility
	const isKeyboardVisible = useKeyboard();

	useEffect(() => {
		if (focused && !isSwitchingCells) {
			const content = state.cells[coordKey(focused.x, focused.y)]?.content || '';
			setInputValue(content);
			setSelection({ start: content.length, end: content.length });
			setEditingCell(focused);
		}
	}, [focused, isSwitchingCells]); // Only depend on focused and switching flag

// Extract cell editing logic into a custom hook
const useCellEditor = (state, setState, onSaveNapkin) => {
	const [editingCell, setEditingCell] = useState({ x: 0, y: 0 });
	const [isEditingDirty, setIsEditingDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Helper function to determine what grid changes are needed
	const getGridChanges = (currentCells, x, y, newContent) => {
		const prevCell = currentCells[coordKey(x, y)] || { x, y, content: '' };
		const prevContent = prevCell.content || '';

		if (shouldExpandGrid(prevContent, newContent)) {
			return 'expand'; // New content added, expand grid if needed
		} else if (shouldPruneGrid(prevContent, newContent)) {
			return 'prune'; // Content removed, prune empty cells
		}
		return 'none'; // No grid changes needed
	};

	// Save currently editing cell (if changed)
	const saveCellIfChanged = useCallback(async (x, y, newContent) => {
		const key = coordKey(x, y);
		const prevContent = state.cells[key]?.content || '';
		if (prevContent === newContent) return false;

		setIsSaving(true);
		try {
			const prevNapkinWithHistory = pushHistory(state);
			let nextNapkin = { ...prevNapkinWithHistory };

			// Apply the cell content change
			nextNapkin.cells = setCell(state.cells, x, y, newContent);

			// Handle grid expansion/pruning based on content changes
			const gridChange = getGridChanges(state.cells, x, y, newContent);
			switch (gridChange) {
				case 'expand':
					nextNapkin.cells = expandIfAllowed(nextNapkin.cells, x, y);
					break;
				case 'prune':
					nextNapkin.cells = pruneAdjacentIsolatedEmpties(nextNapkin.cells, x, y);
					break;
				default:
					// No grid changes needed
					break;
			}

			nextNapkin = { ...nextNapkin, updatedAt: Date.now() };
			setState(nextNapkin);
			await onSaveNapkin(nextNapkin);
			return true;
		} finally {
			setIsSaving(false);
		}
	}, [state, setState, onSaveNapkin]);

	return {
		editingCell,
		setEditingCell,
		isEditingDirty,
		setIsEditingDirty,
		isSaving,
		saveCellIfChanged
	};
};

const onFocusCell = useCallback((x, y) => {
    if (focused && x === focused.x && y === focused.y) {
        const current = state.cells[coordKey(x, y)]?.content || '';
        setSelection({ start: current.length, end: current.length });
        return;
    }
    // Discard unsaved changes when switching cells (MVP behavior)
    setIsEditingDirty(false);
    previewKeyRef.current = null;
    // Prevent any transient linkage between previous input and the new cell
    setIsSwitchingCells(true);
    setEditingCell(null);
    setInputValue('');  // Clear input immediately
    setSelection({ start: 0, end: 0 });
    // Use a small delay to ensure the input is cleared before setting focus
    setTimeout(() => {
        setFocused({ x, y });  // This will trigger the useEffect to set the new values
        // Reset the switching flag after a brief delay
        setTimeout(() => {
            setIsSwitchingCells(false);
        }, 50);
    }, 0);
}, [focused]);

	const onChangeInput = useCallback((text) => {
		setInputValue(text);
		setIsEditingDirty(true);
		if (editingCell) previewKeyRef.current = coordKey(editingCell.x, editingCell.y);
	}, [editingCell]);

	const submit = useCallback(async () => {
		const target = editingCell || focused;
		if (!target) return;
		const { x, y } = target;

		// Save the cell content
		await saveCellIfChanged(x, y, inputValue);

		// Clear editing state after submit
		setEditingCell(null);
		setInputValue('');
		setSelection(null);
	}, [editingCell, focused, inputValue, saveCellIfChanged]);

	// clearEditingState is now handled inline in the submit function





	const onDoubleTapCell = useCallback(() => {
		// select all text in input
		setSelection({ start: 0, end: (inputValue || '').length });
	}, [inputValue]);

	const onUndo = useCallback(async () => {
		const { napkin: undone, changed } = undoOnce(state);
		if (!changed) return;
		setState(undone);
		await onSaveNapkin(undone);
	}, [onSaveNapkin, state]);

	// Rename dialog is now handled by the useRenameDialog hook

	const onPressTitle = useCallback(() => {
		showRenameDialog();
	}, [showRenameDialog]);

	// commitRename is now defined earlier to avoid dependency issues



	return (
		<SafeAreaView style={styles.safe}>
			<TopBar
				onExit={onExit}
				onUndo={onUndo}
				onPressTitle={onPressTitle}
				title={state.name}
			/>
			<View style={{ flex: 1 }}>
				<ErrorBoundary>
					<Canvas
						cells={state.cells}
						displayValues={displayValues}
						focused={focused}
						onFocusCell={onFocusCell}
						onTapRefWhileFormula={onTapRefWhileFormula}
						isFormula={isFormula}
						referencedColors={referencedColors}
						onDoubleTapCell={onDoubleTapCell}
						onShakeUndo={onUndo}
					/>
				</ErrorBoundary>
			</View>
			<InputBar
				value={inputValue}
				onChangeText={onChangeInput}
				onSubmit={submit}
				selection={selection}
				onSelectionChange={({ nativeEvent }) => setSelection(nativeEvent.selection)}
				isFormula={isFormula}
				referencedColors={referencedColors}
				isLoading={isSaving}
			/>
			<RenameModal
				visible={renameVisible}
				onClose={hideRenameDialog}
				onRename={handleRenameSubmit}
				initialName={state.name || 'Untitled'}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
});


