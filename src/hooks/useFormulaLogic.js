import { useMemo, useCallback, useRef } from 'react';
import { computeDisplayValues, extractRefs, evaluateContentForDisplay } from '../utils/formula';
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
  // Track previous cells and display values for optimization
  const prevCellsRef = useRef();
  const prevDisplayValuesRef = useRef();

  // Detect which cells have changed for selective recalculation
  const changedKeys = useMemo(() => {
    if (!prevCellsRef.current) {
      prevCellsRef.current = cells;
      return null; // First render, calculate all
    }

    const changes = [];
    const currentKeys = new Set(Object.keys(cells));
    const previousKeys = new Set(Object.keys(prevCellsRef.current));

    // Check for added/modified cells
    for (const key of currentKeys) {
      if (!previousKeys.has(key) || cells[key].content !== prevCellsRef.current[key]?.content) {
        changes.push(key);
      }
    }

    // Check for removed cells (though this is less common in our app)
    for (const key of previousKeys) {
      if (!currentKeys.has(key)) {
        changes.push(key);
      }
    }

    return changes.length > 0 ? changes : null;
  }, [cells]);

  // Memoize expensive display values computation with optimization
  const displayValues = useMemo(() => {
    let result;

    if (!prevCellsRef.current || !changedKeys) {
      // First render or no specific changes detected - full recalculation
      result = computeDisplayValues(cells);
    } else {
      // Use previous display values for selective recalculation
      const prevValues = prevDisplayValuesRef.current || {};
      result = computeDisplayValues(cells, prevValues, changedKeys);
    }

    // Store current values for next comparison
    prevDisplayValuesRef.current = result;
    prevCellsRef.current = cells;

    return result;
  }, [cells, changedKeys]);

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
