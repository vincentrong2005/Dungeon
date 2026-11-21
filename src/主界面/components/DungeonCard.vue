<!-- eslint-disable better-tailwindcss/no-unknown-classes, better-tailwindcss/no-concatenated-classes -->
<template>
  <!-- Face Down Card -->
  <div
    v-if="faceDown"
    class="dungeon-card relative w-40 h-60 shadow-xl transition-transform duration-300 hover:-translate-y-2"
    :class="className"
  >
    <CardFrameSkin :type="frameType" />
    <div class="card-face card-face--back">
      <CircleHelp class="size-8 text-white/35" />
    </div>
  </div>

  <!-- Face Up Card -->
  <div
    v-else
    class="dungeon-card relative w-40 h-60 cursor-pointer shadow-2xl transition-all duration-300"
    :class="[
      `card-tone--${frameType}`,
      hasGluttonyEnchant ? 'gluttony-card-glow' : '',
      enchantInfo ? enchantGlowClass : '',
      sinState !== 'none' ? `sin-card sin-card--${sinState}` : '',
      selected ? 'ring-4 ring-dungeon-gold -translate-y-6 scale-105 z-20' : 'hover:-translate-y-2 hover:z-10',
      disabled ? 'opacity-80 cursor-default!' : '',
      className,
    ]"
    @click="!disabled && $emit('click')"
  >
    <CardFrameSkin
      :type="sinState !== 'none' ? 'sin' : frameType"
      :rare="isRareCard && sinState === 'none'"
      :sin-state="sinState !== 'none' ? sinState : null"
    />
    <span v-if="showManaBadge && frameType === 'magic'" class="card-gem-cost">
      <span class="card-gem-cost__value">{{ card.manaCost }}</span>
    </span>
    <div class="card-face">
      <div class="card-face-heading">
        <span v-if="showManaBadge && frameType !== 'magic'" class="card-face-cost">{{ card.manaCost }}</span>
        <h3 class="card-face-name" :title="displayName">{{ displayName }}</h3>
      </div>
      <div class="card-face-emblem">
        <component :is="typeIcon" class="card-face-icon" />
        <span v-if="enchantInfo" class="card-enchant-seal" :class="enchantSealClass" :title="enchantText">
          <span class="card-enchant-seal__gem" aria-hidden="true">
            <component :is="enchantIcon" class="card-enchant-seal__icon" />
          </span>
          <span class="card-enchant-seal__plate">
            <span v-if="enchantInfo.temporary" class="card-enchant-seal__temp">临时</span>{{ enchantShortLabel }}
          </span>
        </span>
      </div>
      <CardRulesPanel
        class="card-face-rules"
        :class="{ 'card-face-rules--enemy': isEnemy, 'card-face-rules--enchanted': Boolean(enchantInfo) }"
        :title="displayName"
        :description="displayDescription"
        :traits="maskLevel === 'none' ? card.traits : null"
        :negative-effect="maskLevel === 'none' ? (card.negativeEffect ?? null) : null"
        :mana-drain="maskLevel === 'none' ? (card.manaDrain ?? null) : null"
        :swarm-attack="maskLevel === 'none' ? card.swarmAttack === true : false"
        :ignore-clash="maskLevel === 'none' ? (card.ignoreClash === true || sinIgnoresClash) : false"
        :excape="maskLevel === 'none' ? card.excape === true : false"
        :self-damage="maskLevel === 'none' ? (card.selfDamage ?? null) : null"
        :gluttony-enchanted="hasGluttonyEnchant"
        surface-class="card-face-rules-surface"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleHelp, Flame, Footprints, Hammer, Heart, RefreshCcw, Skull, Sparkles, Sword, Zap } from 'lucide-vue-next';
import { type CardData, CardType } from '../types';
import { UMBILICAL_TENTACLE_CARD, getUmbilicalPullDescription } from '../battle/cardRegistry';
import { BRAND_ENCHANT_PREFIX, REFINE_ENCHANT, YINWEN_ENCHANT, formatEnchantText } from '../battle/enchantRegistry';
import { SIN_CARD_ID, isSinResonatedByInventory } from '../battle/eventCards';
import { useGameStore } from '../gameStore';
import CardRulesPanel from './CardRulesPanel.vue';
import CardFrameSkin, { type CardFrameType } from './CardFrameSkin.vue';

