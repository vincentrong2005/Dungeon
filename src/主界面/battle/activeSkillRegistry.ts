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
  description: '点数+1，每使用一次该卡牌，其本回合法力消耗+1',
};

const 老虎机: ActiveSkillData = {
  id: 'active_basic_slot_machine',
  name: '老虎机',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 0,
  description: '重掷双方骰子，每使用一次该卡牌，其本回合法力消耗+1',
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
