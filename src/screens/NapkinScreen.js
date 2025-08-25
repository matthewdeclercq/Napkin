import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Keyboard, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Canvas from '../components/Canvas';
import InputBar from '../components/InputBar';
import { computeAllDisplayValues, extractRefs, evaluateContentForDisplay } from '../utils/formula';
import { expandIfAllowed, setCell, pruneAdjacentIsolatedEmpties } from '../utils/grid';
import { cellRefToXY, xyToCellRef, coordKey as makeKey } from '../utils/coords';
import { coordKey } from '../utils/coords';
import { pushHistory, undoOnce } from '../utils/undo';

export default function NapkinScreen({ napkin, onSaveNapkin, onExit }) {
	const [state, setState] = useState(napkin);
	const [focused, setFocused] = useState({ x: 0, y: 0 });
	const [inputValue, setInputValue] = useState('');
	const [displayValues, setDisplayValues] = useState(() => computeAllDisplayValues(napkin.cells));
	const [keyboardVisible, setKeyboardVisible] = useState(true);
	const [selection, setSelection] = useState(null);
	const [renameVisible, setRenameVisible] = useState(false);
	const [renameText, setRenameText] = useState(napkin.name || '');
	const prevNapkinIdRef = useRef(napkin.id);
	const [editingCell, setEditingCell] = useState({ x: 0, y: 0 });
	const [isEditingDirty, setIsEditingDirty] = useState(false);
	const [isSwitchingCells, setIsSwitchingCells] = useState(false);
	const previewKeyRef = useRef(null);

	useEffect(() => {
		setState(napkin);
		setDisplayValues(computeAllDisplayValues(napkin.cells));
		if (napkin.id !== prevNapkinIdRef.current) {
			setFocused({ x: 0, y: 0 });
			const initialContent = napkin.cells[coordKey(0, 0)]?.content || '';
			setInputValue(initialContent);
			setEditingCell({ x: 0, y: 0 });
			setSelection({ start: initialContent.length, end: initialContent.length });
			prevNapkinIdRef.current = napkin.id;
		}
	}, [napkin]);

	useEffect(() => {
		const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
		const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
		return () => { show.remove(); hide.remove(); };
	}, []);

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
	const prevNapkinWithHistory = pushHistory(state);
	let nextNapkin = { ...prevNapkinWithHistory };
	const prevCell = state.cells[key] || { x, y, content: '' };
	nextNapkin.cells = setCell(state.cells, x, y, inputValue);
	if (!prevCell.content && inputValue.trim()) {
		nextNapkin.cells = expandIfAllowed(nextNapkin.cells, x, y);
	} else if (!inputValue.trim()) {
		nextNapkin.cells = pruneAdjacentIsolatedEmpties(nextNapkin.cells, x, y);
	}
    const nextDisplay = computeAllDisplayValues(nextNapkin.cells);
    nextNapkin = { ...nextNapkin, updatedAt: Date.now() };
	setState(nextNapkin);
	setDisplayValues(nextDisplay);
	await onSaveNapkin(nextNapkin);
	return true;
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
    const nextDisplay = computeAllDisplayValues(nextNapkin.cells);
    nextNapkin = { ...nextNapkin, name: state.name, nameIsCustom: state.nameIsCustom || false, updatedAt: Date.now() };
		setState(nextNapkin);
		setDisplayValues(nextDisplay);
		await onSaveNapkin(nextNapkin);
		
		// Always clear editing state after submit to prevent value transfer
		setEditingCell(null);
		setInputValue('');
		setSelection(null);
		// Keep focus on the current cell but clear editing state
	}, [editingCell, focused, inputValue, onSaveNapkin, state]);

	const insertRefAtCursor = useCallback((a1) => {
		setInputValue((s) => {
			if (!s.startsWith('=')) return s;
			if (!selection) return s + a1; // append if no selection info
			const { start, end } = selection;
			const before = s.slice(0, start);
			const after = s.slice(end);
			return before + a1 + after;
		});
		// move cursor to after inserted ref
		setSelection((sel) => {
			const base = sel || { start: inputValue.length, end: inputValue.length };
			const newPos = base.start + a1.length;
			return { start: newPos, end: newPos };
		});
	}, [inputValue.length, selection]);

    const onTapRefWhileFormula = useCallback((x, y) => {
        if (!inputValue.startsWith('=')) return;
        const A1 = xyToCellRef(x, y);
        insertRefAtCursor(A1);
    }, [inputValue, insertRefAtCursor]);

	const onDoubleTapCell = useCallback(() => {
		// select all text in input
		setSelection({ start: 0, end: (inputValue || '').length });
	}, [inputValue]);

	const onUndo = useCallback(async () => {
		const { napkin: undone, changed } = undoOnce(state);
		if (!changed) return;
		setState(undone);
		setDisplayValues(computeAllDisplayValues(undone.cells));
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

	const effectiveDisplayValues = useMemo(() => {
		const map = { ...displayValues };
		if (editingCell && isEditingDirty) {
			const key = coordKey(editingCell.x, editingCell.y);
			if (previewKeyRef.current === key) {
				map[key] = evaluateContentForDisplay(state.cells, editingCell.x, editingCell.y, inputValue);
			}
		}
		return map;
	}, [displayValues, editingCell, inputValue, state.cells, isEditingDirty]);

	const referencedColors = useMemo(() => {
		if (!inputValue.startsWith('=')) return {};
		const refs = extractRefs(inputValue.slice(1));
		const palette = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de'];
		const map = {};
		refs.forEach((ref, idx) => {
			const xy = cellRefToXY(ref);
			if (!xy) return;
			map[makeKey(xy.x, xy.y)] = palette[idx % palette.length];
		});
		return map;
	}, [inputValue]);

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={onExit} accessibilityLabel="Back">
					<Text style={styles.back}>Back</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={onPressTitle} accessibilityLabel="Rename napkin" style={{ flex: 1, alignItems: 'center' }}>
					<Text style={styles.title} numberOfLines={1}>{state.name || 'Napkin'}</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={onUndo} accessibilityLabel="Undo">
					<Text style={styles.back}>Undo</Text>
				</TouchableOpacity>
			</View>
			<View style={{ flex: 1 }}>
				<Canvas
					cells={state.cells}
					displayValues={effectiveDisplayValues}
					focused={focused}
					onFocusCell={onFocusCell}
					onTapRefWhileFormula={onTapRefWhileFormula}
					isFormula={inputValue.startsWith('=')}
					referencedColors={referencedColors}
					onDoubleTapCell={onDoubleTapCell}
					onShakeUndo={onUndo}
				/>
			</View>
			<InputBar
				value={inputValue}
				onChangeText={onChangeInput}
				onSubmit={submit}
				selection={selection}
				onSelectionChange={({ nativeEvent }) => setSelection(nativeEvent.selection)}
				isFormula={inputValue.startsWith('=')}
				referencedColors={referencedColors}
			/>
			{/* Android rename modal fallback */}
			<Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
				<View style={styles.modalBackdrop}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Rename napkin</Text>
						<TextInput
							value={renameText}
							onChangeText={setRenameText}
							style={styles.modalInput}
							autoFocus
							returnKeyType="done"
							onSubmitEditing={async () => { setRenameVisible(false); await commitRename(renameText); }}
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity onPress={() => setRenameVisible(false)}>
								<Text style={styles.modalBtn}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={async () => { setRenameVisible(false); await commitRename(renameText); }}>
								<Text style={[styles.modalBtn, { color: '#007AFF', fontWeight: '700' }]}>Save</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	topBar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
	back: { color: '#007AFF', fontWeight: '600' },
	title: { fontSize: 16, fontWeight: '700', maxWidth: '60%', textAlign: 'center' },
	modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
	modalCard: { width: '86%', borderRadius: 12, backgroundColor: '#fff', padding: 16 },
	modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
	modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16 },
	modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 18 },
	modalBtn: { fontSize: 16 },
});


