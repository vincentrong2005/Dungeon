/** 卡牌边框皮肤（图床：地牢/素材库/战斗界面/卡牌边框v2/*.webp，600×900，中心透明） */
export type CardFrameType = 'physical' | 'magic' | 'function' | 'dodge' | 'curse' | 'active' | 'sin' | 'quest';

const FRAME_BASE =
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E6%88%98%E6%96%97%E7%95%8C%E9%9D%A2/%E5%8D%A1%E7%89%8C%E8%BE%B9%E6%A1%86v2';

const FRAME_FILE: Record<CardFrameType, string> = {
  physical: '物理',
  magic: '魔法',
  function: '功能',
  dodge: '闪避',
  curse: '诅咒',
  active: '主动',
  sin: '原罪',
  /** 任务卡牌（橙色），预留 */
  quest: '任务',
};

export const getCardFrameUrl = (type: CardFrameType): string =>
  `${FRAME_BASE}/${encodeURIComponent(FRAME_FILE[type])}.webp`;

/** 需要预加载的全部卡框 */
export const ALL_CARD_FRAME_URLS: readonly string[] = (Object.keys(FRAME_FILE) as CardFrameType[]).map(getCardFrameUrl);
