import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Top navigation bar component for NapkinScreen
 * @param {Object} props
 * @param {Function} props.onExit - Function to exit the napkin
 * @param {Function} props.onUndo - Function to undo last action
 * @param {Function} props.onPressTitle - Function to handle title press (rename)
 * @param {string} props.title - Current napkin title
 */
export default function TopBar({ onExit, onUndo, onPressTitle, title }) {
  return (
    <View style={styles.topBar} accessibilityLabel="Napkin navigation bar">
      <TouchableOpacity
        onPress={onExit}
        accessible
        accessibilityLabel="Go back to napkin list"
        accessibilityHint="Exit the current napkin and return to the home screen"
        accessibilityRole="button"
        style={styles.backButton}
      >
        <Text style={styles.back}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPressTitle}
        accessible
        accessibilityLabel={`Rename napkin: ${title || 'Untitled'}`}
        accessibilityHint="Tap to rename this napkin"
        accessibilityRole="button"
        style={{ flex: 1, alignItems: 'center' }}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Napkin'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onUndo}
        accessible
        accessibilityLabel="Undo last action"
        accessibilityHint="Revert the most recent change"
        accessibilityRole="button"
        style={styles.undoButton}
      >
        <Text style={styles.back}>Undo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  back: {
    color: '#007AFF',
    fontWeight: '600'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'center'
  },
});
