import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';

export default function NapkinListItem({ item, onPress, onDelete, onRename }) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(item.name);

	const confirmDelete = () => {
		Alert.alert('Delete napkin?', 'This cannot be undone.', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Delete', style: 'destructive', onPress: onDelete },
		]);
	};

	const commitRename = () => {
		setEditing(false);
		if (name && name !== item.name) onRename(name);
	};

	const onLongPressHandlerStateChange = (event) => {
		if (event.nativeEvent.state === State.ACTIVE) {
			Alert.alert(
				item.name,
				'Choose an action',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Rename', onPress: () => setEditing(true) },
					{ text: 'Delete', style: 'destructive', onPress: confirmDelete },
				]
			);
		}
	};

	return (
		<LongPressGestureHandler onHandlerStateChange={onLongPressHandlerStateChange} minDurationMs={500}>
			<View>
				<BlurView intensity={30} tint="light" style={styles.blurContainer}>
					<TouchableOpacity onPress={onPress} style={[styles.row, styles.itemBackground]} activeOpacity={0.7}>
						<View style={styles.contentContainer}>
							{editing ? (
								<TextInput
									value={name}
									onChangeText={setName}
									autoFocus
									onBlur={commitRename}
									style={styles.input}
									returnKeyType="done"
									onSubmitEditing={commitRename}
								/>
							) : (
								<Text style={styles.name} numberOfLines={1}>{item.name}</Text>
							)}
							<Text style={styles.date}>{new Date(item.updatedAt).toLocaleString()}</Text>
						</View>
					</TouchableOpacity>
				</BlurView>
			</View>
		</LongPressGestureHandler>
	);
}

const styles = StyleSheet.create({
	blurContainer: {
		borderRadius: 16,
		marginHorizontal: 16,
		marginVertical: 4,
		overflow: 'hidden',

	},
	itemBackground: {
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	contentContainer: {
		flex: 1,
		flexDirection: 'column',
	},
	name: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
		color: '#000',
	},
	date: {
		fontSize: 12,
		color: '#666',
	},
	input: {
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.5)',
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 16,
		marginBottom: 4,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		color: '#000',
	},
});


