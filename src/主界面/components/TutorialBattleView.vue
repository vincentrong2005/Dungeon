<!-- eslint-disable better-tailwindcss/no-unknown-classes, better-tailwindcss/enforce-canonical-classes -->
<template>
  <div ref="viewportRef" class="tutorial-battle-viewport fixed inset-0 z-[180] bg-black">
    <div
      ref="stageRef"
      class="tutorial-battle-stage absolute left-1/2 top-1/2"
      :style="stageStyle"
    >
      <CombatView
        :key="battleKey"
        class="size-full"
        enemy-name="训练人偶"
        :initial-player-stats="trainingPlayerStats"
        :player-deck="trainingDeck"
        :player-active-skills="trainingActiveSkills"
        :player-relics="{}"
        background-area-override="魔女的小窝"
        :track-discovery="false"
        :preserve-player-deck-order="true"
        :tutorial-dice-script="tutorialDiceScript"
        :tutorial-initial-reroll-charges="1"
        @end-combat="handleEndCombat"
        @player-card-selected="handlePlayerCardSelected"
        @player-dice-rerolled="handlePlayerDiceRerolled"
        @active-skill-used="handleActiveSkillUsed"
        @turn-resolved="handleTurnResolved"
        @ready="battleReady = true"
        @open-deck="deckOpen = true"
        @open-relics="relicsOpen = true"
        @open-glossary="referenceOpen = true"
      />

      <div class="tutorial-battle-topbar absolute inset-x-0 top-0 z-[250] flex justify-end gap-3 p-4">
        <button type="button" class="tutorial-battle-reference" @click="guideOpen = true">文字参考</button>
        <button type="button" class="tutorial-battle-exit" title="退出训练战" @click="emit('close')">退出训练战</button>
      </div>

      <div v-if="lessonVisible" class="tutorial-lesson-layer absolute inset-0 z-[220]" aria-live="polite">
        <template v-if="spotlightRect">
          <div
            v-for="(segment, index) in shadeSegments"
            :key="`shade-${index}`"
            class="tutorial-lesson-shade absolute"
            :style="segment"
          ></div>
          <div
            class="tutorial-lesson-focus absolute"
            :class="{ 'is-locked': !actionReady }"
            :style="focusStyle"
            aria-hidden="true"
          ></div>
        </template>
        <div v-else class="tutorial-lesson-shade absolute inset-0"></div>

        <section class="tutorial-lesson-callout absolute" :style="calloutStyle">
          <header class="tutorial-lesson-head">
            <span class="tutorial-lesson-progress">训练战 · {{ stepIndex + 1 }} / {{ steps.length }}</span>
            <span class="tutorial-lesson-dots" aria-hidden="true">
              <i
                v-for="(entry, i) in steps"
                :key="entry.id"
                :class="{ 'is-on': i === stepIndex, 'is-done': i < stepIndex }"
              ></i>
            </span>
          </header>
          <h2>{{ currentStep.title }}</h2>
          <p v-for="line in currentStep.body" :key="line">{{ line }}</p>
          <p v-if="actionReady" class="tutorial-lesson-action-hint">{{ actionHint }}</p>
          <button
            v-if="!currentStep.action || !actionReady"
            type="button"
            class="tutorial-lesson-button"
            @click="handleLessonButton"
          >
            {{ lessonButtonLabel }}
          </button>
        </section>
      </div>

      <div v-if="battleResult" class="tutorial-battle-result absolute inset-0 z-[240] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div class="tutorial-battle-result-panel">
          <div class="tutorial-battle-result-mark" :class="battleResult === 'win' ? 'is-win' : 'is-lose'">
            {{ battleResult === 'win' ? '胜利' : battleResult === 'escape' ? '脱离' : '败北' }}
          </div>
          <h2>{{ battleResult === 'win' ? '训练完成' : '训练结束' }}</h2>
          <p>{{ battleResult === 'win' ? '你已经完成基础战斗演示。正式战斗中，请继续观察敌方意图与资源变化。' : '可以重新开始训练，重新熟悉四种卡牌与骰子规则。' }}</p>
          <div class="tutorial-battle-result-actions">
            <button type="button" class="tutorial-battle-result-button" @click="restartBattle">重新训练</button>
            <button type="button" class="tutorial-battle-result-button tutorial-battle-result-button--primary" @click="emit('close')">返回主界面</button>
          </div>
        </div>
      </div>
    </div>

    <DungeonModal title="训练战牌堆" :is-open="deckOpen" @close="deckOpen = false">
      <div class="tutorial-battle-info-panel">
        <p>训练战使用固定演示牌组，不会读取或修改你的正式牌组。</p>
        <div class="tutorial-battle-list">
          <div v-for="entry in trainingDeckSummary" :key="entry.name" class="tutorial-battle-list-row">
            <span>{{ entry.name }}</span><strong>×{{ entry.count }}</strong>
          </div>
        </div>
      </div>
    </DungeonModal>

    <DungeonModal title="训练战主动技能" :is-open="relicsOpen" @close="relicsOpen = false">
      <div class="tutorial-battle-info-panel">
        <p>本场不携带遗物，只提供两个基础主动技能。它们独立于手牌，不占用出牌回合。</p>
        <div class="tutorial-battle-list">
          <div v-for="skill in trainingActiveSkills" :key="skill.id" class="tutorial-battle-list-row tutorial-battle-list-row--stacked">
            <span>{{ skill.name }}</span>
            <small>MP {{ skill.manaCost }} · CD {{ skill.Cooldown }}</small>
            <em>{{ skill.description }}</em>
          </div>
        </div>
      </div>
    </DungeonModal>

    <GlossaryReferenceModal :is-open="referenceOpen" @close="referenceOpen = false" />
    <TutorialGuideModal :is-open="guideOpen" @close="guideOpen = false" @start-training="handleGuideStartTraining" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { getActiveSkillByName } from '../battle/activeSkillRegistry';
