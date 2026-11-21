import type { RelicRarity } from '../battle/relicRegistry';
import type { Random } from './eventSettlement';
import type { MinigameIconKey } from './minigameAssets';

/**
 * 前端化事件的小游戏数据：大转盘、扭蛋机、占卜。
 * 奖池集中在这里，调整数值只需改本文件。
 */

export type MinigamePrize =
  | { kind: 'nothing' }
  | { kind: 'gold'; min: number; max: number }
  | { kind: 'heal'; ratio: number }
  | { kind: 'loseHp'; ratio: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'mana'; amount: number }
  | { kind: 'maxDice'; amount: number }
  | { kind: 'relic'; rarity: RelicRarity }
  | { kind: 'consumable'; name: string; description: string; heal: number }
  | { kind: 'curse' };

export interface WeightedPrize {
  id: string;
  label: string;
  prize: MinigamePrize;
  weight: number;
  /** 奖励图标（见 minigameAssets.ts） */
  icon: MinigameIconKey;
}

export const rollWeighted = <T extends { weight: number }>(items: readonly T[], random: Random = Math.random): T => {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
};

export const rollGoldAmount = (prize: Extract<MinigamePrize, { kind: 'gold' }>, random: Random = Math.random): number =>
  prize.min + Math.floor(random() * (prize.max - prize.min + 1));

// ── 大转盘 ──────────────────────────────────────────────────────

export interface WheelSector extends WeightedPrize {
  jackpot?: boolean;
  /** 扇区底色（CSS 颜色） */
  color: string;
}

/** 单次转盘花费：2 + floor(楼层 / 2)，即第一层到第五层依次为 2 / 3 / 3 / 4 / 4 */
export const getWheelSpinCost = (floor: number): number => 2 + Math.floor(Math.max(1, floor) / 2);

/** 转盘扇区随楼层变化：数值按楼层放大，头奖在前两层为稀有圣遗物，之后为传奇圣遗物 */
export const buildWheelSectors = (floor: number): WheelSector[] => {
  const f = Math.max(1, Math.min(5, Math.floor(floor)));
  const cost = getWheelSpinCost(f);
  return [
    { id: 'jackpot', label: f <= 2 ? '头奖·稀有圣遗物' : '头奖·传奇圣遗物', prize: { kind: 'relic', rarity: f <= 2 ? '稀有' : '传奇' }, weight: 3, jackpot: true, color: '#b8860b', icon: 'crown' },
    { id: 'nothing', label: '谢谢惠顾', prize: { kind: 'nothing' }, weight: 20, color: '#2a1b2e', icon: 'hourglass' },
    { id: 'refund', label: `${cost}金币`, prize: { kind: 'gold', min: cost, max: cost }, weight: 16, color: '#5a3a12', icon: 'coin' },
    { id: 'heal', label: '回复30%生命', prize: { kind: 'heal', ratio: 0.3 }, weight: 14, color: '#2f4a2a', icon: 'elixir' },
    { id: 'double', label: `${cost * 2}金币`, prize: { kind: 'gold', min: cost * 2, max: cost * 2 }, weight: 8, color: '#6b4a14', icon: 'coins' },
    { id: 'max_hp', label: `生命上限+${2 + f}`, prize: { kind: 'maxHp', amount: 2 + f }, weight: 10, color: '#5a1f2a', icon: 'rubyHeart' },
    { id: 'prank', label: '兔女郎的恶作剧', prize: { kind: 'loseHp', ratio: 0.1 }, weight: 8, color: '#3b1238', icon: 'prank' },
    { id: 'mana', label: '魔量+1', prize: { kind: 'mana', amount: 1 }, weight: 7, color: '#1f2f5a', icon: 'amethyst' },
    { id: 'candy', label: '兔耳软糖', prize: { kind: 'consumable', name: '兔耳软糖', description: '荷官塞给你的粉色软糖，吃下能恢复体力。', heal: 6 + 2 * f }, weight: 9, color: '#5a2a4a', icon: 'candy' },
    { id: 'relic', label: '普通圣遗物', prize: { kind: 'relic', rarity: '普通' }, weight: 8, color: '#3a2a5a', icon: 'chest' },
  ];
};

// ── 扭蛋机 ──────────────────────────────────────────────────────

export interface GachaMachine {
  id: 'small' | 'big';
  label: string;
  cost: number;
  prizes: WeightedPrize[];
}

