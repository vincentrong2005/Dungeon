<template>
  <div class="event-settlement-overlay absolute inset-0 z-103">
    <div class="absolute inset-0 flex items-center justify-center p-3 md:p-8">
      <div class="dg-skin-panel event-settlement-panel flex max-h-full w-full max-w-5xl flex-col">
        <header class="settle-header">
          <div class="dg-skin-kicker">{{ headerLabel }}</div>
          <div class="dg-skin-title">{{ currentStep?.title ?? '事件结算' }}</div>
          <span class="dg-skin-divider" aria-hidden="true"></span>
          <div v-if="stageHint" class="dg-skin-hint mt-1">{{ stageHint }}</div>
          <div v-if="steps.length > 1" class="settle-progress" aria-hidden="true">
            <span
              v-for="(step, index) in steps"
              :key="`progress-${index}`"
              class="settle-progress__dot"
              :class="{ 'is-done': index < stepIndex, 'is-current': index === stepIndex }"
            ></span>
          </div>
        </header>

        <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-1 py-2">
          <!-- 圣遗物 -->
          <template v-if="currentStep?.kind === 'relic'">
            <div class="mx-auto flex max-w-2xl flex-col gap-3">
              <component
                :is="currentStep.pickOne ? 'button' : 'div'"
                v-for="relic in currentStep.relics"
                :key="relic.id"
                :type="currentStep.pickOne ? 'button' : undefined"
                class="dg-relic-plaque settle-reveal"
                :class="[
                  rarityToneClass(relic.rarity),
                  currentStep.pickOne ? 'is-interactive settle-relic-pick' : '',
                  currentStep.pickOne && pickedRelicId === relic.id ? 'is-picked' : '',
                ]"
                :aria-pressed="currentStep.pickOne ? pickedRelicId === relic.id : undefined"
                @click="currentStep.pickOne && (pickedRelicId = relic.id)"
              >
                <span class="dg-relic-plaque__orb" aria-hidden="true"><img :src="getRelicOrbUrl(relic.rarity)" alt="" /></span>
                <div class="min-w-0">
                  <div class="dg-relic-plaque__name">{{ relic.name }}</div>
                  <div class="dg-relic-plaque__meta">{{ formatRarity(relic.rarity) }} · {{ relic.category }}</div>
                  <div class="dg-relic-plaque__effect">{{ relic.effect }}</div>
                  <div v-if="relic.description" class="dg-relic-plaque__desc">{{ relic.description }}</div>
                </div>
              </component>
            </div>
          </template>

          <!-- 诅咒 -->
          <template v-else-if="currentStep?.kind === 'curse'">
            <div class="flex flex-col items-center gap-3">
              <div class="settle-curse-glow settle-reveal"><DungeonCard v-if="curseCard" :card="curseCard" disabled /></div>
              <div class="dg-skin-hint text-center text-fuchsia-200/85">无法拒绝。确认后需要选择一个卡组槽位替换为该诅咒。</div>
            </div>
          </template>

          <!-- 选卡 / 变异候选 -->
          <template v-else-if="stage === 'chooseCandidate'">
            <div class="flex flex-wrap justify-center gap-4">
              <button
                v-for="card in candidateCards"
                :key="`candidate-${card.id}`"
                type="button"
                class="dg-skin-option settle-card-option"
                @click="chooseCandidate(card)"
              >
                <div class="settle-card-option__meta">{{ card.category }} · {{ card.rarity }}</div>
                <div class="flex justify-center"><DungeonCard :card="card" disabled /></div>
              </button>
            </div>
          </template>

          <!-- 卡组槽位 -->
          <template v-else-if="stage === 'chooseSlot' || stage === 'chooseTarget' || stage === 'chooseBrandSlot'">
            <!-- 左：卡组九宫格（容器包裹）；右：待替换的卡牌悬浮等待 -->
            <div class="settle-replace">
              <div class="settle-replace__deck">
                <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <button
                    v-for="entry in slotEntries"
                    :key="`slot-${entry.idx}`"
                    type="button"
                    class="dg-skin-option settle-slot"
                    :class="{ 'settle-slot--source': entry.idx === sourceSlot }"
                    :disabled="!entry.selectable"
                    @click="chooseSlot(entry.idx)"
                  >
                    <div class="settle-slot__head">
                      <span>槽位 {{ entry.idx + 1 }}</span>
                      <span v-if="entry.reason" class="settle-slot__reason">{{ entry.reason }}</span>
                    </div>
                    <div class="flex justify-center">
                      <DungeonCard v-if="entry.card" :card="entry.card" disabled />
                      <div v-else class="settle-slot__empty">{{ entry.name || '空槽位' }}</div>
                    </div>
                  </button>
                </div>
              </div>
              <div v-if="selectedCard" class="settle-replace__pending">
                <span class="settle-replace__label">待替换</span>
                <div class="settle-replace__float">
                  <DungeonCard :card="selectedCard" disabled />
                </div>
                <span class="settle-replace__hint">选择槽位放入</span>
              </div>
            </div>
          </template>

          <!-- 主动技 -->
          <template v-else-if="currentStep?.kind === 'activePick' && stage === 'main'">
            <div class="flex flex-wrap justify-center gap-4">
              <button
                v-for="skill in currentStep.options"
                :key="`active-${skill.id}`"
                type="button"
                class="dg-skin-option settle-card-option"
                @click="chooseActive(skill)"
              >
                <ActiveSkillCard :skill="skill" :footer-right-text="`${skill.category} · ${skill.rarity}`" footer-right-tone="default" />
              </button>
            </div>
          </template>
          <template v-else-if="currentStep?.kind === 'activePick' && stage === 'chooseActiveSlot'">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                v-for="entry in activeSlotEntries"
                :key="`active-slot-${entry.idx}`"
                type="button"
                class="dg-skin-option settle-slot"
                @click="chooseActiveSlot(entry.idx)"
              >
                <div class="settle-slot__head"><span>主动槽位 {{ entry.idx + 1 }}</span></div>
                <div class="flex justify-center">
                  <ActiveSkillCard v-if="entry.skill" :skill="entry.skill" :footer-right-text="`${entry.skill.category} · ${entry.skill.rarity}`" footer-right-tone="default" />
                  <ActiveSkillCard v-else :skill="null" :empty-label="entry.name || '空主动槽位'" />
                </div>
              </button>
            </div>
          </template>

          <!-- 负面状态 -->
          <template v-else-if="currentStep?.kind === 'statusChoice' && stage === 'main'">
            <div class="mx-auto flex max-w-2xl flex-col gap-2">
              <button
                v-for="raw in currentStep.candidates"
                :key="`status-${raw}`"
                type="button"
                class="dg-skin-option settle-row"
                @click="chooseStatus(raw)"
              >
                <span class="settle-row__title settle-row__title--status">{{ raw }}</span>
                <span class="settle-row__desc">{{ describeStatus(raw) }}</span>
                <span v-if="currentStep.mode === 'brand'" class="settle-row__extra">烙印为 → {{ brandPreview(raw) }}</span>
              </button>
            </div>
          </template>

          <!-- 圣遗物交换 / 寄卖 -->
          <template v-else-if="(currentStep?.kind === 'relicSell' || currentStep?.kind === 'relicTrade') && stage === 'main'">
            <div v-if="ownedRelicEntries.length === 0" class="dg-skin-hint py-6 text-center">身上没有可以交出的圣遗物。</div>
            <div v-else class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <button
                v-for="entry in ownedRelicEntries"
                :key="`owned-relic-${entry.key}`"
                type="button"
                class="dg-relic-plaque dg-relic-plaque--compact is-interactive"
                :class="rarityToneClass(entry.relic.rarity)"
                @click="chooseOwnedRelic(entry.key, entry.relic)"
              >
                <span class="dg-relic-plaque__orb" aria-hidden="true"><img :src="getRelicOrbUrl(entry.relic.rarity)" alt="" /></span>
                <div class="min-w-0">
                  <div class="dg-relic-plaque__name">{{ entry.relic.name }}<span v-if="entry.count > 1"> ×{{ entry.count }}</span></div>
                  <div class="dg-relic-plaque__meta">{{ formatRarity(entry.relic.rarity) }} · {{ entry.relic.category }}</div>
                  <div class="dg-relic-plaque__desc">{{ entry.relic.effect }}</div>
                  <div v-if="currentStep.kind === 'relicSell'" class="settle-price">成交价 {{ sellPrice(entry.relic) }} 金币</div>
                </div>
              </button>
            </div>
          </template>

          <!-- 预设（校规 / 菜品） -->
          <template v-else-if="currentStep?.kind === 'presetPick'">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                v-for="option in currentStep.options"
                :key="`preset-${option.id}`"
                type="button"
                class="dg-skin-option settle-preset"
                @click="choosePreset(option)"
              >
                <div class="dg-skin-option__title">{{ option.label }}</div>
                <span class="settle-preset__rule" aria-hidden="true"></span>
                <div class="settle-row__desc">{{ option.description }}</div>
              </button>
            </div>
          </template>

          <!-- 结果 / 说明 -->
          <template v-else-if="stage === 'result' || currentStep?.kind === 'info'">
            <div class="flex flex-col items-center gap-3">
              <div v-if="resultCards.length > 0" class="flex flex-wrap items-center justify-center gap-3">
                <template v-for="(card, index) in resultCards" :key="`result-${index}`">
                  <span v-if="index > 0" class="settle-arrow" aria-hidden="true">→</span>
                  <div class="settle-reveal"><DungeonCard :card="card" disabled /></div>
                </template>
              </div>
              <div
                v-for="relic in resultRelics"
                :key="`result-relic-${relic.id}`"
                class="dg-relic-plaque settle-reveal w-full max-w-xl"
                :class="rarityToneClass(relic.rarity)"
              >
                <span class="dg-relic-plaque__orb" aria-hidden="true"><img :src="getRelicOrbUrl(relic.rarity)" alt="" /></span>
                <div class="min-w-0">
                  <div class="dg-relic-plaque__name">{{ relic.name }}</div>
                  <div class="dg-relic-plaque__meta">{{ formatRarity(relic.rarity) }} · {{ relic.category }}</div>
                  <div class="dg-relic-plaque__effect">{{ relic.effect }}</div>
                </div>
              </div>
              <div v-for="(line, index) in resultLines" :key="`line-${index}`" class="settle-result-line">{{ line }}</div>
            </div>
          </template>
        </div>

        <footer class="settle-footer">
          <div class="flex items-center gap-2">
            <button v-if="canGoBack" type="button" class="dg-skin-btn-ghost" @click="goBack">返回</button>
            <button v-if="canSkip" type="button" class="dg-skin-btn-ghost settle-skip" @click="skipStep">放弃</button>
          </div>
          <div class="flex items-center gap-3">
            <span class="settle-step-count">{{ Math.min(stepIndex + 1, steps.length) }} / {{ steps.length }}</span>
            <button
              v-if="currentStep?.kind === 'relic'"
              type="button"
              class="dg-skin-btn"
              :disabled="currentStep.pickOne && !pickedRelicId"
              @click="acceptRelics"
            >
              收下
            </button>
            <button v-else-if="currentStep?.kind === 'curse'" type="button" class="dg-skin-btn dg-skin-btn--curse" @click="acceptCurse">承受诅咒</button>
            <button
              v-else-if="stage === 'result' || currentStep?.kind === 'info' || ((currentStep?.kind === 'relicSell' || currentStep?.kind === 'relicTrade') && ownedRelicEntries.length === 0)"
              type="button"
              class="dg-skin-btn"
              @click="advance"
            >
              继续
            </button>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { applyEnchantToCard, canEnchantCard, getBrandEnchantKeyForStatus, getEnchantInfo, isRefineMaxed } from '../battle/enchantRegistry';
