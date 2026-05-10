import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'photoscleaner.decisions.v1';

export type StoredDecisions = {
  decidedIds: string[];
  pendingDeleteIds: string[];
};

const empty: StoredDecisions = { decidedIds: [], pendingDeleteIds: [] };

export async function loadDecisions(): Promise<StoredDecisions> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return empty;
    const parsed = JSON.parse(json) as Partial<StoredDecisions>;
    if (!Array.isArray(parsed.decidedIds) || !Array.isArray(parsed.pendingDeleteIds)) {
      return empty;
    }
    return {
      decidedIds: parsed.decidedIds,
      pendingDeleteIds: parsed.pendingDeleteIds,
    };
  } catch (e) {
    console.warn('[PhotosCleaner] loadDecisions failed', e);
    return empty;
  }
}

export async function saveDecisions(state: StoredDecisions): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[PhotosCleaner] saveDecisions failed', e);
  }
}

export async function clearStoredDecisions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[PhotosCleaner] clearStoredDecisions failed', e);
  }
}
