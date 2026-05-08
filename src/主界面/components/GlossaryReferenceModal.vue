<template>
  <DungeonModal
    title="词条与状态"
    :is-open="isOpen"
    panel-class="glossary-reference-modal !max-w-[min(94vw,980px)]"
    @close="$emit('close')"
  >
    <div class="glossary-reference-root">
      <section class="glossary-reference-section">
        <div class="glossary-reference-head">
          <div>
            <div class="glossary-reference-title">卡牌词条</div>
            <div class="glossary-reference-subtitle">卡牌说明中出现的通用规则</div>
          </div>
          <span class="glossary-reference-count">{{ termEntries.length }}</span>
        </div>

        <div class="glossary-reference-grid">
          <article
            v-for="entry in termEntries"
            :key="entry.key"
            class="glossary-reference-card"
            :class="toneClass(entry.polarity)"
          >
            <div class="glossary-reference-card-title">{{ entry.label }}</div>
            <p class="glossary-reference-card-desc">{{ entry.description }}</p>
          </article>
        </div>
      </section>

      <section class="glossary-reference-section">
        <div class="glossary-reference-head">
          <div>
            <div class="glossary-reference-title">已解锁状态</div>
            <div class="glossary-reference-subtitle">来自魔女的收藏中已记录的状态</div>
          </div>
          <span class="glossary-reference-count">{{ unlockedEffectEntries.length }}</span>
        </div>

        <div v-if="unlockedEffectEntries.length > 0" class="glossary-reference-grid">
          <article
            v-for="entry in unlockedEffectEntries"
            :key="entry.type"
            class="glossary-reference-card"
            :class="toneClass(entry.polarity)"
          >
            <div class="glossary-reference-effect-title">
              <span class="glossary-reference-effect-icon">
                <i
                  v-if="entry.faClass"
                  :class="[entry.faClass, 'text-[14px] leading-none']"
                  :style="entry.faStyle"
                  aria-hidden="true"
                ></i>
                <span v-else>{{ entry.name.slice(0, 1) }}</span>
              </span>
              <span>{{ entry.name }}</span>
            </div>
            <p class="glossary-reference-card-desc">{{ entry.description || '暂无说明' }}</p>
          </article>
        </div>
        <div v-else class="glossary-reference-empty">
          尚未记录任何状态。战斗中遇到状态后会自动加入这里。
        </div>
      </section>
    </div>
  </DungeonModal>
</template>

<script setup lang="ts">
import { getCardKeywordGlossaryEntries, getCardTraitGlossaryEntries, type CardGlossaryEntry } from '../battle/cardTextGlossary';
import { EFFECT_REGISTRY, getEffectDisplayOrder } from '../battle/effects';
import { loadCodexState } from '../codexStore';
import { getEffectFontAwesomeClass, getEffectFontAwesomeStyle } from '../effectIconRegistry';
import type { CardTraits, EffectPolarity, EffectType } from '../types';
import DungeonModal from './DungeonModal.vue';

const props = defineProps<{ isOpen: boolean }>();
defineEmits<{ close: [] }>();

const allTraitEntries = (): CardGlossaryEntry[] => {
  const baseTraits: CardTraits = {
    combo: true,
    reroll: 'self',
    draw: true,
    unplayable: true,
    destroyOnClashWin: true,
    purgeOnUse: true,
    insertCardsToEnemyDeck: ['指定卡牌'],
  };
  return [
    ...getCardTraitGlossaryEntries(baseTraits),
    ...getCardTraitGlossaryEntries({ combo: false, reroll: 'enemy', draw: false }),
  ];
};

const uniqGlossaryEntries = (entries: CardGlossaryEntry[]): CardGlossaryEntry[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
};

const termEntries = computed(() => uniqGlossaryEntries([
  ...allTraitEntries(),
  ...getCardKeywordGlossaryEntries('负面效果 法力汲取 群攻 逃离 自伤'),
]));

const codex = ref(loadCodexState());
const unlockedEffectTypes = computed(() => new Set(codex.value.effects));
const unlockedEffectEntries = computed(() => (
  Object.entries(EFFECT_REGISTRY)
    .filter(([type]) => unlockedEffectTypes.value.has(type as EffectType))
    .map(([type, def]) => ({
      type,
      name: def.name,
      description: def.description ?? '',
      polarity: def.polarity,
      faClass: getEffectFontAwesomeClass(type as EffectType),
      faStyle: getEffectFontAwesomeStyle(type as EffectType),
    }))
    .sort((a, b) => {
      const orderComp = getEffectDisplayOrder(a.type as EffectType) - getEffectDisplayOrder(b.type as EffectType);
      if (orderComp !== 0) return orderComp;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    })
));

const toneClass = (polarity?: EffectPolarity | 'trait') => {
  if (polarity === 'buff') return 'glossary-reference-card--buff';
  if (polarity === 'debuff') return 'glossary-reference-card--debuff';
  if (polarity === 'mixed') return 'glossary-reference-card--mixed';
  if (polarity === 'special') return 'glossary-reference-card--special';
  return 'glossary-reference-card--trait';
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      codex.value = loadCodexState();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.glossary-reference-root {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.glossary-reference-section {
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 0.5rem;
  background:
    linear-gradient(145deg, rgba(16, 12, 10, 0.86), rgba(35, 24, 15, 0.58)),
    radial-gradient(circle at 12% 0%, rgba(251, 191, 36, 0.14), transparent 40%);
  padding: 1rem;
}

.glossary-reference-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.glossary-reference-title {
  color: rgba(254, 243, 199, 0.98);
  font-family: var(--font-heading);
  font-size: 1rem;
  letter-spacing: 0.12em;
}

.glossary-reference-subtitle {
  margin-top: 0.12rem;
  color: rgba(253, 230, 138, 0.56);
  font-size: 0.75rem;
}

.glossary-reference-count {
  min-width: 2rem;
  border: 1px solid rgba(251, 191, 36, 0.34);
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.24);
  color: rgba(253, 230, 138, 0.9);
  font-size: 0.75rem;
  line-height: 1.35rem;
  text-align: center;
}

.glossary-reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.65rem;
}

.glossary-reference-card {
  min-height: 5.8rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left-width: 3px;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.24);
  padding: 0.72rem 0.78rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.glossary-reference-card--buff {
  border-left-color: rgba(74, 222, 128, 0.82);
}

.glossary-reference-card--debuff {
  border-left-color: rgba(248, 113, 113, 0.82);
}

.glossary-reference-card--mixed {
  border-left-color: rgba(168, 85, 247, 0.82);
}

.glossary-reference-card--special {
  border-left-color: rgba(56, 189, 248, 0.82);
}

.glossary-reference-card--trait {
  border-left-color: rgba(251, 191, 36, 0.82);
}

.glossary-reference-card-title,
.glossary-reference-effect-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: rgba(255, 247, 237, 0.95);
  font-size: 0.88rem;
  font-weight: 700;
}

.glossary-reference-effect-icon {
  display: inline-flex;
  width: 1.45rem;
  height: 1.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.26);
  color: rgba(253, 230, 138, 0.9);
  font-size: 0.72rem;
}

.glossary-reference-card-desc {
  margin-top: 0.42rem;
  color: rgba(255, 237, 213, 0.72);
  font-size: 0.76rem;
  line-height: 1.55;
}

.glossary-reference-empty {
  border: 1px dashed rgba(251, 191, 36, 0.26);
  border-radius: 0.5rem;
  padding: 1.6rem;
  color: rgba(253, 230, 138, 0.62);
  text-align: center;
}
</style>