import type { RelicData, RelicRarity } from '../battle/relicRegistry';
import {
  buildTransformCandidates,
  nextRarity,
  pickRelics,
  type PresetOption,
  type SettlementDraft,
  type SettlementPools,
  type SettlementStep,
} from '../events/eventSettlement';
import { describeNegativeStatus, parseNegativeStatus } from '../negativeStatusRegistry';
import { getRelicOrbUrl } from '../relicOrbs';
import { CardType, type ActiveSkillData, type CardData } from '../types';
import ActiveSkillCard from './ActiveSkillCard.vue';
import DungeonCard from './DungeonCard.vue';

type Stage = 'main' | 'chooseSlot' | 'chooseCandidate' | 'chooseTarget' | 'chooseBrandSlot' | 'chooseActiveSlot' | 'result';

const props = defineProps<{
  steps: SettlementStep[];
  draft: SettlementDraft;
  pools: SettlementPools;
  headerLabel: string;
}>();

const emit = defineEmits<{
  complete: [];
}>();

const stepIndex = ref(0);
const stage = ref<Stage>('main');
const selectedCard = ref<CardData | null>(null);
const sourceSlot = ref<number | null>(null);
const candidateCards = ref<CardData[]>([]);
const selectedActive = ref<ActiveSkillData | null>(null);
const selectedStatus = ref<string | null>(null);
/** 「任选一件」圣遗物步骤中当前选中的圣遗物 */
const pickedRelicId = ref<string | null>(null);
const resultCards = ref<CardData[]>([]);
const resultLines = ref<string[]>([]);
const resultRelics = ref<RelicData[]>([]);
/** 本次结算中已附魔过的槽位（同一事件的两次附魔不能落在同一张卡上） */
const enchantedSlots = ref<number[]>([]);