const props = withDefaults(
  defineProps<{
    card: CardData;
    disabled?: boolean;
    selected?: boolean;
    faceDown?: boolean;
    isEnemy?: boolean;
    className?: string;
    maskLevel?: 'none' | 'partial' | 'full' | 'void';
    currentTurn?: number;
  }>(),
  {
    disabled: false,
    selected: false,
    faceDown: false,
    isEnemy: false,
    className: '',
    maskLevel: 'none',
    currentTurn: undefined,
  },
);

defineEmits<{
  click: [];
}>();

const frameType = computed<CardFrameType>(() => {
  switch (props.card.type) {
    case CardType.MAGIC:
      return 'magic';
    case CardType.FUNCTION:
      return 'function';
    case CardType.ACTIVE:
      return 'active';
    case CardType.DODGE:
      return 'dodge';
    case CardType.CURSE:
      return 'curse';
    case CardType.PHYSICAL:
    default:
      return 'physical';
  }
});

const typeIcon = computed(() => {
  if (props.maskLevel === 'full' || props.maskLevel === 'void') {
    return CircleHelp;
  }
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return Sword;
    case CardType.MAGIC:
      return Sparkles;
    case CardType.FUNCTION:
      return RefreshCcw;
    case CardType.DODGE:
      return Footprints;
    case CardType.ACTIVE:
      return Zap;
    case CardType.CURSE:
      return Skull;
    default:
      return Sword;
  }
});

/**
 * 七原罪：未共鸣（corrupted）时显示不稳定的血色侵蚀特效与原罪副作用；
 * 持有对应罪书后共鸣（resonated），换成稳定的金红辉光，副作用消失。
 */
const gameStore = useGameStore();
const sinState = computed<'none' | 'corrupted' | 'resonated'>(() => {
  if (props.maskLevel !== 'none' || props.isEnemy || !props.card.sin) return 'none';
  const relicInventory = (gameStore.statData?.携带的物品 as { _圣遗物?: Record<string, unknown> } | undefined)?._圣遗物;
  return isSinResonatedByInventory(props.card, relicInventory) ? 'resonated' : 'corrupted';
});
const sinIgnoresClash = computed(() => sinState.value === 'resonated' && props.card.id === SIN_CARD_ID.ARROGANCE);

const displayName = computed(() => (props.maskLevel === 'none' ? props.card.name : '???'));
const displayDescription = computed(() => {
  if (props.maskLevel !== 'none') return '???';
  if (props.card.id === UMBILICAL_TENTACLE_CARD.PULL && props.currentTurn !== undefined) {
    return getUmbilicalPullDescription(props.currentTurn);
  }
  // 七原罪：未共鸣时接上原罪副作用；共鸣后接上被削弱的副作用（傲慢共鸣后没有副作用，"无视拼点"由特性标签显示）
  const sin = props.card.sin;
  const sinText = !sin ? '' : sinState.value === 'corrupted' ? sin.sideEffect : sinState.value === 'resonated' ? (sin.resonatedSideEffect ?? '') : '';
  return joinSentences(props.card.description, sinText, enchantText.value);
});
/** 拼接说明文字：去掉前一句末尾的标点再用「。」连接，避免出现「。。」 */
const joinSentences = (...parts: string[]) =>
  parts
    .map(part => part.trim())
    .filter(Boolean)
    .map((part, index, list) => (index < list.length - 1 ? part.replace(/[。．.；;，,\s]+$/u, '') : part))
    .join('。');
