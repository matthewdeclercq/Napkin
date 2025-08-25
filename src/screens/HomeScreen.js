import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View, RefreshControl, StyleSheet } from 'react-native';
import { loadIndex, deleteNapkin, renameNapkin } from '../utils/storage';
import NapkinListItem from '../components/NapkinListItem';

export default function HomeScreen({ onCreateNew, onOpenNapkin }) {
	const [items, setItems] = useState([]);
	const [refreshing, setRefreshing] = useState(false);

	const load = useCallback(async () => {
		setRefreshing(true);
		const idx = await loadIndex();
		setItems(idx);
		setRefreshing(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleDelete = useCallback(async (id) => {
		await deleteNapkin(id);
		load();
	}, [load]);

	const handleRename = useCallback(async (id, name) => {
		await renameNapkin(id, name);
		load();
	}, [load]);

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<Text style={styles.title}>Napkin</Text>
				<TouchableOpacity style={styles.addBtn} onPress={onCreateNew} accessibilityRole="button" accessibilityLabel="Create new napkin">
					<Text style={styles.addText}>+</Text>
				</TouchableOpacity>
			</View>
			<FlatList
				data={items}
				keyExtractor={(it) => it.id}
				renderItem={({ item }) => (
					<NapkinListItem
						item={item}
						onPress={() => onOpenNapkin(item.id)}
						onDelete={() => handleDelete(item.id)}
						onRename={(name) => handleRename(item.id, name)}
					/>
				)}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
				contentContainerStyle={{ paddingBottom: 40 }}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
	title: { fontSize: 24, fontWeight: '700' },
	addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF' },
	addText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 22 },
});


