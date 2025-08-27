import { useMemo, useCallback } from 'react';
import { computeAllDisplayValues, extractRefs, evaluateContentForDisplay } from '../utils/formula';
import { cellRefToXY, xyToCellRef, coordKey } from '../utils/coords';

/**
 * Custom hook to handle formula-related logic
 * @param {Object} cells - The current cells object
 * @param {string} inputValue - Current input value
 * @param {Object} editingCell - Currently editing cell coordinates
 * @param {boolean} isEditingDirty - Whether the current edit is unsaved
 * @param {Object} selection - Current text selection in input
 * @param {Function} setInputValue - Function to update input value
 * @param {Function} setSelection - Function to update selection
 * @returns {Object} Formula-related state and handlers
 */
export function useFormulaLogic(cells, inputValue, editingCell, isEditingDirty, selection, setInputValue, setSelection) {
  // Memoize expensive display values computation
  const displayValues = useMemo(() => {
    return computeAllDisplayValues(cells);
  }, [cells]);

  // Compute effective display values including preview for editing cell
  const effectiveDisplayValues = useMemo(() => {
    const map = { ...displayValues };
    if (editingCell && isEditingDirty) {
      const key = coordKey(editingCell.x, editingCell.y);
      if (key) {
        map[key] = evaluateContentForDisplay(cells, editingCell.x, editingCell.y, inputValue);
      }
    }
    return map;
  }, [displayValues, editingCell, inputValue, cells, isEditingDirty]);

  // Compute referenced colors for formula highlighting
  const referencedColors = useMemo(() => {
    if (!inputValue.startsWith('=')) return {};
    const refs = extractRefs(inputValue.slice(1));
    const palette = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de'];
    const map = {};
    refs.forEach((ref, idx) => {
      if (!ref || typeof ref !== 'string') {
        console.warn('[useFormulaLogic] Skipping invalid ref in referencedColors:', ref, typeof ref);
        return;
      }

      const xy = cellRefToXY(ref);
      if (xy) {
        const key = coordKey(xy.x, xy.y);
        map[key] = palette[idx % palette.length];
      }
    });
    return map;
  }, [inputValue]);

  // Insert cell reference at cursor position
  const insertRefAtCursor = useCallback((cellRef) => {
    setInputValue((currentValue) => {
      if (!currentValue.startsWith('=')) return currentValue;
      if (!selection) return currentValue + cellRef; // append if no selection info

      const { start, end } = selection;
      const before = currentValue.slice(0, start);
      const after = currentValue.slice(end);
      return before + cellRef + after;
    });

    // Move cursor to after inserted ref
    setSelection((currentSelection) => {
      const base = currentSelection || { start: inputValue.length, end: inputValue.length };
      const newPos = base.start + cellRef.length;
      return { start: newPos, end: newPos };
    });
  }, [inputValue.length, selection, setInputValue, setSelection]);

  // Handle tapping on a cell reference while editing formula
  const onTapRefWhileFormula = useCallback((x, y) => {
    if (!inputValue.startsWith('=')) return;
    const cellRef = xyToCellRef(x, y); // Convert coordinates to A1-style reference
    if (cellRef) {
      insertRefAtCursor(cellRef);
    }
  }, [inputValue, insertRefAtCursor]);

  return {
    displayValues: effectiveDisplayValues,
    referencedColors,
    isFormula: inputValue.startsWith('='),
    insertRefAtCursor,
    onTapRefWhileFormula
  };
}
