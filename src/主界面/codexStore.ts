import type { CardData, EffectType } from './types';

export interface CodexEnemyEncounter {
  name: string;
  floor: number;
  area: string;
  firstSeenAt: number;
  lastSeenAt: number;
  times: number;
}

export interface CodexState {
  version: 1;
  cards: string[];
  relics: string[];
  effects: string[];
  enemies: CodexEnemyEncounter[];
}

const CODEX_STORAGE_KEY = 'dungeon.codex.v1';

const createDefaultCodexState = (): CodexState => ({
  version: 1,
  cards: [],
  relics: [],
  effects: [],
  enemies: [],
});

const hasBrowserStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const toUniqueStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

const sanitizeEnemyEncounters = (value: unknown): CodexEnemyEncounter[] => {
  if (!Array.isArray(value)) return [];
  const dedup = new Map<string, CodexEnemyEncounter>();

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Partial<CodexEnemyEncounter>;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) continue;
    const area = typeof raw.area === 'string' && raw.area.trim() ? raw.area.trim() : '未知区域';
    const floorNum = Math.max(1, Math.floor(Number(raw.floor ?? 1)));
    const firstSeenAt = Math.max(0, Math.floor(Number(raw.firstSeenAt ?? Date.now())));
    const lastSeenAt = Math.max(firstSeenAt, Math.floor(Number(raw.lastSeenAt ?? firstSeenAt)));
    const times = Math.max(1, Math.floor(Number(raw.times ?? 1)));
    const key = `${name}@@${floorNum}@@${area}`;

    const existing = dedup.get(key);
    if (!existing) {
      dedup.set(key, {
        name,
        floor: floorNum,
        area,
        firstSeenAt,
        lastSeenAt,
        times,
      });
      continue;
    }

    existing.firstSeenAt = Math.min(existing.firstSeenAt, firstSeenAt);
    existing.lastSeenAt = Math.max(existing.lastSeenAt, lastSeenAt);
    existing.times = Math.max(1, existing.times + times);
  }

  return Array.from(dedup.values());
};

const parseCodexState = (raw: unknown): CodexState => {
  if (!raw || typeof raw !== 'object') return createDefaultCodexState();
  const data = raw as Partial<CodexState>;
  return {
    version: 1,
    cards: toUniqueStringArray(data.cards),
    relics: toUniqueStringArray(data.relics),
    effects: toUniqueStringArray(data.effects),
    enemies: sanitizeEnemyEncounters(data.enemies),
  };
};

export function loadCodexState(): CodexState {
  if (!hasBrowserStorage()) return createDefaultCodexState();
  try {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY);
    if (!raw) return createDefaultCodexState();
    return parseCodexState(JSON.parse(raw));
  } catch {
    return createDefaultCodexState();
  }
}

function saveCodexState(next: CodexState) {
  if (!hasBrowserStorage()) return;
  try {
    localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota/storage errors
  }
}

const normalizeCardId = (input: string | Pick<CardData, 'id'> | null | undefined): string => {
  if (!input) return '';
  if (typeof input === 'string') return input.trim();
  return typeof input.id === 'string' ? input.id.trim() : '';
};

const normalizeEffectType = (input: string | EffectType | null | undefined): string => {
  if (!input) return '';
  return String(input).trim();
};

export function recordEncounteredCards(cards: Array<string | Pick<CardData, 'id'> | null | undefined>) {
  const normalized = cards
    .map((item) => normalizeCardId(item))
    .filter((item) => item.length > 0);
  if (normalized.length === 0) return;

  const state = loadCodexState();
  const before = state.cards.length;
  const set = new Set(state.cards);
  for (const id of normalized) set.add(id);
  if (set.size === before) return;
  state.cards = Array.from(set);
  saveCodexState(state);
}

type RelicIdentity = { id: string };

const normalizeRelicId = (input: string | RelicIdentity | null | undefined): string => {
  if (!input) return '';
  if (typeof input === 'string') return input.trim();
  return typeof input.id === 'string' ? input.id.trim() : '';
};

export function recordEncounteredRelics(relics: Array<string | RelicIdentity | null | undefined>) {
  const normalized = relics
    .map((item) => normalizeRelicId(item))
    .filter((item) => item.length > 0);
  if (normalized.length === 0) return;

  const state = loadCodexState();
  const before = state.relics.length;
  const set = new Set(state.relics);
  for (const id of normalized) set.add(id);
  if (set.size === before) return;
  state.relics = Array.from(set);
  saveCodexState(state);
}

export function recordEncounteredEffects(effectTypes: Array<string | EffectType | null | undefined>) {
  const normalized = effectTypes
    .map((item) => normalizeEffectType(item))
    .filter((item) => item.length > 0);
  if (normalized.length === 0) return;

  const state = loadCodexState();
  const before = state.effects.length;
  const set = new Set(state.effects);
  for (const type of normalized) set.add(type);
  if (set.size === before) return;
  state.effects = Array.from(set);
  saveCodexState(state);
}

export function recordEncounteredEnemy(payload: { name: string; floor?: number; area?: string }) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) return;
  const floor = Math.max(1, Math.floor(Number(payload.floor ?? 1)));
  const area = typeof payload.area === 'string' && payload.area.trim() ? payload.area.trim() : '未知区域';
  const now = Date.now();
  const key = `${name}@@${floor}@@${area}`;

  const state = loadCodexState();
  const index = state.enemies.findIndex((entry) => `${entry.name}@@${entry.floor}@@${entry.area}` === key);
  if (index >= 0) {
    const found = state.enemies[index]!;
    found.lastSeenAt = now;
    found.times = Math.max(1, Math.floor(Number(found.times ?? 1))) + 1;
    saveCodexState(state);
    return;
  }

  state.enemies.push({
    name,
    floor,
    area,
    firstSeenAt: now,
    lastSeenAt: now,
    times: 1,
  });
  saveCodexState(state);
}
