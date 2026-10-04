<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <div
    class="active-skill-card relative shadow-xl"
    :class="isCompact ? 'active-skill-card--compact w-30 h-44' : 'w-[180px] h-[250px]'"
  >
    <CardFrameSkin class="active-skill-frame" type="active" :rare="skill?.rarity === '稀有'" />
    <span v-if="skill" class="active-gem-cost">
      <span class="active-gem-cost__value">{{ resolvedManaCost }}</span>
    </span>

    <div class="active-face">
      <template v-if="skill">
        <div class="active-face-heading">
          <h3 class="active-face-name" :title="skill.name">{{ skill.name }}</h3>
        </div>
        <div class="active-face-emblem"><Zap class="active-face-icon" /></div>
        <CardRulesPanel
          class="active-face-rules"
          :title="skill.name"
          :description="skill.description"
          :compact="isCompact"
          :show-trait-tags="false"
          surface-class="active-face-rules-surface"
        />
        <div class="active-face-footer">
          <span>CD {{ skill.Cooldown }}</span>
          <span v-if="footerRightText" :class="footerToneClass">{{ footerRightText }}</span>
        </div>
      </template>
      <div v-else class="active-face-empty">{{ emptyLabel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Zap } from 'lucide-vue-next';
import CardRulesPanel from './CardRulesPanel.vue';
import CardFrameSkin from './CardFrameSkin.vue';
import type { ActiveSkillData } from '../types';

type FooterTone = 'default' | 'success' | 'warning' | 'muted';

const props = withDefaults(
  defineProps<{
    skill: ActiveSkillData | null;
    manaCost?: number | null;
    size?: 'default' | 'compact';
    footerRightText?: string;
    footerRightTone?: FooterTone;
    emptyLabel?: string;
  }>(),
  {
    manaCost: null,
    size: 'default',
    footerRightText: '',
    footerRightTone: 'muted',
    emptyLabel: '空主动槽位',
  },
);

const isCompact = computed(() => props.size === 'compact');
const resolvedManaCost = computed(() => props.manaCost ?? props.skill?.manaCost ?? 0);

const footerToneClass = computed(() => {
  switch (props.footerRightTone) {
    case 'success':
      return 'text-emerald-300/90';
    case 'warning':
      return 'text-amber-200/90';
    case 'default':
      return 'text-dungeon-paper/80';
    default:
      return 'text-white/55';
  }
});
</script>

<style scoped>
.active-skill-card {
  isolation: isolate;
}

.active-skill-frame {
  transform: scale(1.1);
  transform-origin: center;
}

.active-face {
  position: absolute;
  z-index: 2;
  inset: 17% 21% 19%;
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-radius: 5px;
  background: linear-gradient(160deg, rgba(39, 42, 54, 0.94), rgba(10, 13, 23, 0.98));
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.65);
  color: #f0f2f9;
}

.active-face-heading {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 10px 2px 2px;
  border-bottom: 1px solid rgba(199, 216, 244, 0.35);
}

.active-gem-cost {
  position: absolute;
  top: 8%;
  left: 50%;
  z-index: 5;
  display: grid;
  width: 30px;
  height: 24px;
  place-items: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.active-gem-cost__value {
  color: #fff;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22.5px;
  font-weight: 900;
  line-height: 1;
  -webkit-text-stroke: 1px #000;
  text-shadow: 0 1px 1px #000, 0 0 3px #000, 0 0 5px rgba(158, 194, 255, 0.72);
}

.active-face-name {
  display: -webkit-box;
  overflow: hidden;
  max-height: 31px;
  margin: 0 2px;
  text-align: center;
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}

.active-face-emblem {
  display: grid;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  background: radial-gradient(ellipse, rgba(211, 225, 255, 0.25), transparent 70%);
}

.active-face-icon {
  width: 19px;
  height: 19px;
  color: #d9e4fa;
}

.active-face-rules {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.active-face-rules :deep(.active-face-rules-surface) {
  height: 100%;
  max-height: none;
  padding: 2px 3px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.28);
  color: #e3e9f4;
  font-size: 9px;
  line-height: 1.25;
}

.active-face-rules :deep(.active-face-rules-surface > div) {
  height: 100%;
  max-height: none;
}

.active-face-footer {
  display: flex;
  min-height: 16px;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  border-top: 1px solid rgba(199, 216, 244, 0.3);
  color: #cbdcf7;
  font-size: 9px;
  white-space: nowrap;
}

.active-face-empty {
  display: grid;
  flex: 1;
  place-items: center;
  text-align: center;
  font-size: 11px;
  color: #aab5c9;
}

.active-skill-card--compact .active-face-heading { min-height: 32px; padding: 7px 1px 2px; }
.active-skill-card--compact .active-face-name { font-size: 9px; max-height: 23px; }
.active-skill-card--compact .active-face-emblem { height: 17px; flex-basis: 17px; }
.active-skill-card--compact .active-face-icon { width: 14px; height: 14px; }
.active-skill-card--compact .active-gem-cost__value { font-size: 18px; }
.active-skill-card--compact .active-face-footer { min-height: 13px; font-size: 8px; }
.active-skill-card--compact .active-face-rules :deep(.active-face-rules-surface) { font-size: 8px; padding: 1px; }

</style>
