import { CardType, type ActiveSkillData } from '../types';

const 重来问号: ActiveSkillData = {
  id: 'active_basic_reroll_self',
  name: '重来！',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '重掷自己的骰子',
};

const 你也重来问号: ActiveSkillData = {
  id: 'active_basic_reroll_enemy',
  name: '你也重来！',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '重掷对手的骰子',
};

const 抽牌: ActiveSkillData = {
  id: 'active_basic_draw',
  name: '抽牌',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 2,
  Cooldown: 1,
  description: '抽一张牌，若手牌满三张则随机替换一张',
};

const 防御问号: ActiveSkillData = {
  id: 'active_basic_guard',
  name: '防御！',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '增加2点护甲',
};

const 增幅: ActiveSkillData = {
  id: 'active_basic_boost',
  name: '增幅',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '我方骰子点数+1',
};

const 削弱: ActiveSkillData = {
  id: 'active_basic_weaken',
  name: '削弱',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '敌方骰子点数-1',
};

const 走光: ActiveSkillData = {
  id: 'active_basic_expose',
  name: '走光',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '使敌人的点数+3',
};

const 弹刀: ActiveSkillData = {
  id: 'active_basic_parry_blade',
  name: '弹刀',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 7,
  description: '获得持续1回合的1层结界',
};

const 涂鸦: ActiveSkillData = {
  id: 'active_basic_graffiti',
  name: '涂鸦',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 4,
  description: '将双方的骰子点数设为6',
};

const 疾跑: ActiveSkillData = {
  id: 'active_basic_sprint',
  name: '疾跑',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 0,
  maxUses: 4,
  description: '抽一张牌，若手牌满三张则随机替换一张。场限4次。',
};

const 洗牌魔法: ActiveSkillData = {
  id: 'active_basic_shuffle_magic',
  name: '洗牌魔法',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 3,
  description: '重新抽取你的卡牌',
};

const 无限增幅魔法: ActiveSkillData = {
  id: 'active_basic_infinite_amp_magic',
  name: '无限增幅魔法',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 0,
  description: '点数+1，每使用一次该卡牌，其本回合魔力消耗+1',
};

const 老虎机: ActiveSkillData = {
  id: 'active_basic_slot_machine',
  name: '命运骰轮',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 0,
  description: '重掷双方骰子，每使用一次该卡牌，其本回合魔力消耗+1',
};

const 和平: ActiveSkillData = {
  id: 'active_basic_peace',
  name: '和平',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 2,
  Cooldown: 3,
  description: '将双方的骰子点数设为0',
};

const 黄金宝箱: ActiveSkillData = {
  id: 'active_basic_golden_chest',
  name: '黄金宝箱',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 2,
  Cooldown: 6,
  description: '将手牌在本场战斗中替换为牌库中的随机稀有卡牌',
};

const 瞬时冻结: ActiveSkillData = {
  id: 'active_yanhan_flash_freeze',
  name: '瞬时冻结',
  type: CardType.ACTIVE,
  category: '严寒',
  rarity: '普通',
  manaCost: 2,
  Cooldown: 4,
  description: '施加1倍点数的寒冷，回合结束时清除对方所有寒冷',
};

const 等价交换: ActiveSkillData = {
  id: 'active_burn_equivalent_exchange',
  name: '等价交换',
  type: CardType.ACTIVE,
  category: '燃烧',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 6,
  description: '交换我方生命与魔力（不能超过上限）',
};

const 祭品: ActiveSkillData = {
  id: 'active_bloodpool_sacrifice',
  name: '祭品',
  type: CardType.ACTIVE,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 1,
  description: '自身获得3层流血与2层护甲，回复2点魔力。',
};

const 自救: ActiveSkillData = {
  id: 'active_bloodpool_self_rescue',
  name: '自救',
  type: CardType.ACTIVE,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 1,
  maxUses: 3,
  description: '恢复2点血量，血量低于50%回复量翻倍，每场战斗限3次',
};

const 悲喜交加: ActiveSkillData = {
  id: 'active_bloodpool_tragicomedy',
  name: '悲喜交加',
  type: CardType.ACTIVE,
  category: '血池',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 0,
  description: '交换当前生命值与已损生命值，每场战斗可在生命值高于50%和低于50%时各使用一次',
};