import { resolveCardNames } from '../battle/cardRegistry';
import type { ActiveSkillData, CardData, EntityStats } from '../types';
import CombatView from './CombatView.vue';
import DungeonModal from './DungeonModal.vue';
import GlossaryReferenceModal from './GlossaryReferenceModal.vue';
import TutorialGuideModal from './TutorialGuideModal.vue';

const emit = defineEmits<{ close: [] }>();

const trainingCardNames = [
  '普通闪避', '普通护盾', '普通物理攻击',
  '普通魔法攻击', '普通物理攻击', '普通护盾',
  '普通魔法攻击', '普通物理攻击', '普通闪避',
  '普通闪避', '普通物理攻击', '普通魔法攻击',
  '普通闪避', '普通魔法攻击', '普通物理攻击',
];
const trainingDeck = resolveCardNames(trainingCardNames);
const trainingActiveSkills = [
  getActiveSkillByName('重来！'),
  getActiveSkillByName('你也重来！'),
].filter((skill): skill is ActiveSkillData => skill !== null);
const trainingPlayerStats: EntityStats = {
  hp: 30,
  maxHp: 30,
  mp: 5,
  minDice: 1,
  maxDice: 6,
  effects: [],
};
const tutorialDiceScript = [
  { player: 6, enemy: 3 },
  { player: 5, enemy: 4 },
  { player: 1, enemy: 6 },
  { player: 5, enemy: 2 },
  { player: 3, enemy: 5 },
  { player: 4, enemy: 2 },
] as const;

type LessonId =
  | 'welcome'
  | 'intent'
  | 'dice'
  | 'status'
  | 'hand'
  | 'panels'
  | 'physical'
  | 'magic'
  | 'dodge'
  | 'function'
  | 'reroll'
  | 'active-skill'
  | 'complete';
type LessonStep = {
  id: LessonId;
  title: string;
  body: string[];
  button: string;
  target?: string;
  cardId?: string;
  action?: 'card' | 'reroll' | 'skill';
  actionHint?: string;
};

