import { getFloorForArea } from './floor';

/**
 * 事件房：事件池、抽取与结局结算。
 *
 * 流程：进入事件房时由前端抽取事件写入 `$当前事件`；玩家在场景中自由行动，
 * LLM 在结局达成时写入 `判定结果`（结局一/结局二/结局三）；前端在解析 AI 回复时
 * 调用 {@link applyEventVerdictSettlement} 结算对应结局，离开事件房时清空两者。
 * 抽到的事件记入 `$已触发事件`（本局记录，重生时清空），同一局内不会重复出现。
 *
 * 事件名需与世界书 `EJS事件` 中的事件池、以及同名世界书条目保持一致。
 */

export const EVENT_VERDICTS = ['结局一', '结局二', '结局三'] as const;
export type EventVerdict = (typeof EVENT_VERDICTS)[number];

export const GLOBAL_EVENT_POOL: readonly string[] = ['无名拘束台', '欲之熔炉', '漫游的领主', '空间褶皱', '迷失的冒险者', '大转盘', '扭蛋机', '占卜'];

export const FLOOR_EVENT_POOL: Readonly<Record<string, readonly string[]>> = {
  第一层: ['寄生共生', '黏人的幼体', '发情季', '沼泽盲摸'],
  第二层: ['禁书抄写', '校规修订', '补考'],
  第三层: ['奴隶拍卖', '刑罚转化', '鞭笞重铸', '代刑'],
  第四层: ['假面互换', '借梦', '御膳', '七宗罪'],
  第五层: ['圣痕授予', '献贞', '神之种', '净化与堕落'],
};

export const AREA_EVENT_POOL: Readonly<Record<string, readonly string[]>> = {
  // 第一层 · 野性粘液层
  粘液之沼: ['喷浆果丛'],
  发情迷雾森林: [],
  喷精泉眼: [],
  触手菌窟: ['菌丝传讯'],
  肉欲食人花圃: [],
  // 第二层 · 禁忌学院层
  禁忌图书馆: ['禁书借阅'],
  呻吟阅览室: [],
  催情墨染湖: ['墨纹改写'],
  性癖记录馆: [],
  淫乱教职工宿舍: ['宿舍的姐妹'],
  // 第三层 · 苦痛支配层
  欲望监狱: ['感官剥夺室'],
  吸血鬼古堡: ['活体酒窖'],
  调教审判庭: ['罪与罚天平'],
  触手水牢: [],
  人偶工坊: ['替身人偶'],
  // 第四层 · 扭曲宫廷层
  虚空宫殿: [],
  镜之舞厅: ['镜中他我'],
  双子寝宫: ['共梦'],
  春梦回廊: [],
  极乐宴会厅: ['暴食契约'],
  // 第五层 · 神域亵渎层
  交媾祭坛: [],
  圣水之海: [],
  苦修之路: [],
  神谕淫纹室: ['强制烙印', '欲望显现'],
  女神的产房: ['脐带连接'],
};

/** 三层事件池的抽取权重；某层没有可抽事件时，权重并入其它仍有事件的池（优先楼层池）。 */
export const EVENT_TIER_WEIGHTS = { global: 30, floor: 45, area: 25 } as const;

const ALL_EVENT_NAMES = new Set<string>([
  ...GLOBAL_EVENT_POOL,
  ...Object.values(FLOOR_EVENT_POOL).flat(),
  ...Object.values(AREA_EVENT_POOL).flat(),
]);

export const isDungeonEvent = (name: string): boolean => ALL_EVENT_NAMES.has(name);

const pickFrom = (pool: readonly string[], random: () => number): string | null =>
  pool.length > 0 ? pool[Math.floor(random() * pool.length)]! : null;

/** 读取本局已触发事件（存档中的 `$已触发事件`），容忍非法值。 */
export const normalizeTriggeredEvents = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
    : [];

/**
 * 为当前区域抽取一个事件。
 * 本局已触发的事件不会再次出现；只有当前区域能触发的事件（全楼层 + 本层 + 本区域）全部触发过后，才允许重复。
 */
