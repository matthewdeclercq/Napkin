import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from './src/screens/HomeScreen';
import NapkinScreen from './src/screens/NapkinScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { loadNapkinById, saveNapkin, createEmptyNapkin } from './src/utils/storage';

export default function App() {
	const colorScheme = useColorScheme();
	const [selectedNapkinId, setSelectedNapkinId] = useState(null);
	const [napkin, setNapkin] = useState(null);

	useEffect(() => {
		if (selectedNapkinId) {
			loadNapkinById(selectedNapkinId).then((n) => {
				setNapkin(n);
			});
		}
	}, [selectedNapkinId]);

	const handleCreateNew = useCallback(async () => {
		const n = await createEmptyNapkin();
		setSelectedNapkinId(n.id);
	}, []);

	const handleExitToHome = useCallback(() => {
		setSelectedNapkinId(null);
		setNapkin(null);
	}, []);

	const handleSaveNapkin = useCallback(async (updatedNapkin) => {
		setNapkin(updatedNapkin);
		await saveNapkin(updatedNapkin);
	}, []);

	return (
		<ErrorBoundary>
			<GestureHandlerRootView style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
				<StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
				{!selectedNapkinId ? (
					<ErrorBoundary>
						<HomeScreen onCreateNew={handleCreateNew} onOpenNapkin={setSelectedNapkinId} />
					</ErrorBoundary>
				) : napkin ? (
					<ErrorBoundary>
						<NapkinScreen napkin={napkin} onSaveNapkin={handleSaveNapkin} onExit={handleExitToHome} />
					</ErrorBoundary>
				) : null}
			</GestureHandlerRootView>
		</ErrorBoundary>
	);
}