const 恶魔契约: ActiveSkillData = {
  id: 'active_bloodpool_demon_contract',
  name: '恶魔契约',
  type: CardType.ACTIVE,
  category: '血池',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 0,
  maxUsesPerTurn: 2,
  description: '自伤3，自身原始点数+2。本回合最多使用2次',
};

const 活性储存: ActiveSkillData = {
  id: 'active_bloodpool_vital_storage',
  name: '活性储存',
  type: CardType.ACTIVE,
  category: '血池',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 1,
  description: '自伤50%当前生命值并储存，再次使用则返还等量生命值',
};

const 解毒剂: ActiveSkillData = {
  id: 'active_alchemy_antidote',
  name: '解毒剂',
  type: CardType.ACTIVE,
  category: '炼金',
  rarity: '普通',
  manaCost: 2,
  Cooldown: 10,
  description: '清除自身所有负面状态，每清除1层回复1点生命',
};

const 提纯: ActiveSkillData = {
  id: 'active_alchemy_purify',
  name: '提纯',
  type: CardType.ACTIVE,
  category: '炼金',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  maxUses: 3,
  description: '在本场战斗中移除手牌中的一张牌，每场战斗限3次。',
};

const 物质分解: ActiveSkillData = {
  id: 'active_alchemy_decompose',
  name: '物质分解',
  type: CardType.ACTIVE,
  category: '炼金',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  maxUses: 3,
  description: '随机使一张非诅咒手牌在本场战斗中变为黑手印，获得1金币，回复5生命。每场战斗限3次。',
};

const 增值: ActiveSkillData = {
  id: 'active_alchemy_appreciate',
  name: '增值',
  type: CardType.ACTIVE,
  category: '炼金',
  rarity: '普通',
  manaCost: 3,
  Cooldown: 8,
  description: '选择一张手牌，将其一张复制品在本场战斗中置入弃牌堆。',
};

// ── 万象魔杖：可在战斗中切换成的初始主动技 ───────────────────────
export const OMNI_WAND_SKILL_ID = 'active_basic_omni_wand';
export const OMNI_WAND_FORM_IDS = [
  'active_basic_reroll_self',
  'active_basic_reroll_enemy',
  'active_basic_draw',
  'active_basic_guard',
  'active_basic_boost',
  'active_basic_weaken',
] as const;

const 万象魔杖: ActiveSkillData = {
  id: OMNI_WAND_SKILL_ID,
  name: '万象魔杖',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 0,
  description: '选择一个初始主动技，本场战斗中本技能变为该技能；可随时切换回万象魔杖。',
};

// ── 财富 ─────────────────────────────────────────────────────
const 结晶: ActiveSkillData = {
  id: 'active_wealth_crystal',
  name: '结晶',
  type: CardType.ACTIVE,
  category: '财富',
  rarity: '普通',
  manaCost: 3,
  Cooldown: 2,
  description: '获得6点护甲。',
};

const 淘金: ActiveSkillData = {
  id: 'active_wealth_pan_gold',
  name: '淘金',
  type: CardType.ACTIVE,
  category: '财富',
  rarity: '普通',
  manaCost: 4,
  Cooldown: 2,
  description: '获得0.5倍当前点数的金币；本场战斗第一次使用后，改为获得临时金币。',
};

const 抛光: ActiveSkillData = {
  id: 'active_wealth_polish',
  name: '抛光',
  type: CardType.ACTIVE,
  category: '财富',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 2,
  description: '获得2点护甲；本回合结束时护甲不会减半。',
};

const 讨价还价: ActiveSkillData = {
  id: 'active_wealth_bargain',
  name: '讨价还价',
  type: CardType.ACTIVE,
  category: '财富',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 0,
  useCondition: '需要至少1金币',
  description: '消耗1金币，获得2点护甲与1点魔力。',
};

const 财富之力: ActiveSkillData = {
  id: 'active_wealth_power',
  name: '财富之力',
  type: CardType.ACTIVE,
  category: '财富',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 0,
  useCondition: '需要至少1金币',
  description: '消耗1金币，原始点数+1；每回合第5次使用时，改为消耗所有金币并增加等量点数。',
};

