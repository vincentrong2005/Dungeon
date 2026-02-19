// ═══════════════════════════════════════════════════════════════
//  卡牌库 — 所有卡牌的中央注册表
//  UI 从 MVU 变量 _技能（string[]）中读取卡名，
//  再用 getCardByName() 查找对应 CardData。
// ═══════════════════════════════════════════════════════════════

import { CardType, EffectType, type CardData } from '../types';

// ── 基础卡牌定义 ────────────────────────────────────────────────

/** 普通物理攻击 */
const 普通物理攻击: CardData = {
  id: 'basic_physical',
  name: '普通物理攻击',
  type: CardType.PHYSICAL,
  category: '基础',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '最基本的物理攻击。以拳头或武器直接造成与点数等量的伤害。',
};

/** 普通魔法攻击 */
const 普通魔法攻击: CardData = {
  id: 'basic_magic',
  name: '普通魔法攻击',
  type: CardType.MAGIC,
  category: '基础',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.5 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '释放一道魔力光弹。消耗 2 MP，造成1.5倍的伤害。',
};

/** 普通护盾 */
const 普通护盾: CardData = {
  id: 'basic_shield',
  name: '普通护盾',
  type: CardType.FUNCTION,
  category: '基础',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.ARMOR,
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,           // 护甲层数 = FinalPoint * 1.0
    },
  ],
  description: '防御姿态。为自身施加等同于点数的护甲。',
};

/** 普通闪避 */
const 普通闪避: CardData = {
  id: 'basic_dodge',
  name: '普通闪避',
  type: CardType.DODGE,
  category: '基础',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '侧身回避敌方的攻击。若敌方攻击点数高于我方则攻击无效。',
};

// ── 敌人卡牌定义 ────────────────────────────────────────────────

/** 冲撞 — 游荡粘液球等魔物的基础物理攻击 */
const 冲撞: CardData = {
  id: 'enemy_charge',
  name: '冲撞',
  type: CardType.PHYSICAL,
  category: '敌人',
  manaCost: 0,
  calculation: { multiplier: 1, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '用身体猛烈冲撞对手。',
};

/** 粘液闪避 — 与普通闪避完全一致 */
const 粘液闪避: CardData = {
  id: 'enemy_slime_dodge',
  name: '粘液闪避',
  type: CardType.DODGE,
  category: '敌人',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '利用柔软的粘液身体扭曲变形以回避攻击。',
};

/** 回复 — 回复自身掷出点数等量的血量 */
const 回复: CardData = {
  id: 'enemy_heal',
  name: '回复',
  type: CardType.FUNCTION,
  category: '敌人',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'heal',
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,           // 回复量 = FinalPoint * 1.0
    },
  ],
  description: '凝聚体内的粘液能量，回复自身等同于掷出点数的血量。',
};

// ── 卡牌注册表 ──────────────────────────────────────────────────

/**
 * 全部卡牌以 name 为键存储。
 * 后续新增卡牌只需在此处添加并注册即可。
 */
const CARD_REGISTRY: ReadonlyMap<string, CardData> = new Map<string, CardData>([
  [普通物理攻击.name, 普通物理攻击],
  [普通魔法攻击.name, 普通魔法攻击],
  [普通护盾.name, 普通护盾],
  [普通闪避.name, 普通闪避],
  [冲撞.name, 冲撞],
  [粘液闪避.name, 粘液闪避],
  [回复.name, 回复],
]);

// ── 公共 API ────────────────────────────────────────────────────

/** 根据卡名查找卡牌数据，不存在则返回 undefined */
export function getCardByName(name: string): CardData | undefined {
  return CARD_REGISTRY.get(name);
}

/** 批量将卡名数组转换为 CardData 数组（跳过未找到的卡名） */
export function resolveCardNames(names: string[]): CardData[] {
  return names
    .map((n) => CARD_REGISTRY.get(n))
    .filter((c): c is CardData => c !== undefined);
}

/** 获取卡牌库中所有卡牌名称 */
export function getAllCardNames(): string[] {
  return [...CARD_REGISTRY.keys()];
}

/** 获取卡牌库中所有卡牌数据 */
export function getAllCards(): CardData[] {
  return [...CARD_REGISTRY.values()];
}