const currentStep = computed<SettlementStep | null>(() => props.steps[stepIndex.value] ?? null);

const resolveDeckCard = (slot: number): CardData | null => {
  const name = props.draft.skills[slot] ?? '';
  const card = name ? props.pools.resolveCard(name) : undefined;
  if (!card) return null;
  const enchant = props.draft.enchants[slot] ?? '';
  return enchant ? applyEnchantToCard(card, enchant) : card;
};

const isCurse = (card: CardData | null) => card?.type === CardType.CURSE;

const resetStage = () => {
  const step = currentStep.value;
  selectedCard.value = null;
  sourceSlot.value = null;
  candidateCards.value = [];
  selectedActive.value = null;
  selectedStatus.value = null;
  pickedRelicId.value = null;
  resultCards.value = [];
  resultLines.value = [];
  resultRelics.value = [];
  if (!step) {
    stage.value = 'main';
    return;
  }
  switch (step.kind) {
    case 'cardPick':
      if (step.options.length === 1) {
        selectedCard.value = step.options[0]!;
        stage.value = 'chooseSlot';
      } else {
        candidateCards.value = [...step.options];
        stage.value = 'chooseCandidate';
      }
      break;
    case 'cardTransform':
    case 'cardCopy':
    case 'enchant':
      stage.value = 'chooseSlot';
      break;
    case 'info':
      resultLines.value = [...step.lines];
      stage.value = 'result';
      break;
    default:
      stage.value = 'main';
  }
};