// ── 暗影 ─────────────────────────────────────────────────────
const 投掷飞刀: ActiveSkillData = {
  id: 'active_shadow_throwing_knife',
  name: '投掷飞刀',
  type: CardType.ACTIVE,
  category: '暗影',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '对敌方造成1点物理伤害（受增伤加成）。',
};

const 瞄准要害: ActiveSkillData = {
  id: 'active_shadow_aim_weakness',
  name: '瞄准要害',
  type: CardType.ACTIVE,
  category: '暗影',
  rarity: '普通',
  manaCost: 2,
  Cooldown: 4,
  description: '对敌方施加0.5倍当前点数的敏感，持续1回合。',
};

const 本能反应: ActiveSkillData = {
  id: 'active_shadow_instinct',
  name: '本能反应',
  type: CardType.ACTIVE,
  category: '暗影',
  rarity: '普通',
  manaCost: 2,
  Cooldown: 5,
  description: '将最左侧手牌在本场战斗中变为随机一张闪避牌。',
};

// ── 破坏 ─────────────────────────────────────────────────────
const 蓄能魔晶: ActiveSkillData = {
  id: 'active_destruction_mana_crystal',
  name: '蓄能魔晶',
  type: CardType.ACTIVE,
  category: '破坏',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 1,
  description: '原始点数-1，获得1层蓄力。',
};

const 排斥: ActiveSkillData = {
  id: 'active_destruction_repel',
  name: '排斥',
  type: CardType.ACTIVE,
  category: '破坏',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 3,
  description: '本回合受到的伤害减半。',
};

const 高纯蓄能魔晶: ActiveSkillData = {
  id: 'active_destruction_pure_crystal',
  name: '高纯蓄能魔晶',
  type: CardType.ACTIVE,
  category: '破坏',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 0,
  maxUsesPerTurn: 4,
  description: '原始点数-1，获得1层蓄力；下回合开始时回复1点魔力。每回合限4次。',
};

const 恐吓: ActiveSkillData = {
  id: 'active_destruction_intimidate',
  name: '恐吓',
  type: CardType.ACTIVE,
  category: '破坏',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 4,
  description: '对方原始点数-2；若此时对方原始点数低于自身原始点数，将对方本回合的意图改为【普通闪避】。',
};

// ── 魔导 ─────────────────────────────────────────────────────
const 透支魔力: ActiveSkillData = {
  id: 'active_modao_overdraw',
  name: '透支魔力',
  type: CardType.ACTIVE,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 5,
  description: '回复10点魔力，获得3层魔力枯竭。',
};

// ── 燃烧 / 炼金（新移植）──────────────────────────────────────
const 余烬回燃: ActiveSkillData = {
  id: 'active_burn_rekindle',
  name: '余烬回燃',
  type: CardType.ACTIVE,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '清除双方所有燃烧，下回合开始时重新施加等量燃烧；清除自身所有寒冷。',
};

const 沙漏倒转: ActiveSkillData = {
  id: 'active_alchemy_hourglass_flip',
  name: '沙漏倒转',
  type: CardType.ACTIVE,
  category: '炼金',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 1,
  description: '交换敌方的燃烧与寒冷层数，交换敌方的中毒与流血层数（1层燃烧换2层寒冷，2层寒冷换1层燃烧）。',
};

// ── 新增：腐化 / 严寒 / 燃烧 / 财富 ─────────────────────────────
const 埋毒: ActiveSkillData = {
  id: 'active_corruption_bury_poison',
  name: '埋毒',
  type: CardType.ACTIVE,
  category: '腐化',
  rarity: '普通',
  manaCost: 3,
  Cooldown: 4,
  description: '对敌方施加2层中毒；敌方本回合不触发中毒。',
};

const 冰面: ActiveSkillData = {
  id: 'active_yanhan_ice_surface',
  name: '冰面',
  type: CardType.ACTIVE,
  category: '严寒',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 3,
  description: '双方原始点数×0.5。',
};

