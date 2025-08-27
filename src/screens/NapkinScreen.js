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

export default function NapkinScreen({ napkin, onSaveNapkin, onExit }) {
	const [state, setState] = useState(napkin);
	const [focused, setFocused] = useState({ x: 0, y: 0 });
	const [inputValue, setInputValue] = useState('');

	const [selection, setSelection] = useState(null);
	const [renameVisible, setRenameVisible] = useState(false);
	const [renameText, setRenameText] = useState(napkin.name || '');
	const prevNapkinIdRef = useRef(napkin.id);
	const [editingCell, setEditingCell] = useState({ x: 0, y: 0 });
	const [isEditingDirty, setIsEditingDirty] = useState(false);
	const [isSwitchingCells, setIsSwitchingCells] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const previewKeyRef = useRef(null);

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

// Save currently editing cell (if changed)
const saveFocusedCellIfChanged = useCallback(async () => {
	if (!editingCell) return false;
	const { x, y } = editingCell;
	const key = coordKey(x, y);
	const prevContent = state.cells[key]?.content || '';
	if (prevContent === inputValue) return false;

	setIsSaving(true);
	try {
		const prevNapkinWithHistory = pushHistory(state);
		let nextNapkin = { ...prevNapkinWithHistory };
		const prevCell = state.cells[key] || { x, y, content: '' };
		nextNapkin.cells = setCell(state.cells, x, y, inputValue);
		if (!prevCell.content && inputValue.trim()) {
			nextNapkin.cells = expandIfAllowed(nextNapkin.cells, x, y);
		} else if (!inputValue.trim()) {
			nextNapkin.cells = pruneAdjacentIsolatedEmpties(nextNapkin.cells, x, y);
		}
		nextNapkin = { ...nextNapkin, updatedAt: Date.now() };
		setState(nextNapkin);
		await onSaveNapkin(nextNapkin);
		return true;
	} finally {
		setIsSaving(false);
	}
}, [editingCell, inputValue, onSaveNapkin, state]);

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

		setIsSaving(true);
		try {
			const prevNapkinWithHistory = pushHistory(state);
			let nextNapkin = { ...prevNapkinWithHistory };
			const prevCell = state.cells[coordKey(x, y)] || { x, y, content: '' };
			// Allow empty submit; no expansion will occur and content becomes ''
			nextNapkin.cells = setCell(state.cells, x, y, inputValue);
			if (!prevCell.content && inputValue.trim()) {
				const expanded = expandIfAllowed(nextNapkin.cells, x, y);
				nextNapkin.cells = expanded;
			} else if (!inputValue.trim()) {
				// On empty submit, prune adjacent empty cells that don't touch any non-empty cell
				nextNapkin.cells = pruneAdjacentIsolatedEmpties(nextNapkin.cells, x, y);
			}
			nextNapkin = { ...nextNapkin, name: state.name, nameIsCustom: state.nameIsCustom || false, updatedAt: Date.now() };
			setState(nextNapkin);
			await onSaveNapkin(nextNapkin);

			// Always clear editing state after submit to prevent value transfer
			setEditingCell(null);
			setInputValue('');
			setSelection(null);
			// Keep focus on the current cell but clear editing state
		} finally {
			setIsSaving(false);
		}
	}, [editingCell, focused, inputValue, onSaveNapkin, state]);





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

	const commitRename = useCallback(async (nextName) => {
		const trimmed = (nextName || '').trim();
		if (!trimmed) return;
		const updated = { ...state, name: trimmed, nameIsCustom: true, updatedAt: Date.now() };
		setState(updated);
		await onSaveNapkin(updated);
	}, [onSaveNapkin, state]);

	const onPressTitle = useCallback(() => {
		if (Platform.OS === 'ios' && Alert.prompt) {
			Alert.prompt(
				'Rename napkin',
				'',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Save', onPress: (text) => commitRename(text) },
				],
				'plain-text',
				state.name || 'Untitled'
			);
		} else {
			setRenameText(state.name || 'Untitled');
			setRenameVisible(true);
		}
	}, [commitRename, state.name]);



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
				onClose={() => setRenameVisible(false)}
				onRename={commitRename}
				initialName={state.name || 'Untitled'}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
});


