import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { cellRefToXY, coordKey } from '../utils/coords';

export default function InputBar({ value, onChangeText, onSubmit, selection, onSelectionChange, isFormula, referencedColors = {} }) {
    const canSubmit = true; // allow submitting empty cells

    const highlightedSpans = useMemo(() => {
        if (!isFormula || !value || !value.startsWith('=')) return null;
        const parts = [];
        const re = /([A-Z]+[1-9][0-9]*)/g;
        let lastIndex = 0;
        let m;
        while ((m = re.exec(value)) !== null) {
            const start = m.index;
            const end = re.lastIndex;
            if (start > lastIndex) {
                parts.push({ text: value.slice(lastIndex, start), color: null });
            }
            const ref = m[1];
            let color = null;
            const xy = cellRefToXY(ref);
            if (xy) {
                const key = coordKey(xy.x, xy.y);
                color = referencedColors[key] || null;
            }
            parts.push({ text: ref, color });
            lastIndex = end;
        }
        if (lastIndex < value.length) {
            parts.push({ text: value.slice(lastIndex), color: null });
        }
        return parts;
    }, [isFormula, referencedColors, value]);

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.bar}>
                <View style={styles.inputWrapper}>
                    {isFormula && highlightedSpans && (
                        <Text style={styles.overlayText} numberOfLines={1} ellipsizeMode="clip" pointerEvents="none">
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
                    />
                </View>
                <TouchableOpacity style={[styles.submit, !canSubmit && styles.submitDisabled]} onPress={onSubmit} disabled={!canSubmit} accessibilityLabel="Submit">
                    <Text style={styles.submitText}>✓</Text>
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