const enchantInfo = computed(() => (props.maskLevel === 'none' && !props.isEnemy ? (props.card.enchant ?? null) : null));
const enchantText = computed(() => (enchantInfo.value ? formatEnchantText(enchantInfo.value) : ''));
/** 附魔类别：精炼（金）/ 淫文（绯红）/ 刑印（赤铁），决定徽记图标与卡牌辉光颜色 */
const enchantKind = computed<'refine' | 'lust' | 'brand'>(() => {
  const key = enchantInfo.value?.key ?? '';
  if (key.startsWith(REFINE_ENCHANT)) return 'refine';
  if (key === YINWEN_ENCHANT) return 'lust';
  return 'brand';
});
const ENCHANT_ICONS = { refine: Hammer, lust: Heart, brand: Flame } as const;
const ENCHANT_SEAL_CLASS = { refine: 'card-enchant-seal--refine', lust: 'card-enchant-seal--lust', brand: 'card-enchant-seal--brand' } as const;
const ENCHANT_GLOW_CLASS = { refine: 'enchant-glow--refine', lust: 'enchant-glow--lust', brand: 'enchant-glow--brand' } as const;
const enchantIcon = computed(() => ENCHANT_ICONS[enchantKind.value]);
const enchantSealClass = computed(() => ENCHANT_SEAL_CLASS[enchantKind.value]);
const enchantGlowClass = computed(() => ENCHANT_GLOW_CLASS[enchantKind.value]);
/** 徽记上的短标签：精炼显示罗马数字等级，刑印去掉前缀 */
const enchantShortLabel = computed(() => {
  const key = enchantInfo.value?.key ?? '';
  if (key.startsWith(REFINE_ENCHANT)) return `精炼${key.slice(REFINE_ENCHANT.length)}`;
  if (key.startsWith(BRAND_ENCHANT_PREFIX)) return `刑印·${key.slice(BRAND_ENCHANT_PREFIX.length)}`;
  return enchantInfo.value?.label ?? '';
});
const showManaBadge = computed(
  () =>
    props.maskLevel === 'none' &&
    (props.card.type === CardType.MAGIC || props.card.type === CardType.ACTIVE) &&
    props.card.manaCost > 0,
);
const isRareCard = computed(() => props.maskLevel === 'none' && props.card.rarity === '稀有');
const hasGluttonyEnchant = computed(() => props.maskLevel === 'none' && props.card.gluttonyEnchanted === true);
</script>

<style scoped>
.dungeon-card {
  isolation: isolate;
  --card-accent: 240, 117, 99;
}

.card-tone--magic { --card-accent: 102, 183, 255; }
.card-tone--function { --card-accent: 243, 182, 76; }
.card-tone--dodge { --card-accent: 121, 204, 128; }
.card-tone--curse { --card-accent: 168, 110, 218; }
.card-tone--active { --card-accent: 218, 226, 244; }

.card-face {
  position: absolute;
  z-index: auto;
  /* 卡框 v2 两侧开口最小约为 上 7.2% / 左右 11.4% / 下 8.0%；底板略微伸入卡框下方（卡框层级更高），
     避免底板与卡框之间露出缝隙（已在 TauriTavern 中逐类卡框核对） */
  inset: 7% 10.8% 7.8%;
  display: flex;
  min-height: 0;
  flex-direction: column;
  align-items: stretch;
  border-radius: 5px;
  background: linear-gradient(165deg, rgba(28, 26, 34, 0.93), rgba(9, 9, 15, 0.97));
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 10px rgba(var(--card-accent), 0.15);
  color: #f7f0e6;
}

.card-face--back {
  z-index: 5;
  align-items: center;
  justify-content: center;
}

.card-face-heading {
  position: relative;
  display: flex;
  min-height: 37px;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(var(--card-accent), 0.36);
}

.card-face-cost {
  position: absolute;
  z-index: 6;
  top: -5px;
  left: -7px;
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  border: 1px solid rgba(var(--card-accent), 0.7);
  border-radius: 50%;
  background: #171520;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.card-gem-cost {
  position: absolute;
  top: 4%;
  left: 50%;
  z-index: 5;
  display: grid;
  width: 30px;
  height: 24px;
  place-items: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.card-gem-cost__value {
  color: #fff;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22.5px;
  font-weight: 900;
  line-height: 1;
  -webkit-text-stroke: 1px #000;
  text-shadow: 0 1px 1px #000, 0 0 3px #000, 0 0 5px rgba(75, 185, 255, 0.72);
}

.card-face-name {
  position: relative;
  z-index: 6;
  display: -webkit-box;
  overflow: hidden;
  max-height: 28px;
  margin: 0;
  text-align: center;
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  text-shadow: 0 1px 2px #000;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}

.card-face-emblem {
  display: grid;
  height: 37px;
  flex: 0 0 37px;
  place-items: center;
  background: radial-gradient(ellipse, rgba(var(--card-accent), 0.24), transparent 72%);
}

.card-face-icon {
  width: 23px;
  height: 23px;
  color: rgb(var(--card-accent));
  filter: drop-shadow(0 2px 3px #000);
}

.card-face-rules {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.card-face-rules--enemy {
  pointer-events: auto;
}

.card-face-rules :deep(.card-face-rules-surface) {
  height: 100%;
  max-height: none;
  padding: 2px 3px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.27);
  color: #e7e0d7;
  font-size: 12px;
  line-height: 1.25;
}

.card-face-rules :deep(.card-face-rules-surface > div) {
  height: 100%;
  max-height: none;
}

.card-face-rules :deep(.card-rules-scroll > div) {
  position: relative;
  z-index: 6;
}

.gluttony-card-glow {
  filter: drop-shadow(0 0 9px rgba(168, 85, 247, 0.55));
}

/* ═════════ 附魔 ═════════
 * 卡牌外缘按附魔类别发出辉光；图标下方是「宝石 + 铭牌」的徽记。
 * 精炼 = 锻金，淫文 = 绯红，刑印 = 赤铁。
 */
.enchant-glow--refine {
  --enchant-rgb: 246, 200, 104;
  animation: enchant-glow-pulse 3.2s ease-in-out infinite;
}

.enchant-glow--lust {
  --enchant-rgb: 240, 110, 190;
  animation: enchant-glow-pulse 3.2s ease-in-out infinite;
}

.enchant-glow--brand {
  --enchant-rgb: 232, 92, 60;
  animation: enchant-glow-pulse 3.2s ease-in-out infinite;
}

@keyframes enchant-glow-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(var(--enchant-rgb), 0.38));
  }
  50% {
    filter: drop-shadow(0 0 11px rgba(var(--enchant-rgb), 0.62));
  }
}

