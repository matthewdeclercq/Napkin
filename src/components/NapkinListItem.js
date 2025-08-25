import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
				<TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
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
			</View>
		</LongPressGestureHandler>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: '#ccc',
		backgroundColor: '#fff',
	},
	contentContainer: {
		flex: 1,
		flexDirection: 'column',
	},
	name: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	date: {
		fontSize: 12,
		color: '#666',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 16,
		marginBottom: 4,
	},
});


