import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View, RefreshControl, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { loadIndex, deleteNapkin, renameNapkin } from '../utils/storage';
import NapkinListItem from '../components/NapkinListItem';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { getUserFriendlyErrorMessage } from '../utils/errorHandling';

export default function HomeScreen({ onCreateNew, onOpenNapkin }) {
	const [items, setItems] = useState([]);
	const [refreshing, setRefreshing] = useState(false);
	const [initialLoading, setInitialLoading] = useState(true);

	// Use async operation hook for loading napkins
	const {
		execute: loadNapkins,
		isLoading: isLoadingNapkins,
		error: loadError,
		resetError
	} = useAsyncOperation(
		async () => {
			const idx = await loadIndex();
			setItems(idx);
			return idx;
		},
		{
			operationName: 'loadNapkins',
			onSuccess: () => {
				setInitialLoading(false);
			},
			onError: () => {
				setInitialLoading(false); // Ensure initial loading is set to false on error
			},
			allowConcurrent: true // Allow retries even when loading
		}
	);

	// Handle pull to refresh
	const handleRefresh = useCallback(async () => {
		await loadNapkins();
	}, [loadNapkins]);

	// Handle retry
	const handleRetry = useCallback(async () => {
		resetError();
		await loadNapkins();
	}, [resetError, loadNapkins]);

	// Use async operation hook for delete operation
	const {
		execute: deleteNapkinAsync,
		isLoading: isDeleting
	} = useAsyncOperation(
		async (id) => {
			await deleteNapkin(id);
			// Reload list after deletion
			const idx = await loadIndex();
			setItems(idx);
			return id;
		},
		{ operationName: 'deleteNapkin' }
	);

	// Use async operation hook for rename operation
	const {
		execute: renameNapkinAsync,
		isLoading: isRenaming
	} = useAsyncOperation(
		async (id, name) => {
			await renameNapkin(id, name);
			// Reload list after rename
			const idx = await loadIndex();
			setItems(idx);
			return { id, name };
		},
		{ operationName: 'renameNapkin' }
	);

	useEffect(() => {
		loadNapkins();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	// Fallback mechanism to prevent loading from getting stuck
	useEffect(() => {
		let timeoutId;
		if (isLoadingNapkins && initialLoading) {
			timeoutId = setTimeout(() => {
				console.warn('[HomeScreen] Initial loading timeout - resetting loading state');
				setInitialLoading(false);
			}, 10000);
		}
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [isLoadingNapkins, initialLoading]);

	const handleDelete = useCallback(async (id) => {
		await deleteNapkinAsync(id);
	}, [deleteNapkinAsync]);

	const handleRename = useCallback(async (id, name) => {
		await renameNapkinAsync(id, name);
	}, [renameNapkinAsync]);

	return (
		<ImageBackground
			source={require('../../assets/background.png')}
			style={styles.background}
			resizeMode="cover"
		>
			<View style={styles.overlay} />
			<SafeAreaView style={styles.safe}>
				<BlurView intensity={4} tint="light" style={styles.headerBlur}>
					<View
						style={[styles.header, styles.headerBackground]}
						accessibilityLabel="Napkin app header"
					>
						<Text
							style={styles.title}
							accessible
							accessibilityLabel="Napkin app title"
							accessibilityRole="header"
						>
							Napkin
						</Text>
						<TouchableOpacity
							style={styles.addBtn}
							onPress={onCreateNew}
							accessible
							accessibilityRole="button"
							accessibilityLabel="Create new napkin"
							accessibilityHint="Tap to create a new spreadsheet napkin"
						>
							<Text style={styles.addText}>+</Text>
						</TouchableOpacity>
					</View>
				</BlurView>
				{initialLoading || isLoadingNapkins ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.loadingText}>Loading napkins...</Text>
					</View>
				) : loadError ? (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{loadError}</Text>
						<TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
							<Text style={styles.retryText}>Retry</Text>
						</TouchableOpacity>
					</View>
				) : (
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
						refreshControl={<RefreshControl refreshing={isLoadingNapkins && !initialLoading} onRefresh={handleRefresh} />}
						contentContainerStyle={{ paddingTop: 80, paddingBottom: 0 }}
						style={styles.list}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>No napkins yet</Text>
								<Text style={styles.emptySubtext}>Create your first napkin to get started</Text>
							</View>
						}
					/>
				)}
			</SafeAreaView>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	background: { flex: 1 },
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(255, 255, 255, 0.4)',
	},
	safe: { flex: 1 },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, marginTop: 0, marginHorizontal: 8, borderRadius:16 },
	headerBackground: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
	headerBlur: { position: 'absolute', top: 64, left: 8, right: 8, height: 72, zIndex: 10 },
	list: { flex: 1 },
	title: { fontSize: 24, fontWeight: '700', color: '#000' },
	addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF' },
	addText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 22, fontFamily: 'SpaceGrotesk-Bold' },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
	loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
	errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
	errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 16 },
	retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
	retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
	emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
	emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
	emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
});


