<template>
  <div
    class="active-skill-card relative shadow-xl"
    :class="[
      isCompact ? 'active-skill-card--compact w-30 h-44' : 'w-[180px] h-[250px]',
      skill?.rarity === '稀有' ? 'active-skill-card--rare' : '',
    ]"
  >
    <CardFrameSkin class="active-skill-frame" type="active" />

    <div class="active-face">
      <div v-if="skill" class="active-face-heading">
        <span class="active-face-cost">{{ resolvedManaCost }}</span>
        <span v-if="showActiveBadge" class="active-face-badge">主动</span>
      </div>
      <template v-if="skill">
        <h3 class="active-face-name" :title="skill.name">{{ skill.name }}</h3>
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
    showActiveBadge?: boolean;
  }>(),
  {
    manaCost: null,
    size: 'default',
    footerRightText: '',
    footerRightTone: 'muted',
    emptyLabel: '空主动槽位',
    showActiveBadge: true,
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
  inset: 22% 21% 24%;
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
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(199, 216, 244, 0.35);
  font-size: 10px;
  font-weight: 700;
}

.active-face-cost {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid rgba(208, 223, 250, 0.6);
  border-radius: 50%;
  background: #202a40;
}

.active-face-badge {
  color: #cbdcf7;
  font-size: 9px;
}

.active-face-name {
  display: -webkit-box;
  overflow: hidden;
  max-height: 31px;
  margin: 4px 2px 0;
  text-align: center;
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  -webkit-box-orient: vertical;
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
  scrollbar-width: thin;
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

.active-skill-card--compact .active-face-heading { min-height: 17px; }
.active-skill-card--compact .active-face-name { font-size: 9px; max-height: 23px; margin-top: 2px; }
.active-skill-card--compact .active-face-emblem { height: 17px; flex-basis: 17px; }
.active-skill-card--compact .active-face-icon { width: 14px; height: 14px; }
.active-skill-card--compact .active-face-cost { width: 15px; height: 15px; font-size: 9px; }
.active-skill-card--compact .active-face-badge { font-size: 8px; }
.active-skill-card--compact .active-face-footer { min-height: 13px; font-size: 8px; }
.active-skill-card--compact .active-face-rules :deep(.active-face-rules-surface) { font-size: 8px; padding: 1px; }

.active-skill-card--rare {
  filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.36));
}
</style>
