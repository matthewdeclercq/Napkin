import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialCells } from './grid';

const INDEX_KEY = 'napkin:index';

export async function loadIndex() {
	const raw = await AsyncStorage.getItem(INDEX_KEY);
	const arr = raw ? JSON.parse(raw) : [];
	arr.sort((a, b) => b.updatedAt - a.updatedAt);
	return arr;
}

export async function saveIndex(index) {
	await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function saveNapkin(napkin) {
	const key = `napkin:${napkin.id}`;
	const now = Date.now();
	const toSave = { ...napkin, updatedAt: now };
	await AsyncStorage.setItem(key, JSON.stringify(toSave));
	let index = await loadIndex();
	const existingIdx = index.findIndex((n) => n.id === napkin.id);
	const meta = { id: napkin.id, name: napkin.name, updatedAt: now };
	if (existingIdx >= 0) index[existingIdx] = meta; else index.push(meta);
	await saveIndex(index);
	return toSave;
}

export async function loadNapkinById(id) {
	const raw = await AsyncStorage.getItem(`napkin:${id}`);
	return raw ? JSON.parse(raw) : null;
}

export async function deleteNapkin(id) {
	await AsyncStorage.removeItem(`napkin:${id}`);
	const index = await loadIndex();
	const next = index.filter((n) => n.id !== id);
	await saveIndex(next);
}

export async function renameNapkin(id, name) {
	const napkin = await loadNapkinById(id);
	if (!napkin) return;
    napkin.name = name;
    napkin.nameIsCustom = true;
	await saveNapkin(napkin);
}

export async function createEmptyNapkin() {
	const id = String(Date.now());
	const now = Date.now();
	const napkin = {
		id,
		name: 'Untitled',
        nameIsCustom: false,
		cells: createInitialCells(),
		createdAt: now,
		updatedAt: now,
		history: [],
	};
	await saveNapkin(napkin);
	return napkin;
}