export const GACHA_MACHINES: readonly GachaMachine[] = [
  {
    id: 'small',
    label: '精密小扭蛋机',
    cost: 2,
    prizes: [
      { id: 'nothing', label: '空扭蛋', prize: { kind: 'nothing' }, weight: 18, icon: 'hourglass' },
      { id: 'gold', label: '几枚金币', prize: { kind: 'gold', min: 1, max: 4 }, weight: 30, icon: 'coin' },
      { id: 'heal', label: '回复15%生命', prize: { kind: 'heal', ratio: 0.15 }, weight: 18, icon: 'elixir' },
      { id: 'max_hp', label: '生命上限+2', prize: { kind: 'maxHp', amount: 2 }, weight: 12, icon: 'rubyHeart' },
      { id: 'candy', label: '小扭蛋糖', prize: { kind: 'consumable', name: '小扭蛋糖', description: '扭蛋里滚出的糖果，吃下能恢复一点体力。', heal: 6 }, weight: 16, icon: 'candy' },
      { id: 'mana', label: '魔量+1', prize: { kind: 'mana', amount: 1 }, weight: 4, icon: 'amethyst' },
    ],
  },
  {
    id: 'big',
    label: '限金大型扭蛋机',
    cost: 5,
    prizes: [
      { id: 'gold', label: '一袋金币', prize: { kind: 'gold', min: 3, max: 10 }, weight: 22, icon: 'coins' },
      { id: 'heal', label: '回复40%生命', prize: { kind: 'heal', ratio: 0.4 }, weight: 14, icon: 'elixir' },
      { id: 'max_hp', label: '生命上限+5', prize: { kind: 'maxHp', amount: 5 }, weight: 14, icon: 'rubyHeart' },
      { id: 'mana', label: '魔量+1', prize: { kind: 'mana', amount: 1 }, weight: 12, icon: 'amethyst' },
      { id: 'relic', label: '普通圣遗物', prize: { kind: 'relic', rarity: '普通' }, weight: 16, icon: 'chest' },
      { id: 'rare_relic', label: '稀有圣遗物', prize: { kind: 'relic', rarity: '稀有' }, weight: 5, icon: 'crown' },
      { id: 'max_dice', label: '最大点数+1', prize: { kind: 'maxDice', amount: 1 }, weight: 2, icon: 'dice' },
      { id: 'candy', label: '大扭蛋糖', prize: { kind: 'consumable', name: '大扭蛋糖', description: '拳头大的扭蛋里装着的糖果，吃下能恢复不少体力。', heal: 15 }, weight: 5, icon: 'candy' },
      { id: 'curse', label: '颤动的扭蛋', prize: { kind: 'curse' }, weight: 10, icon: 'curseCard' },
    ],
  },
];

// ── 占卜 ────────────────────────────────────────────────────────

export const DIVINATION_GRID_SIZE = 11;
const CORNER_CUT = 3;

/** 四个角各切掉 3+2+1=6 格的阶梯三角，剩余 97 格 */
export const isDivinationCell = (x: number, y: number): boolean => {
  const n = DIVINATION_GRID_SIZE;
  if (x < 0 || y < 0 || x >= n || y >= n) return false;
  const limit = CORNER_CUT - 1;
  const inCorner = (dx: number, dy: number) => dx + dy <= limit;
  return !(inCorner(x, y) || inCorner(n - 1 - x, y) || inCorner(x, n - 1 - y) || inCorner(n - 1 - x, n - 1 - y));
};

export type DivinationItemKind = 'jackpot' | 'card' | 'gold';
export type DivinationCardRarity = '普通' | '稀有' | '诅咒';

export interface DivinationItem {
  id: string;
  kind: DivinationItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  cardRarity?: DivinationCardRarity;
  gold?: number;
}

export interface DivinationState {
  items: DivinationItem[];
  /** 已揭开的格子，形如 "x,y" */
  revealed: string[];
  usesLeft: number;
  /** 本次占卜的总次数（3 或 6） */
  totalUses: number;
  finished: boolean;
}

export const cellKey = (x: number, y: number) => `${x},${y}`;

const itemCells = (item: Pick<DivinationItem, 'x' | 'y' | 'w' | 'h'>): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  for (let dy = 0; dy < item.h; dy += 1) for (let dx = 0; dx < item.w; dx += 1) cells.push([item.x + dx, item.y + dy]);
  return cells;
};

export const getDivinationItemCells = itemCells;

