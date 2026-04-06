export interface OpeningInfoSubmission {
  race: string;
  name: string;
  age: number;
  chastity: '处女' | '非处女';
  heightCm: number;
  weightType: string;
  bust: string;
  hips: string;
  vagina: string;
  anus: string;
  sensitivePoints: string;
  backstory: string;
}

export interface OpeningBackstoryDraftInput {
  race: string;
  name: string;
  age: number;
  chastity: OpeningInfoSubmission['chastity'];
  heightCm: number;
  weightType: string;
  bust: string;
  hips: string;
  sensitivePoints: string;
  existingBackstory?: string;
}

export const RACE_OPTIONS = [
  '人类',
  '精灵',
  '半精灵',
  '兽人',
  '狐人',
  '猫人',
  '狼人',
  '魅魔',
  '龙裔',
  '天使裔',
  '妖精',
  '史莱姆娘',
  '自定义',
] as const;

export const CHASTITY_OPTIONS: OpeningInfoSubmission['chastity'][] = ['处女', '非处女'];

export const WEIGHT_OPTIONS = ['骨感', '纤细', '苗条', '匀称', '柔软', '丰腴', '丰满', '肉感', '珠圆玉润'] as const;

export const BUST_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export const HIP_OPTIONS = ['小巧', '紧致', '圆润', '丰挺', '肉感', '肥硕', '蜜桃臀', '宽大'] as const;

export const VAGINA_OPTIONS = [
  '白虎',
  '一线天',
  '馒头型',
  '花瓣型',
  '紧致型',
  '柔软型',
  '粉嫩型',
  '肉缝深藏',
  '微张型',
  '湿润型',
  '黏滑型',
  '敏感型',
  '吸附型',
  '绒毛稀薄',
  '绒毛浓密',
  '饱满型',
  '小巧型',
  '丰肉型',
  '软弹型',
  '嫩褶型',
  '蜜穴型',
  '温吞型',
  '灼热型',
  '汁水丰沛',
] as const;

export const ANUS_OPTIONS = [
  '紧闭',
  '小巧',
  '浅粉',
  '深色',
  '柔软',
  '肉感',
  '微皱',
  '细嫩',
  '圆润',
  '弹软',
  '顺从',
  '敏感',
  '潮润',
  '温热',
  '紧致',
  '丰肉',
  '易开',
  '耐受',
] as const;

const LIMITATION_BLOCK = [
  '来自欲望之神的地下城封印限制了{{user}}的绝大部分力量，在这个领域内，她除了魔女专属的不死重构特性以外，总体实力与普通冒险者/魔法师无异。',
  '每次死亡后，由于法则强制重构，{{user}}都会从地牢入口醒来，并且会失去本次探险收集的技能与圣遗物。',
  '但是，与魔物们建立的羁绊、积攒的回忆以及战斗经验，将会随着灵魂跨越死亡被完整保留下来。',
] as const;

const indentBlock = (value: string): string =>
  value
    .split(/\r?\n/u)
    .map(line => `  ${line.trimEnd()}`)
    .join('\n');

const normalizeInline = (value: string): string => value.trim();

export const formatSensitivePoints = (value: string): string => {
  const normalized = normalizeInline(value);
  return normalized || '无';
};

export const buildUserInformationBlock = (profile: OpeningInfoSubmission): string => {
  const backstory = profile.backstory.trim();

  return [
    '<user_information>',
    '',
    `种族：${normalizeInline(profile.race)}`,
    `姓名：${normalizeInline(profile.name)}`,
    `年龄：${profile.age}`,
    `贞操：${profile.chastity}`,
    `身高：${profile.heightCm}cm`,
    `体重：${normalizeInline(profile.weightType)}`,
    `胸围：${profile.bust}`,
    `臀部：${normalizeInline(profile.hips)}`,
    `小穴：${normalizeInline(profile.vagina)}`,
    `屁穴：${normalizeInline(profile.anus)}`,
    `敏感点：${formatSensitivePoints(profile.sensitivePoints)}`,
    '背景故事: |',
    indentBlock(backstory),
    '',
    '当前限制: |',
    indentBlock(LIMITATION_BLOCK.join('\n')),
    '</user_information>',
  ].join('\n');
};

export const buildOpeningPrompt = (profile: OpeningInfoSubmission): string =>
  `${buildUserInformationBlock(profile)}\n\n以上为{{user}}的信息，请生成一段{{user}}初次进入地下城的开场剧情。`;

export const buildOpeningBackstoryDraftPrompt = (
  profile: OpeningBackstoryDraftInput,
  backgroundSetting: string,
  witchSetting: string,
): string => {
  const normalizedBackgroundSetting = backgroundSetting.trim();
  const normalizedWitchSetting = witchSetting.trim();
  const normalizedExistingBackstory = (profile.existingBackstory ?? '').trim();
  const normalizedSensitivePoints = formatSensitivePoints(profile.sensitivePoints);

  return [
    '你要为一名即将进入欲望之神地下城的女性角色生成一段开局背景故事草稿。',
    '你只能参考我接下来提供的角色已填信息与世界书条目【背景设定】、【魔女】。',
    '不要调用其他设定，不要补充未提供的外部规则，不要引用聊天历史。',
    '',
    '[背景设定]',
    normalizedBackgroundSetting || '未提供背景设定。',
    '',
    '[魔女]',
    normalizedWitchSetting || '未提供魔女条目。',
    '',
    '[角色已填信息]',
    `种族：${profile.race.trim()}`,
    `姓名：${profile.name.trim()}`,
    `年龄：${profile.age}`,
    `贞操：${profile.chastity}`,
    `身高：${profile.heightCm}cm`,
    `体重：${profile.weightType.trim()}`,
    `胸围：${profile.bust}`,
    `臀部：${profile.hips.trim()}`,
    `敏感点：${normalizedSensitivePoints}`,
    '',
    normalizedExistingBackstory
      ? [
          '[玩家已写下的背景草稿]',
          normalizedExistingBackstory,
          '',
          '请在尊重这段草稿核心意思的前提下，将其补完、润色并扩写成完整背景故事。',
        ].join('\n')
      : '玩家尚未填写背景草稿，请直接根据以上信息生成完整背景故事。',
    '',
    '输出要求：',
    '1. 只输出背景故事正文，不要标题，不要解释，不要分点。',
    '2. 风格要贴合欲望之神地下城的世界观，气质成熟、自然、连贯。',
    '3. 不要让角色拥有超出当前世界观限制的破格能力或设定。',
    '4. 篇幅控制在300到800字之间。',
  ].join('\n');
};
