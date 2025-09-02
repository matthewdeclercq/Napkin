import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';

/**
 * Custom hook for managing rename dialog functionality
 *
 * Handles platform-specific rename dialogs (iOS native prompt vs custom modal)
 * and provides a unified interface for rename operations.
 *
 * @param {string} currentName - Current name of the item being renamed
 * @param {Function} onRename - Callback function when rename is confirmed
 * @returns {Object} Rename dialog state and handlers
 */
export function useRenameDialog(currentName, onRename) {
	const [renameVisible, setRenameVisible] = useState(false);
	const [renameText, setRenameText] = useState('');

	// Show the appropriate rename dialog based on platform
	const showRenameDialog = useCallback(() => {
		const initialName = currentName || 'Untitled';

		if (Platform.OS === 'ios' && Alert.prompt) {
			// Use native iOS prompt for better UX
			Alert.prompt(
				'Rename napkin',
				'',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Save', onPress: (text) => onRename(text) },
				],
				'plain-text',
				initialName
			);
		} else {
			// Use custom modal for Android and other platforms
			setRenameText(initialName);
			setRenameVisible(true);
		}
	}, [currentName, onRename]);

	// Hide the custom modal (for non-iOS platforms)
	const hideRenameDialog = useCallback(() => {
		setRenameVisible(false);
		setRenameText('');
	}, []);

	// Handle rename submission from custom modal
	const handleRenameSubmit = useCallback(async (newName) => {
		const trimmed = (newName || '').trim();
		if (!trimmed) return;

		// Hide modal first for better UX
		setRenameVisible(false);
		setRenameText('');

		// Call the rename callback
		await onRename(trimmed);
	}, [onRename]);

	return {
		renameVisible,
		renameText,
		setRenameText,
		showRenameDialog,
		hideRenameDialog,
		handleRenameSubmit
	};
}
