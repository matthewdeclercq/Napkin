import React, { useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Modal component for renaming napkins
 * @param {Object} props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onRename - Function to handle rename with new name
 * @param {string} props.initialName - Initial name value
 */
export default function RenameModal({ visible, onClose, onRename, initialName }) {
  const [name, setName] = useState(initialName);

  const handleSave = async () => {
    if (name && name.trim()) {
      onClose();
      await onRename(name.trim());
    }
  };

  const handleCancel = () => {
    setName(initialName); // Reset to original name
    onClose();
  };

  // Use native iOS prompt if available
  const handleRenamePress = () => {
    if (Platform.OS === 'ios' && Alert.prompt) {
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
      setName(initialName);
      // Modal will be shown via visible prop
    }
  };

  // If using native iOS prompt, don't show custom modal
  if (Platform.OS === 'ios' && Alert.prompt) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Rename napkin</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.modalInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            placeholder="Enter napkin name"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.modalBtn}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalBtn, { color: '#007AFF', fontWeight: '700' }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCard: {
    width: '86%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 12
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18
  },
  modalBtn: {
    fontSize: 16
  },
});