const steps: LessonStep[] = [
  {
    id: 'welcome',
    title: '训练战开始',
    body: [
      '这是一场独立的训练战，不会读取或修改你的正式存档。',
      '先花一分钟认识战场的几个区域，再逐一试出四种卡牌、重掷与主动技能。',
    ],
    button: '开始',
  },
  {
    id: 'intent',
    title: '敌方意图',
    body: [
      '上方这张牌，是训练人偶本回合准备打出的牌。',
      '每回合出牌前先看它：对方要攻击、施法还是闪避，决定了你该出什么。',
    ],
    button: '下一步',
    target: '.enemy-intent-anchor',
  },
  {
    id: 'dice',
    title: '双方的骰子',
    body: [
      '左边是你的骰子，右边是敌人的骰子；拼点时比较的就是这两个点数。',
      '骰子每回合重新掷出，点数范围写在各自的状态栏上。',
    ],
    button: '下一步',
    target: '.player-dice-anchor, .enemy-dice-anchor',
  },
  {
    id: 'status',
    title: '状态栏',
    body: [
      '红条是 HP，蓝条是 MP，盾形数字是护甲。',
      'HP 归零即战斗失败；MP 用来支付法术牌与主动技能。',
    ],
    button: '下一步',
    target: '.combat-status-bar--player, .combat-status-bar--enemy',
  },
  {
    id: 'hand',
    title: '手牌区',
    body: [
      '每回合抽 3 张牌，只能打出其中 1 张。',
      '颜色代表类型：红色攻击、蓝色法术、绿色闪避、黄色行动。接下来逐一试一遍。',
    ],
    button: '下一步',
    target: '.combat-hand-anchor',
  },
  {
    id: 'panels',
    title: '日志与牌堆',
    body: [
      '右上角可以展开战斗日志，回看每回合发生了什么；也能查看牌库与弃牌堆。',
      '训练中随时可以点「文字参考」查看完整的规则说明。',
    ],
    button: '开始实战',
    target: '.combat-top-right-panel',
  },
  {
    id: 'physical',
    title: '红色攻击牌：比点数',
    body: [
      '双方都使用攻击牌时会进行拼点，点数较高的一方攻击较低的一方。',
      '点数相同则判定为平局，双方都不造成伤害。',
    ],
    button: '好的，这就试试',
    cardId: 'basic_physical',
    action: 'card',
    actionHint: '请点击聚焦的红色攻击牌，观察一次拼点。',
  },
  {
    id: 'magic',
    title: '蓝色法术牌：消耗 MP',
    body: [
      '双方都使用法术牌时，同样进行拼点。法术牌会消耗 MP，请留意左侧蓝条。',
      '法术牌遇到物理攻击牌时不参与拼点，并且由法术牌优先攻击。',
    ],
    button: '明白了，试试法术',
    cardId: 'basic_magic',
    action: 'card',
    actionHint: '请点击聚焦的蓝色法术牌。',
  },
  {
    id: 'dodge',
    title: '绿色闪避牌：反向拼点',
    body: [
      '闪避牌可以应对攻击牌或法术牌。这里点数越低越好：你的闪避点数小于对方时，闪避成功。',
      '双方都使用闪避牌时，双方相安无事。',
    ],
    button: '知道了，试试闪避',
    cardId: 'basic_dodge',
    action: 'card',
    actionHint: '请点击聚焦的绿色闪避牌。',
  },
  {
    id: 'function',
    title: '黄色行动牌：先行动',
    body: [
      '行动牌不参与拼点，优先级最高；双方都使用行动牌时，玩家先行动。',
      '普通护盾会提供护甲。护甲能抵挡物理与法术伤害，但无法抵挡真实伤害，并会在回合结束时自动减半。',
    ],
    button: '知道了，试试护盾',
    cardId: 'basic_shield',
    action: 'card',
    actionHint: '请点击聚焦的黄色行动牌，观察护甲变化。',
  },
  {
    id: 'reroll',
    title: '拼点失败后：重掷骰子',
    body: [
      '正式战斗中，如果上一回合拼点失败，你会获得重掷次数。本训练场为方便演示预置了1次重掷机会；点击自己的骰子，就能在出牌阶段使用一次重掷。',
      '重掷次数有限，请把它留给关键回合。',
    ],
    button: '知道了，看看骰子',
    target: '.player-dice-anchor',
    action: 'reroll',
    actionHint: '若下方显示重掷次数，请点击你的骰子；若本轮没有次数，点击按钮继续。',
  },
  {
    id: 'active-skill',
    title: '主动技能：独立于手牌',
    body: [
      '左下角的“重来！”与“你也重来！”属于主动技能，不占用本回合的出牌机会，出牌阶段可随时使用。',
      '每个技能都有 MP 消耗与 CD 冷却回合数；使用前先确认蓝条和技能底部的状态。',
    ],
    button: '懂了!',
    target: '[data-tutorial-active-skill="0"]',
    action: 'skill',
    actionHint: '请点击聚焦的主动技能，观察骰子重掷与 MP 消耗。',
  },
  {
    id: 'complete',
    title: '训练完成',
    body: [
      '你已经掌握战场布局、四种卡牌、拼点、护甲、重掷与主动技能。',
      '真实伤害会无视护甲减免，也不受增减伤效果影响；遇到带有真实伤害的牌时要格外谨慎。',
      '现在可以继续和训练人偶练习，也可以退出训练战开始正式冒险。',
    ],
    button: '开始自由练习',
  },
];