const advance = () => {
  if (stepIndex.value >= props.steps.length - 1) {
    stepIndex.value = props.steps.length;
    emit('complete');
    return;
  }
  stepIndex.value += 1;
  resetStage();
};

watch(
  () => props.steps,
  () => {
    stepIndex.value = 0;
    enchantedSlots.value = [];
    if (props.steps.length === 0) {
      emit('complete');
      return;
    }
    resetStage();
  },
  { immediate: true },
);

// ── 文本 ──
const stageHint = computed(() => {
  const step = currentStep.value;
  if (!step) return '';
  switch (stage.value) {
    case 'chooseCandidate':
      return step.kind === 'cardTransform' ? '选择用来取代它的新卡' : '选择 1 张卡';
    case 'chooseSlot':
      if (step.kind === 'cardPick') return '选择要替换的卡组槽位（诅咒槽位无法被替换）';
      if (step.kind === 'cardTransform') return '选择要变异的卡（变异会保留附魔）';
      if (step.kind === 'cardCopy') return '选择要映照的卡';
      if (step.kind === 'enchant') return '选择要附魔的卡（诅咒牌不可附魔）';
      return '选择卡组槽位';
    case 'chooseTarget':
      return '选择被倒影取代的槽位（附魔一并复制）';
    case 'chooseBrandSlot':
      return '选择要烙下刑印的卡';
    case 'chooseActiveSlot':
      return '选择要替换的主动技槽位';
    case 'result':
      return '';
    default:
      if (step.kind === 'statusChoice') return '选择一个负面状态';
      if (step.kind === 'relicSell' || step.kind === 'relicTrade') return '选择要交出的圣遗物';
      if (step.kind === 'activePick') return '选择 1 个主动技';
      if (step.kind === 'presetPick') return '三选一';
      if (step.kind === 'relic' && step.pickOne) return '选择 1 件圣遗物收下';
      return '';
  }
});

