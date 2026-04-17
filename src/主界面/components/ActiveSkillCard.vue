<template>
  <div
    class="active-skill-card relative rounded-xl border-2 shadow-xl overflow-visible"
    :class="[
      skill ? 'border-zinc-100/85 bg-[#1b1722] text-dungeon-paper' : 'border-white/20 bg-[#15131c]/95 text-white/45',
      isCompact ? 'w-30 h-44' : 'w-[180px] h-[250px]',
      skill?.rarity === '稀有' ? 'active-skill-card--rare' : '',
    ]"
  >
    <div
      class="absolute inset-0"
      :class="
        skill
          ? 'bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,0.2),rgba(20,18,28,0.95)_66%)]'
          : 'bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,0.08),rgba(16,14,22,0.96)_66%)]'
      "
      style="border-radius: inherit"
    ></div>

    <template v-if="skill">
      <div class="absolute top-0 left-0 z-10 flex w-full items-start justify-between p-2">
        <div
          class="flex items-center justify-center rounded-full border font-bold shadow-md"
          :class="[
            isCompact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px]',
            resolvedManaCost > 0
              ? 'border-purple-300/40 bg-purple-700/80 text-white'
              : 'border-zinc-300/35 bg-zinc-700/60 text-zinc-100',
          ]"
        >
          {{ resolvedManaCost }}
        </div>
        <div
          v-if="showActiveBadge"
          class="rounded-full border border-white/10 bg-black/60 p-1 text-[10px] leading-none text-zinc-100"
        >
          主动
        </div>
      </div>

      <div
        class="absolute left-2 right-2 overflow-hidden rounded-lg border border-white/10 bg-black/45"
        :class="isCompact ? 'top-8 h-16' : 'top-8 h-24'"
      >
        <div
          class="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,245,245,0.35),rgba(140,140,160,0.08)_60%,rgba(12,10,18,0.82))]"
        ></div>
        <div class="relative flex h-full items-center justify-center">
          <span class="font-heading select-none text-white/25" :class="isCompact ? 'text-2xl' : 'text-4xl'">
            {{ skill.name[0] || '?' }}
          </span>
        </div>
      </div>

      <div class="absolute bottom-0 left-0 z-10 w-full" :class="isCompact ? 'p-1.5' : 'p-3'">
        <div
          class="mb-1 text-center font-heading font-bold tracking-wide text-dungeon-paper drop-shadow-md"
          :class="isCompact ? 'text-[11px]' : 'text-sm'"
        >
          {{ skill.name }}
        </div>
        <CardRulesPanel
          :title="skill.name"
          :description="skill.description"
          :compact="isCompact"
          :show-trait-tags="false"
          surface-class="border border-white/10 bg-[#0d0d10]/85 text-center font-ui leading-tight text-gray-300"
        />
        <div class="mt-1 flex items-center justify-between text-[10px]">
          <span class="text-zinc-200/85">CD {{ skill.Cooldown }}</span>
          <span v-if="footerRightText" :class="footerToneClass">{{ footerRightText }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="absolute inset-0 flex items-center justify-center text-xs tracking-wider">
        {{ emptyLabel }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import CardRulesPanel from './CardRulesPanel.vue';
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
.active-skill-card--rare::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(250, 204, 21, 0.56);
  box-shadow:
    0 0 8px rgba(250, 204, 21, 0.38),
    0 0 18px rgba(245, 158, 11, 0.22);
  pointer-events: none;
}
</style>