const battleKey = ref(0);
const battleReady = ref(false);
const battleResult = ref<'win' | 'lose' | 'escape' | null>(null);
const deckOpen = ref(false);
const relicsOpen = ref(false);
const referenceOpen = ref(false);
const guideOpen = ref(false);
const stepIndex = ref(0);
const actionReady = ref(false);
const actionNotice = ref('');
const awaitingResolution = ref(false);
const tutorialComplete = ref(false);
const viewportRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const stageScale = ref(1);
const spotlightRect = ref<{ left: number; top: number; right: number; bottom: number } | null>(null);
let resizeObserver: ResizeObserver | null = null;
let targetRefreshTimer: ReturnType<typeof setInterval> | null = null;

const currentStep = computed(() => steps[stepIndex.value]!);
const lessonVisible = computed(() => (
  battleReady.value
  && !battleResult.value
  && !tutorialComplete.value
  && !awaitingResolution.value
));
const lessonButtonLabel = computed(() => currentStep.value.button);
const actionHint = computed(() => actionNotice.value || currentStep.value.actionHint || '');
const trainingDeckSummary = computed(() => {
  const counts = new Map<string, number>();
  for (const name of trainingCardNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
});

const stageStyle = computed(() => ({
  width: '1920px',
  height: '1080px',
  transform: `translate(-50%, -50%) scale(${stageScale.value})`,
}));

// 讲解阶段就高亮目标（此时高亮框会拦截点击，避免提前出牌）；确认后才允许点击
const targetSelector = computed(() => {
  const step = currentStep.value;
  if (step.cardId) return `[data-tutorial-card-id="${step.cardId}"]`;
  return step.target ?? '';
});

const refreshStageScale = () => {
  const viewport = viewportRef.value;
  if (!viewport) return;
  stageScale.value = Math.min(viewport.clientWidth / 1920, viewport.clientHeight / 1080, 1);
  refreshSpotlight();
};

const refreshSpotlight = () => {
  const stage = stageRef.value;
  if (!stage || !lessonVisible.value || !targetSelector.value) {
    spotlightRect.value = null;
    return;
  }
  // 选择器可用逗号列出多个区域（如双方骰子），高亮取并集
  const targets = Array.from(stage.querySelectorAll<HTMLElement>(targetSelector.value)).filter(
    el => el.getClientRects().length > 0,
  );
  if (targets.length === 0) {
    spotlightRect.value = null;
    return;
  }
  const stageBounds = stage.getBoundingClientRect();
  const scale = stageScale.value || 1;
  const padding = 12;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const target of targets) {
    const b = target.getBoundingClientRect();
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  }
  spotlightRect.value = {
    left: Math.max(0, (left - stageBounds.left) / scale - padding),
    top: Math.max(0, (top - stageBounds.top) / scale - padding),
    right: Math.min(1920, (right - stageBounds.left) / scale + padding),
    bottom: Math.min(1080, (bottom - stageBounds.top) / scale + padding),
  };
};