const 延缓: ActiveSkillData = {
  id: 'active_burn_delay',
  name: '延缓',
  type: CardType.ACTIVE,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 7,
  description: '本回合免疫所有非真实伤害；下回合开始时，每免疫1点伤害获得1层燃烧。',
};

const 典当: ActiveSkillData = {
  id: 'active_wealth_pawn',
  name: '典当',
  type: CardType.ACTIVE,
  category: '财富',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 1,
  maxUses: 2,
  description: '选择一张手牌，诅咒:消耗2金币并移除；普通:替换为【空白】；稀有:替换为【空白的空白】。每场战斗限2次。',
};

const ACTIVE_SKILL_REGISTRY: readonly ActiveSkillData[] = [
  重来问号,
  你也重来问号,
  抽牌,
  防御问号,
  增幅,
  削弱,
  走光,
  弹刀,
  涂鸦,
  疾跑,
  洗牌魔法,
  无限增幅魔法,
  老虎机,
  和平,
  黄金宝箱,
  瞬时冻结,
  等价交换,
  祭品,
  自救,
  悲喜交加,
  恶魔契约,
  活性储存,
  解毒剂,
  提纯,
  物质分解,
  增值,
  万象魔杖,
  结晶,
  淘金,
  抛光,
  讨价还价,
  财富之力,
  投掷飞刀,
  瞄准要害,
  本能反应,
  蓄能魔晶,
  排斥,
  高纯蓄能魔晶,
  恐吓,
  透支魔力,
  余烬回燃,
  沙漏倒转,
  埋毒,
  冰面,
  延缓,
  典当,
];

const LEGACY_ACTIVE_SKILL_NAME_ALIASES: ReadonlyMap<string, string> = new Map<string, string>([
  ['閲嶆潵锛?', 重来问号.name],
  ['浣犱篃閲嶆潵锛?', 你也重来问号.name],
  ['鎶界墝', 抽牌.name],
  ['闃插尽锛?', 防御问号.name],
  ['澧炲箙', 增幅.name],
  ['鍓婂急', 削弱.name],
  ['璧板厜', 走光.name],
  ['寮瑰垁', 弹刀.name],
  ['娑傞甫', 涂鸦.name],
  ['鐤捐窇', 疾跑.name],
  ['娲楃墝榄旀硶', 洗牌魔法.name],
  ['鏃犻檺澧炲箙榄旀硶', 无限增幅魔法.name],
  ['鑰佽檸鏈?', 老虎机.name],
  ['鍜屽钩', 和平.name],
  ['榛勯噾瀹濈', 黄金宝箱.name],
  ['鐬椂鍐荤粨', 瞬时冻结.name],
  ['绛変环浜ゆ崲', 等价交换.name],
  ['老虎机', 老虎机.name],
  // 原为卡牌、现恢复为主动技的旧名
  ['购物', 讨价还价.name],
  ['手里剑', 投掷飞刀.name],
  ['电池', 蓄能魔晶.name],
  ['大电池', 高纯蓄能魔晶.name],
  ['毒性爆发', 埋毒.name],
]);

const ACTIVE_SKILL_BY_NAME = new Map<string, ActiveSkillData>(ACTIVE_SKILL_REGISTRY.map(skill => [skill.name, skill]));
const ACTIVE_SKILL_BY_ID = new Map<string, ActiveSkillData>(ACTIVE_SKILL_REGISTRY.map(skill => [skill.id, skill]));

export const getAllActiveSkills = (): ActiveSkillData[] => ACTIVE_SKILL_REGISTRY.map(skill => ({ ...skill }));

export const getActiveSkillByName = (name: string): ActiveSkillData | null => {
  const normalizedName = LEGACY_ACTIVE_SKILL_NAME_ALIASES.get(name) ?? name;
  const skill = ACTIVE_SKILL_BY_NAME.get(normalizedName);
  return skill ? { ...skill } : null;
};

export const getActiveSkillById = (id: string): ActiveSkillData | null => {
  const skill = ACTIVE_SKILL_BY_ID.get(id);
  return skill ? { ...skill } : null;
};

export const resolveActiveSkillNames = (names: string[]): ActiveSkillData[] =>
  names.map(name => getActiveSkillByName(name)).filter((skill): skill is ActiveSkillData => Boolean(skill));