/** 随机生成水晶球的物品布局：大奖 4×4、卡牌 2×2×4（2 普通 / 1 稀有 / 1 诅咒）、大金币 1×2×3、小金币 1×1×6 */
export const generateDivinationLayout = (floor: number, random: Random = Math.random): DivinationItem[] => {
  const f = Math.max(1, Math.min(5, Math.floor(floor)));
  const specs: Array<Omit<DivinationItem, 'x' | 'y' | 'id'>> = [
    { kind: 'jackpot', w: 4, h: 4 },
    { kind: 'card', w: 2, h: 2, cardRarity: '普通' },
    { kind: 'card', w: 2, h: 2, cardRarity: '普通' },
    { kind: 'card', w: 2, h: 2, cardRarity: '稀有' },
    { kind: 'card', w: 2, h: 2, cardRarity: '诅咒' },
    ...Array.from({ length: 3 }, () => ({ kind: 'gold' as const, w: 1, h: 2, gold: 3 + 2 * f })),
    ...Array.from({ length: 6 }, () => ({ kind: 'gold' as const, w: 1, h: 1, gold: 1 + f })),
  ];
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const occupied = new Set<string>();
    const placed: DivinationItem[] = [];
    let ok = true;
    for (const [index, spec] of specs.entries()) {
      // 1×2 的大金币随机横放或竖放
      const rotate = spec.w !== spec.h && random() < 0.5;
      const w = rotate ? spec.h : spec.w;
      const h = rotate ? spec.w : spec.h;
      const positions: Array<[number, number]> = [];
      for (let y = 0; y <= DIVINATION_GRID_SIZE - h; y += 1) {
        for (let x = 0; x <= DIVINATION_GRID_SIZE - w; x += 1) {
          const cells = itemCells({ x, y, w, h });
          if (cells.every(([cx, cy]) => isDivinationCell(cx, cy) && !occupied.has(cellKey(cx, cy)))) positions.push([x, y]);
        }
      }
      if (positions.length === 0) {
        ok = false;
        break;
      }
      const [x, y] = positions[Math.floor(random() * positions.length)]!;
      const item: DivinationItem = { ...spec, id: `item_${index}`, x, y, w, h };
      for (const [cx, cy] of itemCells(item)) occupied.add(cellKey(cx, cy));
      placed.push(item);
    }
    if (ok) return placed;
  }
  return [];
};

export const createDivinationState = (floor: number, uses: number, random: Random = Math.random): DivinationState => ({
  items: generateDivinationLayout(floor, random),
  revealed: [],
  usesLeft: Math.max(0, Math.floor(uses)),
  totalUses: Math.max(0, Math.floor(uses)),
  finished: false,
});

/** 揭开以 (cx, cy) 为中心的 size×size 区域（只计入水晶球内的格子） */
export const revealDivinationArea = (revealed: readonly string[], cx: number, cy: number, size: 1 | 3): string[] => {
  const next = new Set(revealed);
  const radius = size === 3 ? 1 : 0;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (isDivinationCell(x, y)) next.add(cellKey(x, y));
    }
  }
  return Array.from(next);
};

export const isDivinationItemRevealed = (item: DivinationItem, revealed: ReadonlySet<string>): boolean =>
  itemCells(item).every(([x, y]) => revealed.has(cellKey(x, y)));

export const normalizeDivinationState = (value: unknown): DivinationState | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.items) || raw.items.length === 0) return null;
  return {
    items: raw.items as DivinationItem[],
    revealed: Array.isArray(raw.revealed) ? raw.revealed.filter((item): item is string => typeof item === 'string') : [],
    usesLeft: Math.max(0, Math.floor(Number(raw.usesLeft) || 0)),
    totalUses: Math.max(0, Math.floor(Number(raw.totalUses) || Number(raw.usesLeft) || 0)),
    finished: raw.finished === true,
  };
};

export const getDivinationItemIcon = (item: DivinationItem): MinigameIconKey => {
  if (item.kind === 'jackpot') return 'crown';
  if (item.kind === 'card') return item.cardRarity === '诅咒' ? 'curseCard' : 'cardBack';
  return item.w * item.h > 1 ? 'coins' : 'coin';
};

export const describeDivinationItem = (item: DivinationItem): string => {
  if (item.kind === 'jackpot') return '大奖·稀有圣遗物';
  if (item.kind === 'card') return item.cardRarity === '诅咒' ? '诅咒牌' : `${item.cardRarity}卡牌奖励`;
  return `${item.gold ?? 0}金币`;
};