const shadeSegments = computed(() => {
  const rect = spotlightRect.value;
  if (!rect) return [];
  return [
    { left: '0px', top: '0px', width: '1920px', height: `${rect.top}px` },
    { left: '0px', top: `${rect.top}px`, width: `${rect.left}px`, height: `${rect.bottom - rect.top}px` },
    { left: `${rect.right}px`, top: `${rect.top}px`, width: `${1920 - rect.right}px`, height: `${rect.bottom - rect.top}px` },
    { left: '0px', top: `${rect.bottom}px`, width: '1920px', height: `${1080 - rect.bottom}px` },
  ];
});

const focusStyle = computed(() => {
  const rect = spotlightRect.value;
  return rect
    ? { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.right - rect.left}px`, height: `${rect.bottom - rect.top}px` }
    : {};
});

const calloutStyle = computed(() => {
  const rect = spotlightRect.value;
  if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  const width = 500;
  const height = 360;
  const rightPosition = rect.right + 28;
  const left = rightPosition + width <= 1920 - 26
    ? rightPosition
    : Math.max(26, rect.left - width - 28);
  const top = Math.max(26, Math.min(1080 - height - 26, rect.top + ((rect.bottom - rect.top) - height) / 2));
  return { left: `${left}px`, top: `${top}px` };
});

const goToStep = (nextIndex: number) => {
  stepIndex.value = Math.max(0, Math.min(steps.length - 1, nextIndex));
  actionReady.value = false;
  actionNotice.value = '';
  void nextTick(refreshSpotlight);
};

const handleLessonButton = () => {
  const step = currentStep.value;
  if (step.id === 'complete') {
    tutorialComplete.value = true;
    actionReady.value = false;
    actionNotice.value = '';
    spotlightRect.value = null;
    return;
  }
  if (step.action && !actionReady.value) {
    actionReady.value = true;
    actionNotice.value = '';
    void nextTick(refreshSpotlight);
  } else if (!step.action) {
    goToStep(stepIndex.value + 1);
  }
};

const handlePlayerCardSelected = (card: CardData) => {
  const step = currentStep.value;
  if (!actionReady.value || step.action !== 'card' || awaitingResolution.value) return;
  if (step.cardId && card.id !== step.cardId) {
    actionNotice.value = '先选择高亮的对应颜色卡牌；其他卡牌留到后面的步骤。';
    return;
  }
  awaitingResolution.value = true;
  actionReady.value = false;
  actionNotice.value = '';
  spotlightRect.value = null;
};

const handleTurnResolved = () => {
  if (!awaitingResolution.value) return;
  awaitingResolution.value = false;
  goToStep(stepIndex.value + 1);
};

const handlePlayerDiceRerolled = () => {
  if (currentStep.value.action !== 'reroll' || !actionReady.value) return;
  goToStep(stepIndex.value + 1);
};

const handleActiveSkillUsed = () => {
  if (currentStep.value.action !== 'skill' || !actionReady.value) return;
  goToStep(stepIndex.value + 1);
};

const handleEndCombat = (outcome: 'win' | 'lose' | 'escape') => {
  battleResult.value = outcome;
};

const restartBattle = () => {
  battleReady.value = false;
  battleResult.value = null;
  deckOpen.value = false;
  relicsOpen.value = false;
  referenceOpen.value = false;
  guideOpen.value = false;
  stepIndex.value = 0;
  actionReady.value = false;
  actionNotice.value = '';
  awaitingResolution.value = false;
  tutorialComplete.value = false;
  battleKey.value += 1;
  void nextTick(refreshSpotlight);
};

const handleGuideStartTraining = () => {
  guideOpen.value = false;
  restartBattle();
};

onMounted(() => {
  refreshStageScale();
  resizeObserver = new ResizeObserver(refreshStageScale);
  if (viewportRef.value) resizeObserver.observe(viewportRef.value);
  targetRefreshTimer = setInterval(refreshSpotlight, 250);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (targetRefreshTimer !== null) clearInterval(targetRefreshTimer);
  targetRefreshTimer = null;
});
</script>

<style scoped>
.tutorial-battle-viewport { font-family: var(--font-ui, ui-sans-serif, system-ui, sans-serif); }
.tutorial-battle-stage { transform-origin: center center; overflow: hidden; }
.tutorial-battle-topbar { pointer-events: none; }
.tutorial-battle-topbar button { pointer-events: auto; }
.tutorial-battle-reference,
.tutorial-battle-exit { border: 1px solid rgba(201, 161, 96, 0.5); background: rgba(10, 7, 9, 0.82); padding: 0.6rem 1.1rem; color: var(--dg-text, #e8dcc4); font-family: var(--dg-font-title, serif); font-size: 0.9rem; letter-spacing: 0.14em; transition: border-color 160ms ease, color 160ms ease; }
.tutorial-battle-reference:hover, .tutorial-battle-exit:hover { border-color: rgba(232, 190, 110, 0.9); color: var(--dg-gold-bright, #f6d89a); }
.tutorial-battle-exit { border-color: rgba(200, 70, 60, 0.6); color: #f3c2b6; }
.tutorial-battle-exit:hover { border-color: rgba(255, 120, 100, 0.9); color: #ffd9cf; }
.tutorial-lesson-layer { pointer-events: none; }
.tutorial-lesson-shade { pointer-events: auto; background: rgba(4, 5, 10, 0.72); }
/* 高亮框：讲解阶段拦截点击（is-locked），确认后放行 */
.tutorial-lesson-focus { pointer-events: none; border: 1px solid rgba(255, 214, 140, 0.95); border-radius: 8px; box-shadow: 0 0 0 3px rgba(20, 12, 8, 0.65), 0 0 22px rgba(232, 170, 70, 0.6), inset 0 0 16px rgba(232, 170, 70, 0.25); transition: all 0.35s cubic-bezier(0.2, 0.8, 0.3, 1); animation: tutorial-focus-pulse 2.2s ease-in-out infinite; }
.tutorial-lesson-focus.is-locked { pointer-events: auto; cursor: default; }
.tutorial-lesson-shade { transition: all 0.35s cubic-bezier(0.2, 0.8, 0.3, 1); }
/* 指引卡：与主界面新手指引同一套魔典框 */
.tutorial-lesson-callout { pointer-events: auto; width: 500px; background: var(--dg-bg-panel, #120c0a); padding: 1.8rem 2rem 1.5rem; color: var(--dg-text, #e8dcc4); box-shadow: 0 18px 46px rgba(0, 0, 0, 0.65); transition: left 0.35s cubic-bezier(0.2, 0.8, 0.3, 1), top 0.35s cubic-bezier(0.2, 0.8, 0.3, 1); }
/* 魔典框外扩覆盖，内缘压在底色边上，避免框与底色之间的缝隙 */
.tutorial-lesson-callout::before { position: absolute; z-index: 1; inset: -10px; border-style: solid; border-width: 36px; border-image-source: var(--dg-img-frame); border-image-slice: 120; border-image-repeat: stretch; pointer-events: none; content: ''; }
.tutorial-lesson-head { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding-bottom: 0.6rem; border-bottom: 1px solid rgba(201, 161, 96, 0.3); }
.tutorial-lesson-progress { color: rgba(201, 161, 96, 0.85); font-family: var(--dg-font-title, serif); font-size: 0.85rem; letter-spacing: 0.2em; }
.tutorial-lesson-dots { display: flex; gap: 6px; }
.tutorial-lesson-dots i { width: 7px; height: 7px; border: 1px solid rgba(201, 161, 96, 0.7); transform: rotate(45deg); transition: background 0.25s ease; }
.tutorial-lesson-dots i.is-done { background: rgba(201, 161, 96, 0.55); }
.tutorial-lesson-dots i.is-on { border-color: #ffb08a; background: #b3191c; box-shadow: 0 0 6px rgba(255, 60, 40, 0.7); }
.tutorial-lesson-callout h2 { margin: 0.85rem 0 0.65rem; color: var(--dg-gold-bright, #f6d89a); font-family: var(--dg-font-title, serif); font-size: 1.75rem; font-weight: 600; letter-spacing: 0.08em; }
.tutorial-lesson-callout p { margin: 0.35rem 0; color: var(--dg-text, #e8dcc4); font-family: var(--dg-font-serif, serif); font-size: 1.08rem; line-height: 1.7; }
.tutorial-lesson-callout .tutorial-lesson-action-hint { position: relative; margin-top: 0.85rem; padding: 0.6rem 0.8rem 0.6rem 1.9rem; border-left: 2px solid #c0392b; background: rgba(120, 14, 18, 0.22); color: #ffd2b8; font-size: 1rem; }
.tutorial-lesson-callout .tutorial-lesson-action-hint::before { position: absolute; left: 0.75rem; top: 1.05rem; width: 7px; height: 7px; background: #e0392c; box-shadow: 0 0 6px rgba(255, 60, 40, 0.8); transform: rotate(45deg); content: ''; }
.tutorial-lesson-button { display: block; min-width: 9rem; margin: 1.1rem 0 0 auto; border-style: solid; border-width: 0 22px; border-image-source: var(--dg-img-button); border-image-slice: 0 80 fill; border-image-repeat: stretch; background: none; padding: 0.75rem 0.6rem; color: var(--dg-gold-bright, #f6d89a); font-family: var(--dg-font-title, serif); font-size: 1.02rem; letter-spacing: 0.16em; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85); transition: filter 160ms ease; }
.tutorial-lesson-button:hover { filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.35)); }
.tutorial-battle-result { pointer-events: auto; }
.tutorial-battle-result-panel { width: min(100%, 27rem); border: 1px solid rgba(245,158,11,0.42); background: rgba(22, 13, 10, 0.96); padding: 1.4rem; text-align: center; box-shadow: 0 24px 70px rgba(0,0,0,0.65); }
.tutorial-battle-result-mark { display: inline-flex; min-width: 5.5rem; justify-content: center; border: 1px solid currentColor; padding: 0.35rem 0.7rem; font-family: Georgia, serif; font-size: 1.1rem; letter-spacing: 0.18em; }
.tutorial-battle-result-mark.is-win { color: #86efac; }
.tutorial-battle-result-mark.is-lose { color: #fca5a5; }
.tutorial-battle-result-panel h2 { margin: 0.85rem 0 0.4rem; color: #ffedbd; font-family: Georgia, serif; font-size: 1.35rem; }
.tutorial-battle-result-panel p { margin: 0; color: rgba(255,244,214,0.7); font-size: 0.78rem; line-height: 1.7; }
.tutorial-battle-result-actions { display: flex; justify-content: center; gap: 0.6rem; margin-top: 1.1rem; }
.tutorial-battle-result-button { border: 1px solid rgba(245,158,11,0.35); background: rgba(77,44,19,0.3); padding: 0.5rem 0.8rem; color: #f9d98f; font-size: 0.75rem; }
.tutorial-battle-result-button:hover { border-color: rgba(245,158,11,0.75); background: rgba(120,67,22,0.45); }
.tutorial-battle-result-button--primary { border-color: rgba(52,211,153,0.42); color: #a7f3d0; background: rgba(6,78,59,0.3); }
.tutorial-battle-info-panel { display: flex; flex-direction: column; gap: 0.9rem; }
.tutorial-battle-info-panel p { margin: 0; color: rgba(255,244,214,0.68); font-size: 0.8rem; line-height: 1.7; }
.tutorial-battle-list { display: flex; flex-direction: column; gap: 0.45rem; }
.tutorial-battle-list-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); padding: 0.65rem 0.75rem; color: #ffe7ae; font-size: 0.8rem; }
.tutorial-battle-list-row strong { color: #f9d98f; }
.tutorial-battle-list-row--stacked { flex-direction: column; align-items: flex-start; gap: 0.2rem; }
.tutorial-battle-list-row small { color: rgba(255,244,214,0.5); }
.tutorial-battle-list-row em { color: rgba(255,244,214,0.7); font-size: 0.72rem; font-style: normal; }
@keyframes tutorial-focus-pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
@media (max-width: 700px) { .tutorial-lesson-callout { width: 440px; max-width: calc(100vw - 36px); } }
@media (prefers-reduced-motion: reduce) { .tutorial-lesson-focus { animation: none; } }
</style>