const formatRarity = (rarity: RelicRarity) => (rarity === '传奇' ? '传说' : rarity);
const RARITY_TONE_CLASS: Record<RelicRarity, string> = {
  普通: 'is-common',
  稀有: 'is-rare',
  传奇: 'is-legendary',
};
const rarityToneClass = (rarity: RelicRarity) => RARITY_TONE_CLASS[rarity];

const curseCard = computed(() => {
  const step = currentStep.value;
  return step?.kind === 'curse' ? (props.pools.resolveCard(step.curseName) ?? null) : null;
});

// ── 槽位 ──
const slotEntries = computed(() => {
  const step = currentStep.value;
  return props.draft.skills.map((name, idx) => {
    const card = resolveDeckCard(idx);
    let selectable = Boolean(card) || (step?.kind === 'cardPick' && !name);
    let reason = '';
    if (isCurse(card)) {
      // 诅咒牌不能被奖励替换、不能变异 / 复制 / 附魔
      selectable = false;
      reason = '诅咒';
    } else if (step?.kind === 'enchant' && stage.value === 'chooseSlot') {
      if (step.enchant === '精炼' && isRefineMaxed(props.draft.enchants[idx] ?? '')) {
        selectable = false;
        reason = '精炼已满级';
      }
      if (enchantedSlots.value.includes(idx)) {
        selectable = false;
        reason = '已附魔';
      }
    } else if (stage.value === 'chooseTarget' && idx === sourceSlot.value) {
      selectable = false;
      reason = '映照来源';
    } else if (stage.value === 'chooseBrandSlot' && !canEnchantCard(card)) {
      selectable = false;
    }
    if (!name && step?.kind !== 'cardPick') selectable = false;
    return { idx, name, card, selectable, reason };
  });
});

const finishSlotChoice = (slot: number) => {
  const step = currentStep.value;
  if (!step) return;
  const draft = props.draft;
  switch (step.kind) {
    case 'cardPick': {
      const card = selectedCard.value;
      if (!card) return;
      const previousName = draft.skills[slot] ?? '';
      const previousEnchant = draft.enchants[slot] ?? '';
      draft.setSkill(slot, card.name);
      if (step.temporarySource) {
        draft.addTemporaryReplacement({ 来源: step.temporarySource, 字段: '_技能', 槽位: slot, 原名: previousName, 原附魔: previousEnchant, 现名: card.name });
        draft.notice(`【${card.name}】是借来的招式，离开本层时会换回【${previousName || '空槽位'}】`);
      }
      advance();
      return;
    }
    case 'cardTransform': {
      const original = resolveDeckCard(slot);
      const base = props.pools.resolveCard(draft.skills[slot] ?? '');
      if (!original || !base) return;
      const candidates = buildTransformCandidates(base, step.mode, props.pools);
      if (candidates.length === 0) {
        resultLines.value = ['没有可以变异成的卡，什么也没有发生。'];
        stage.value = 'result';
        return;
      }
      sourceSlot.value = slot;
      if (candidates.length === 1) {
        applyTransform(slot, candidates[0]!);
        return;
      }
      candidateCards.value = candidates;
      stage.value = 'chooseCandidate';
      return;
    }
    case 'cardCopy':
      sourceSlot.value = slot;
      stage.value = 'chooseTarget';
      return;
    case 'enchant': {
      if (draft.enchantSlot(slot, step.enchant, props.pools.resolveCard)) enchantedSlots.value.push(slot);
      const card = resolveDeckCard(slot);
      resultCards.value = card ? [card] : [];
      resultLines.value = [`【${draft.skills[slot]}】获得了附魔【${draft.enchants[slot]}】。`];
      stage.value = 'result';
      return;
    }
    default:
      return;
  }
};

const applyTransform = (slot: number, next: CardData) => {
  const before = resolveDeckCard(slot);
  props.draft.setSkill(slot, next.name, { keepEnchant: true });
  const after = resolveDeckCard(slot);
  resultCards.value = [before, after].filter((card): card is CardData => Boolean(card));
  resultLines.value = [`【${before?.name ?? ''}】变异为【${next.name}】${props.draft.enchants[slot] ? '，附魔得以保留' : ''}。`];
  stage.value = 'result';
};

