import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialCells } from './grid';
import { withErrorHandling, NapkinError, ErrorCodes } from './errorHandling';

const INDEX_KEY = 'napkin:index';

export async function loadIndex() {
  return await withErrorHandling(async () => {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.sort((a, b) => b.updatedAt - a.updatedAt);
    return arr;
  }, 'loadIndex', { rethrow: true });
}

export async function saveIndex(index) {
  return await withErrorHandling(async () => {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }, 'saveIndex', { rethrow: true });
}

export async function saveNapkin(napkin) {
  return await withErrorHandling(async () => {
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
  }, 'saveNapkin', { rethrow: true });
}

export async function loadNapkinById(id) {
  return await withErrorHandling(async () => {
    const raw = await AsyncStorage.getItem(`napkin:${id}`);
    return raw ? JSON.parse(raw) : null;
  }, 'loadNapkinById', { rethrow: true });
}

export async function deleteNapkin(id) {
  return await withErrorHandling(async () => {
    await AsyncStorage.removeItem(`napkin:${id}`);
    const index = await loadIndex();
    const next = index.filter((n) => n.id !== id);
    await saveIndex(next);
  }, 'deleteNapkin', { rethrow: true });
}

export async function renameNapkin(id, name) {
  return await withErrorHandling(async () => {
    const napkin = await loadNapkinById(id);
    if (!napkin) return;
    napkin.name = name;
    napkin.nameIsCustom = true;
    await saveNapkin(napkin);
  }, 'renameNapkin', { rethrow: true });
}

export async function createEmptyNapkin() {
  return await withErrorHandling(async () => {
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
  }, 'createEmptyNapkin', { rethrow: true });
}


