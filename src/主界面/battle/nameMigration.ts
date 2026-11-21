// ═══════════════════════════════════════════════════════════════
//  存档名称迁移：卡牌 / 主动技 / 圣遗物改名、卡牌改回主动技后，
//  在读取 stat_data 时把旧名称就地替换为新名称，保证旧存档可用。
// ═══════════════════════════════════════════════════════════════

import { getActiveSkillByName } from './activeSkillRegistry';
import { CARD_NAME_ALIASES, getCardByName } from './cardRegistry';
import { RELIC_LEGACY_NAME_ALIASES } from './relicRegistry';

/** 原作为主动技、曾被错误做成卡牌的旧卡名（迁移时从卡组移到主动技栏） */
const CARD_TO_ACTIVE_SKILL_NAMES: ReadonlySet<string> = new Set([
  '结晶', '淘金', '抛光', '购物', '财富之力',
  '手里剑', '瞄准要害', '本能反应',
  '电池', '排斥', '大电池', '恐吓',
  '透支魔力',
]);

/** 已移除、不再同步的圣遗物 */
const REMOVED_RELIC_NAMES: ReadonlySet<string> = new Set(['VIP卡', 'system_wealth_relic_01']);

const toStringArray = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.map(item => (typeof item === 'string' ? item : '')) : null;

/**
 * 就地迁移 stat_data 中的旧名称。
 * @returns 是否发生了改动
 */
export function migrateLegacyBattleNames(stat: Record<string, any> | null | undefined): boolean {
  if (!stat || typeof stat !== 'object') return false;
  let changed = false;

  const deck = toStringArray(stat._技能);
  const actives = toStringArray(stat.$主动);
  const nextActives = actives ? [...actives] : null;

  if (deck) {
    const nextDeck = deck.map((name) => {
      const trimmed = name.trim();
      if (!trimmed) return name;
      if (CARD_TO_ACTIVE_SKILL_NAMES.has(trimmed) && !getCardByName(trimmed)) {
        const skill = getActiveSkillByName(trimmed);
        if (skill && nextActives && !nextActives.includes(skill.name)) {
          const emptyIdx = nextActives.findIndex(entry => !entry.trim());
          if (emptyIdx >= 0) nextActives[emptyIdx] = skill.name;
        }
        return '';
      }
      return CARD_NAME_ALIASES.get(trimmed) ?? name;
    });
    if (nextDeck.some((name, idx) => name !== deck[idx])) {
      stat._技能 = nextDeck;
      changed = true;
    }
  }

  if (nextActives && actives) {
    const normalized = nextActives.map((name) => {
      const trimmed = name.trim();
      if (!trimmed) return name;
      return getActiveSkillByName(trimmed)?.name ?? name;
    });
    if (normalized.some((name, idx) => name !== actives[idx])) {
      stat.$主动 = normalized;
      changed = true;
    }
  }

  const inventory = stat.携带的物品;
  const relics = inventory && typeof inventory === 'object' ? inventory._圣遗物 : null;
  if (relics && typeof relics === 'object' && !Array.isArray(relics)) {
    const nextRelics: Record<string, number> = {};
    let relicChanged = false;
    for (const [key, value] of Object.entries(relics as Record<string, unknown>)) {
      if (REMOVED_RELIC_NAMES.has(key)) {
        relicChanged = true;
        continue;
      }
      const nextKey = RELIC_LEGACY_NAME_ALIASES.get(key) ?? key;
      if (nextKey !== key) relicChanged = true;
      const count = Number(value ?? 0);
      nextRelics[nextKey] = (nextRelics[nextKey] ?? 0) + (Number.isFinite(count) ? count : 0);
    }
    if (relicChanged) {
      inventory._圣遗物 = nextRelics;
      changed = true;
    }
  }

  return changed;
}