const chooseSlot = (slot: number) => {
  if (stage.value === 'chooseTarget') {
    if (sourceSlot.value === null) return;
    const before = resolveDeckCard(slot);
    props.draft.copySkill(sourceSlot.value, slot);
    const after = resolveDeckCard(slot);
    resultCards.value = [before, after].filter((card): card is CardData => Boolean(card));
    resultLines.value = ['镜像信守承诺，把倒影借给了你。'];
    stage.value = 'result';
    return;
  }
  if (stage.value === 'chooseBrandSlot') {
    const raw = selectedStatus.value;
    if (!raw) return;
    const brandKey = getBrandEnchantKeyForStatus(parseNegativeStatus(raw).key);
    props.draft.cleanseStatus(raw);
    if (brandKey) props.draft.enchantSlot(slot, brandKey as `刑印·${string}`, props.pools.resolveCard);
    const card = resolveDeckCard(slot);
    resultCards.value = card ? [card] : [];
    resultLines.value = [`${raw}被逼出体外，凝成【${brandKey ?? '刑印'}】烙进了【${props.draft.skills[slot]}】。`];
    stage.value = 'result';
    return;
  }
  finishSlotChoice(slot);
};

const chooseCandidate = (card: CardData) => {
  const step = currentStep.value;
  if (step?.kind === 'cardTransform') {
    if (sourceSlot.value === null) return;
    applyTransform(sourceSlot.value, card);
    return;
  }
  selectedCard.value = card;
  stage.value = 'chooseSlot';
};

// ── 主动技 ──
const activeSlotEntries = computed(() =>
  props.draft.actives.map((name, idx) => ({ idx, name, skill: name ? (props.pools.resolveActive(name) ?? null) : null })),
);

const chooseActive = (skill: ActiveSkillData) => {
  selectedActive.value = skill;
  stage.value = 'chooseActiveSlot';
};

const chooseActiveSlot = (slot: number) => {
  const step = currentStep.value;
  const skill = selectedActive.value;
  if (step?.kind !== 'activePick' || !skill) return;
  const previous = props.draft.actives[slot] ?? '';
  props.draft.setActive(slot, skill.name);
  if (step.temporarySource) {
    props.draft.addTemporaryReplacement({ 来源: step.temporarySource, 字段: '$主动', 槽位: slot, 原名: previous, 原附魔: '', 现名: skill.name });
    props.draft.notice(`【${skill.name}】是借来的，离开本层时会自动归还`);
  }
  advance();
};

// ── 负面状态 ──
const describeStatus = (raw: string) => describeNegativeStatus(raw) ?? '';
const brandPreview = (raw: string) => {
  const key = getBrandEnchantKeyForStatus(parseNegativeStatus(raw).key);
  const info = key ? getEnchantInfo(key) : null;
  return info ? `${info.label}（${info.description}）` : '无法凝成刑印';
};

const chooseStatus = (raw: string) => {
  const step = currentStep.value;
  if (step?.kind !== 'statusChoice') return;
  if (step.mode === 'remove') {
    props.draft.cleanseStatus(raw);
    resultLines.value = [`${raw}被洗去了。`];
    stage.value = 'result';
    return;
  }
  if (step.mode === 'rewriteYinwen') {
    props.draft.dropStatus(raw);
    props.draft.notice(`负面状态${raw}被擦去，改写为[淫纹]`);
    props.draft.addStatus('淫纹');
    resultLines.value = [`${raw}被羽毛笔擦去，小腹上浮现出一道新的淫纹。`];
    stage.value = 'result';
    return;
  }
  selectedStatus.value = raw;
  stage.value = 'chooseBrandSlot';
};

// ── 圣遗物 ──
const ownedRelicEntries = computed(() =>
  Object.entries(props.draft.relics)
    .map(([key, count]) => ({ key, count, relic: props.pools.resolveRelic(key) }))
    .filter((entry): entry is { key: string; count: number; relic: RelicData } => Boolean(entry.relic) && entry.count > 0),
);

const RARITY_BASE_PRICE: Record<RelicRarity, number> = { 普通: 5, 稀有: 10, 传奇: 15 };
const sellPrice = (relic: RelicData) => {
  const step = currentStep.value;
  const multiplier = step?.kind === 'relicSell' ? step.multiplier : 1;
  return Math.round(RARITY_BASE_PRICE[relic.rarity] * multiplier);
};

