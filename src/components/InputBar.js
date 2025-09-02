import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { cellRefToXY, coordKey } from '../utils/coords';

// Temporarily revert regex optimization to fix formula highlighting
// TODO: Re-implement with proper reset logic
const CELL_REF_REGEX = /\b([A-Z]+[1-9][0-9]*)\b/g;

export default function InputBar({ value, onChangeText, onSubmit, selection, onSelectionChange, isFormula, referencedColors = {}, isLoading = false }) {
    const canSubmit = true; // allow submitting empty cells

    const highlightedSpans = useMemo(() => {
        if (!isFormula || !value || !value.startsWith('=')) return null;

        const parts = [];
        let lastIndex = 0;
        let m;
        while ((m = CELL_REF_REGEX.exec(value)) !== null) {
            const start = m.index;
            const end = CELL_REF_REGEX.lastIndex;
            if (start > lastIndex) {
                parts.push({ text: value.slice(lastIndex, start), color: null });
            }
            const ref = m[1];
            let color = null;
            if (ref) { // Ensure ref exists before processing
                const xy = cellRefToXY(ref);
                if (xy) {
                    const key = coordKey(xy.x, xy.y);
                    color = referencedColors[key] || null;
                }
            }
            parts.push({ text: ref || m[0], color }); // Fallback to full match if capture group fails
            lastIndex = end;
        }
        if (lastIndex < value.length) {
            parts.push({ text: value.slice(lastIndex), color: null });
        }
        return parts;
    }, [isFormula, referencedColors, value]);

    const getInputAccessibilityLabel = () => {
        if (isFormula) {
            return `Formula input: ${value || 'empty'}. Cell references will be highlighted in colors.`;
        }
        return `Cell content input: ${value || 'empty'}. Type text or start with equals sign for formulas.`;
    };

    const getInputAccessibilityHint = () => {
        if (isFormula) {
            return 'Enter mathematical formulas using cell references like A1, B2. Use operators +, -, *, /, and functions.';
        }
        return 'Enter text content or start with = to create a formula';
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            accessibilityLabel="Cell input area"
        >
            <View style={styles.bar}>
                <View style={styles.inputWrapper}>
                    {isFormula && highlightedSpans && (
                        <Text
                            style={styles.overlayText}
                            numberOfLines={1}
                            ellipsizeMode="clip"
                            pointerEvents="none"
                            accessible={false}
                        >
                            {highlightedSpans.map((p, idx) => (
                                <Text key={idx} style={p.color ? { color: p.color, fontWeight: '700' } : undefined}>{p.text}</Text>
                            ))}
                        </Text>
                    )}
                    <TextInput
                        value={value}
                        onChangeText={onChangeText}
                        style={[styles.input, isFormula ? styles.inputOverlay : null, isFormula ? styles.inputSingleLine : null]}
                        placeholder={isFormula ? undefined : "Type text or =formula"}
                        multiline={!isFormula}
                        numberOfLines={isFormula ? 1 : undefined}
                        scrollEnabled={!isFormula}
                        returnKeyType="default"
                        blurOnSubmit={false}
                        selection={selection || undefined}
                        onSelectionChange={onSelectionChange}
                        autoFocus
                        accessible
                        accessibilityLabel={getInputAccessibilityLabel()}
                        accessibilityHint={getInputAccessibilityHint()}
                        accessibilityRole="textInput"
                        accessibilityState={{
                            disabled: isLoading,
                            busy: isLoading
                        }}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.submit, (!canSubmit || isLoading) && styles.submitDisabled]}
                    onPress={onSubmit}
                    disabled={!canSubmit || isLoading}
                    accessible
                    accessibilityLabel={isLoading ? "Submitting changes..." : "Submit cell changes"}
                    accessibilityHint={isLoading ? "Please wait while your changes are being saved" : "Save the current cell content"}
                    accessibilityRole="button"
                    accessibilityState={{
                        disabled: !canSubmit || isLoading,
                        busy: isLoading
                    }}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>✓</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    bar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', backgroundColor: 'rgba(250,250,250,0.9)', minHeight: 64 },
    inputWrapper: { flex: 1, position: 'relative' },
    input: { flex: 1, minHeight: 40, maxHeight: 140, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, backgroundColor: '#fff' },
    inputSingleLine: { height: 40, maxHeight: 40, textAlignVertical: 'center' },
    inputOverlay: { color: 'transparent', backgroundColor: 'transparent' },
    overlayText: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, color: '#000' },
	submit: { marginLeft: 8, width: 44, alignSelf: 'stretch', borderRadius: 8, backgroundColor: '#34C759', alignItems: 'center', justifyContent: 'center' },
	submitDisabled: { backgroundColor: '#a8e5b8' },
	submitText: { color: '#fff', fontSize: 22, fontWeight: '800' },
});