export const pickEventForArea = (
  area: string,
  triggeredEvents: readonly string[] = [],
  random: () => number = Math.random,
): string | null => {
  const floorName = getFloorForArea(area) ?? '';
  const fullPools = [GLOBAL_EVENT_POOL, FLOOR_EVENT_POOL[floorName] ?? [], AREA_EVENT_POOL[area] ?? []];
  const triggered = new Set(triggeredEvents);
  const unseenPools = fullPools.map(pool => pool.filter(name => !triggered.has(name)));
  const allExhausted = unseenPools.every(pool => pool.length === 0);
  const [globalPool, floorPool, areaPool] = allExhausted ? fullPools : unseenPools;

  const globalTier = { pool: globalPool!, weight: EVENT_TIER_WEIGHTS.global as number };
  const floorTier = { pool: floorPool!, weight: EVENT_TIER_WEIGHTS.floor as number };
  const areaTier = { pool: areaPool!, weight: EVENT_TIER_WEIGHTS.area as number };
  const tiers = [globalTier, floorTier, areaTier];
  // 空池的权重按 楼层 → 全楼层 → 区域 的顺序并入第一个仍有事件的池
  const fallbackOrder = [floorTier, globalTier, areaTier];
  for (const tier of tiers) {
    if (tier.pool.length > 0) continue;
    const receiver = fallbackOrder.find(candidate => candidate.pool.length > 0);
    if (receiver) receiver.weight += tier.weight;
    tier.weight = 0;
  }

  const available = tiers.filter(tier => tier.pool.length > 0 && tier.weight > 0);
  const totalWeight = available.reduce((sum, tier) => sum + tier.weight, 0);
  if (totalWeight <= 0) return null;
  let roll = random() * totalWeight;
  for (const tier of available) {
    roll -= tier.weight;
    if (roll <= 0) return pickFrom(tier.pool, random);
  }
  return pickFrom(available[available.length - 1]!.pool, random);
};

/** 容忍 AI 写成 "结局一（沉溺）" 之类的变体，只取开头的结局标识。 */
export const normalizeEventVerdict = (value: unknown): EventVerdict | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return EVENT_VERDICTS.find(verdict => text.startsWith(verdict)) ?? null;
};

/**
 * 在 AI 回复解析出的 MVU 数据上锁定事件结局。
 * - 只在 `判定结果` 从空变为有效结局的那一轮生效（以解析基准楼层为准，重 roll / 编辑会基于同一基准重新判定，不会重复结算）。
 * - 已判定的结果锁定，AI 不能改写；非事件中或写入非法值时回退。
 * - 新判定的结局写入 `$事件操作 = { 阶段: '待结算' }`，由 GameView 按 events/eventOutcomes.ts 结算奖励与代价
 *   （GameView 掌握生命上限被动、奖励池等上下文）。
 */
export function applyEventVerdictSettlement(nextMvuData: any, baseMvuData: any): void {
  const sd = nextMvuData?.stat_data;
  if (!sd || typeof sd !== 'object') return;

  const previousVerdict = normalizeEventVerdict(baseMvuData?.stat_data?.判定结果);
  const eventName = typeof sd.$当前事件 === 'string' ? sd.$当前事件.trim() : '';

  if (previousVerdict || !isDungeonEvent(eventName)) {
    sd.判定结果 = previousVerdict ?? '';
    // $事件操作 由前端维护，AI 回复不能改动
    if (baseMvuData?.stat_data && Object.prototype.hasOwnProperty.call(baseMvuData.stat_data, '$事件操作')) {
      sd.$事件操作 = JSON.parse(JSON.stringify(baseMvuData.stat_data.$事件操作));
    }
    return;
  }

  const verdict = normalizeEventVerdict(sd.判定结果);
  sd.判定结果 = verdict ?? '';
  if (!verdict) return;

  sd.$事件操作 = { 事件: eventName, 结局: verdict, 阶段: '待结算', 数据: '' };
}