const acceptRelics = () => {
  const step = currentStep.value;
  if (step?.kind !== 'relic') return;
  if (step.pickOne) {
    const picked = step.relics.find(relic => relic.id === pickedRelicId.value);
    if (!picked) return;
    props.draft.addRelic(picked);
  } else {
    for (const relic of step.relics) props.draft.addRelic(relic);
  }
  advance();
};

const acceptCurse = () => {
  const step = currentStep.value;
  if (step?.kind !== 'curse') return;
  props.draft.queueCurse(step.curseName);
  advance();
};

const chooseOwnedRelic = (key: string, relic: RelicData) => {
  const step = currentStep.value;
  if (!step) return;
  if (step.kind === 'relicSell') {
    const price = sellPrice(relic);
    props.draft.removeRelicKey(key, relic.name);
    props.draft.changeGold(price);
    resultLines.value = [`【${relic.name}】以 ${price} 金币成交。`];
    stage.value = 'result';
    return;
  }
  if (step.kind === 'relicTrade') {
    const target = step.tierUp ? nextRarity(relic.rarity) : relic.rarity;
    props.draft.removeRelicKey(key, relic.name);
    const ownedIds = Object.keys(props.draft.relics)
      .map(item => props.pools.resolveRelic(item)?.id)
      .filter((id): id is string => Boolean(id));
    const picked = pickRelics({ ...props.pools, relicPool: props.pools.relicPool.filter(item => item.rarity === target) }, target, 1, {
      excludeIds: [relic.id, ...ownedIds],
    })[0];
    if (picked) {
      props.draft.addRelic(picked);
      resultRelics.value = [picked];
      resultLines.value = [`交出【${relic.name}】，换回了【${picked.name}】。`];
    } else {
      resultLines.value = [`交出了【${relic.name}】，但对方手中已没有可以交换的同阶宝物。`];
    }
    stage.value = 'result';
  }
};

// ── 预设 ──
const choosePreset = (option: PresetOption) => {
  const step = currentStep.value;
  if (step?.kind !== 'presetPick') return;
  for (const modifier of option.modifiers) props.draft.addModifier(`${step.source}·${option.label}`, modifier, { silent: true });
  props.draft.notice(`选择了【${option.label}】：${option.description}`);
  advance();
};

// ── 导航 ──
const canGoBack = computed(() => {
  const step = currentStep.value;
  if (!step) return false;
  if (stage.value === 'chooseSlot' && step.kind === 'cardPick' && step.options.length > 1) return true;
  if (stage.value === 'chooseTarget' || stage.value === 'chooseBrandSlot' || stage.value === 'chooseActiveSlot') return true;
  return false;
});

const goBack = () => {
  const step = currentStep.value;
  if (!step) return;
  if (stage.value === 'chooseSlot' && step.kind === 'cardPick') {
    selectedCard.value = null;
    stage.value = 'chooseCandidate';
    return;
  }
  if (stage.value === 'chooseTarget') {
    sourceSlot.value = null;
    stage.value = 'chooseSlot';
    return;
  }
  stage.value = 'main';
  selectedStatus.value = null;
  selectedActive.value = null;
};

/** 诅咒是代价，不能放弃；结果页只需继续 */
const canSkip = computed(() => {
  const step = currentStep.value;
  if (!step || stage.value === 'result') return false;
  return step.kind !== 'curse' && step.kind !== 'info';
});

const skipStep = () => {
  const step = currentStep.value;
  if (!step) return;
  props.draft.notice(`放弃了「${step.title}」`);
  advance();
};
</script>

<style scoped>
.event-settlement-overlay {
  background:
    radial-gradient(ellipse 70% 70% at 50% 45%, rgba(70, 40, 12, 0.45), transparent 70%),
    rgba(4, 2, 6, 0.9);
}

.event-settlement-panel {
  padding: 0.4rem 0.8rem 0.6rem;
}

.settle-header {
  margin-bottom: 0.6rem;
  text-align: center;
}

.settle-progress {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.settle-progress__dot {
  width: 0.55rem;
  height: 0.55rem;
  border: 1px solid rgba(201, 161, 96, 0.55);
  border-radius: 50%;
  background: rgba(10, 7, 9, 0.7);
  transform: rotate(45deg);
}

.settle-progress__dot.is-done {
  background: rgba(201, 161, 96, 0.55);
}

.settle-progress__dot.is-current {
  border-color: var(--dg-gold-bright);
  background: var(--dg-gold-bright);
  box-shadow: 0 0 8px rgba(240, 208, 138, 0.6);
}

.settle-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--dg-line);
}