.card-face-emblem {
  position: relative;
}

.card-enchant-seal {
  --seal-rgb: 246, 200, 104;
  --seal-dark: #2a1a06;
  position: absolute;
  z-index: 6;
  /* 落在类型图标下方、规则区顶部，避免压住图标 */
  bottom: -14px;
  left: 50%;
  display: flex;
  max-width: 96%;
  align-items: center;
  transform: translateX(-50%);
  pointer-events: auto;
}

/* 有附魔时规则区顶部让出徽记的位置 */
.card-face-rules--enchanted :deep(.card-face-rules-surface) {
  padding-top: 11px;
}

.card-enchant-seal--lust {
  --seal-rgb: 240, 110, 190;
  --seal-dark: #2c0a1f;
}

.card-enchant-seal--brand {
  --seal-rgb: 232, 92, 60;
  --seal-dark: #2b0d07;
}

/* 菱形宝石：四面切光 + 内发光，压在铭牌左端 */
.card-enchant-seal__gem {
  position: relative;
  z-index: 1;
  display: grid;
  width: 17px;
  height: 17px;
  flex: none;
  place-items: center;
  margin-right: -6px;
  border: 1px solid rgba(var(--seal-rgb), 0.95);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.55), transparent 42%),
    radial-gradient(circle at 50% 55%, rgba(var(--seal-rgb), 0.95), rgba(var(--seal-rgb), 0.35) 70%),
    var(--seal-dark);
  box-shadow: 0 0 6px rgba(var(--seal-rgb), 0.7), inset 0 0 3px rgba(0, 0, 0, 0.6);
  transform: rotate(45deg);
}

.card-enchant-seal__icon {
  width: 10px;
  height: 10px;
  color: #fff8e8;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
  transform: rotate(-45deg);
}

.card-enchant-seal__plate {
  overflow: hidden;
  padding: 0 6px 0 9px;
  border: 1px solid rgba(var(--seal-rgb), 0.7);
  border-left: none;
  border-radius: 0 7px 7px 0;
  background: linear-gradient(180deg, rgba(var(--seal-rgb), 0.28), rgba(0, 0, 0, 0.88) 70%), var(--seal-dark);
  color: rgb(255, 244, 222);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 13px;
  text-overflow: ellipsis;
  text-shadow: 0 1px 1px #000, 0 0 4px rgba(var(--seal-rgb), 0.6);
  white-space: nowrap;
}

.card-enchant-seal__temp {
  margin-right: 2px;
  color: rgba(255, 244, 222, 0.7);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .enchant-glow--refine,
  .enchant-glow--lust,
  .enchant-glow--brand {
    animation: none;
    filter: drop-shadow(0 0 8px rgba(var(--enchant-rgb), 0.5));
  }
}

/* ═════════ 七原罪 ═════════
 * 卡框特效（光晕、血脉、流光）在 CardFrameSkin 中以卡框做遮罩实现，这里只调整卡名配色。
 */
.sin-card--corrupted .card-face-name {
  color: #ffb3bb;
  text-shadow: 0 0 6px rgba(220, 20, 60, 0.8);
}

.sin-card--resonated .card-face-name {
  color: #fde68a;
  text-shadow: 0 0 6px rgba(250, 204, 21, 0.55);
}

</style>