.settle-step-count {
  color: var(--dg-text-faint);
  font-family: var(--dg-font-data);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
}

.settle-skip:hover:not(:disabled) {
  border-color: rgba(192, 80, 63, 0.7);
  color: #f3b3a8;
}

.settle-card-option {
  padding: 0.6rem;
}

.settle-card-option__meta {
  margin-bottom: 0.35rem;
  color: var(--dg-text-muted);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-align: center;
}

/* 任选一件圣遗物：可点击铭牌与选中态 */
.settle-relic-pick {
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.settle-relic-pick.is-picked {
  border-color: var(--dg-gold-bright);
  box-shadow:
    0 0 0 1px rgba(240, 208, 138, 0.55),
    0 0 18px rgba(240, 208, 138, 0.35);
}

/* 替换布局：左侧卡组九宫格，右侧悬浮的待替换卡（窄屏时卡牌移到上方） */
.settle-replace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settle-replace__deck {
  min-width: 0;
  flex: 1 1 auto;
  padding: 0.6rem;
  border: 1px solid var(--dg-line-strong);
  background: rgba(10, 7, 9, 0.45);
}

.settle-replace__pending {
  display: flex;
  order: -1;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.settle-replace__label {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  text-shadow: 0 0 8px rgba(240, 208, 138, 0.45);
}

.settle-replace__float {
  padding: 1.6rem 1.4rem 1.4rem;
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 14px rgba(240, 208, 138, 0.28));
  animation: settle-replace-float 3.2s ease-in-out infinite;
}

.settle-replace__float > :deep(.dungeon-card) {
  transform: scale(1.15);
}

.settle-replace__hint {
  color: var(--dg-text-faint);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

@media (min-width: 768px) {
  .settle-replace {
    flex-direction: row;
    align-items: flex-start;
  }

  .settle-replace__pending {
    position: sticky;
    top: 0;
    order: 0;
    flex: 0 0 auto;
    align-self: flex-start;
    padding-top: 2rem;
  }
}

@keyframes settle-replace-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.settle-slot {
  padding: 0.5rem;
}

.settle-slot--source {
  border-color: rgba(154, 92, 240, 0.75);
  box-shadow: 0 0 14px var(--dg-arcane-glow);
}

.settle-slot__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  color: var(--dg-text-muted);
  font-size: 0.72rem;
}

.settle-slot__reason {
  color: var(--dg-text-faint);
}

.settle-slot__empty {
  display: flex;
  width: 10rem;
  height: 15rem;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--dg-line-strong);
  color: var(--dg-text-faint);
  font-size: 0.78rem;
}

.settle-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.7rem 0.9rem;
}

.settle-row__title {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1rem;
}

.settle-row__title--status {
  color: #f0b9f5;
}

.settle-row__desc {
  color: var(--dg-text);
  font-size: 0.86rem;
  line-height: 1.5;
}

.settle-row__extra {
  color: var(--dg-gold);
  font-size: 0.8rem;
}

.settle-price {
  margin-top: 0.3rem;
  color: var(--dg-coin);
  font-family: var(--dg-font-data);
  font-size: 0.85rem;
}

.settle-preset {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem;
}

.settle-preset__rule {
  display: block;
  width: 100%;
  height: 0.8rem;
  background: var(--dg-img-divider) center / contain no-repeat;
  opacity: 0.75;
}

.settle-curse-glow {
  filter: drop-shadow(0 0 16px rgba(217, 70, 239, 0.45));
}

.settle-arrow {
  color: var(--dg-gold);
  font-family: var(--dg-font-title);
  font-size: 1.6rem;
  text-shadow: 0 0 8px rgba(240, 208, 138, 0.4);
}

.settle-result-line {
  max-width: 36rem;
  color: var(--dg-text);
  font-size: 0.95rem;
  line-height: 1.6;
  text-align: center;
}

.settle-reveal {
  animation: settle-reveal 0.45s ease-out both;
}

@keyframes settle-reveal {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settle-reveal,
  .settle-replace__float {
    animation: none;
  }
}
</style>
