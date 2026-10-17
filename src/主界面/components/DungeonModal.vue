<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <div
        data-card-tooltip-boundary
        :class="[
          'dungeon-modal relative mx-4 flex max-h-[90%] w-full max-w-3xl flex-col overflow-hidden',
          { 'dungeon-modal--settings': variant === 'settings' },
          panelClass,
        ]"
      >
        <!-- Header -->
        <div class="dungeon-modal-header relative flex shrink-0 items-center justify-between">
          <h2 class="dungeon-modal-title"><component :is="icon ?? (variant === 'settings' ? SlidersHorizontal : PanelsTopLeft)" aria-hidden="true" />{{ title }}</h2>
          <button
            type="button"
            class="dungeon-modal-close"
            title="关闭"
            aria-label="关闭"
            data-ui-sound="cancel"
            @click="$emit('close')"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <!-- Body -->
        <div
          :id="bodyId"
          class="dungeon-modal-body relative flex-1 overflow-y-auto custom-scrollbar"
          @scroll="$emit('bodyScroll', $event)"
        >
          <slot>
            <div class="panel-empty">暂无数据</div>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { PanelsTopLeft, SlidersHorizontal, X } from 'lucide-vue-next';

defineProps<{
  title: string;
  isOpen: boolean;
  panelClass?: string;
  bodyId?: string;
  variant?: 'settings';
  icon?: Component;
}>();

defineEmits<{
  close: [];
  bodyScroll: [event: Event];
}>();
</script>

<style scoped>
.dungeon-modal {
  --panel-bg: #151918;
  --panel-surface: #1c2121;
  --panel-border: #414644;
  --panel-divider: #ffffff12;
  --panel-accent: #c6ae76;
  --panel-text: #d8dcdb;
  --panel-muted: #939e98;
  --font-heading: 'Inter', 'Microsoft YaHei', sans-serif;
  border: 1px solid #716249;
  border-radius: 8px;
  background: var(--panel-bg);
  box-shadow: 0 28px 90px #000a;
  color: var(--panel-text);
  color-scheme: dark;
  font: 14px/1.6 'Inter', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0;
}
.dungeon-modal--settings { max-width: 760px; }
.dungeon-modal-header {
  gap: 16px;
  padding: 18px 26px;
  border-bottom: 1px solid var(--panel-divider);
  background: #1a1f1e;
}
.dungeon-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin: 0;
  font: 500 17px/1.4 'Inter', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0;
  color: #ece6d8;
  filter: none;
}
.dungeon-modal-title svg { width: 19px; height: 19px; flex-shrink: 0; color: var(--panel-accent); stroke-width: 1.5; }
.dungeon-modal-close { display: grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: #a7b1aa; cursor: pointer; transition: background 160ms, color 160ms; }
.dungeon-modal-close:hover { background: #ffffff09; color: #eee6d4; }
.dungeon-modal-close:focus-visible { outline: 2px solid var(--panel-accent); outline-offset: 3px; }
.dungeon-modal-close svg { width: 20px; height: 20px; stroke-width: 1.5; }
.dungeon-modal-body { min-height: 0; padding: 24px 26px; overflow-wrap: anywhere; scrollbar-color: #505a54 transparent; }
.dungeon-modal--settings .dungeon-modal-body { padding: 0 26px 24px; background: none; }

/* Shared controls keep slotted panels consistent without styling card artwork. */
.dungeon-modal .dungeon-modal-body :deep(.panel-tabs) { display: flex; flex-wrap: wrap; gap: 0; padding: 0; border: 0; border-bottom: 1px solid var(--panel-divider); border-radius: 0; background: var(--panel-bg); box-shadow: none; }
.dungeon-modal .dungeon-modal-body :deep(.panel-tab) { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 8px; min-width: 0; min-height: 48px; padding: 12px 14px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--panel-muted); font: inherit; font-size: 13px; letter-spacing: 0; box-shadow: none; transform: none; cursor: pointer; }
.dungeon-modal .dungeon-modal-body :deep(.panel-tab:hover) { background: #ffffff04; color: #dfd9c9; }
.dungeon-modal .dungeon-modal-body :deep(.panel-tab:is(.is-active, .active)) { border-bottom-color: var(--panel-accent); background: #ffffff03; color: #ddc89a; }
.dungeon-modal .dungeon-modal-body :deep(.panel-tab svg) { width: 17px; height: 17px; flex-shrink: 0; stroke-width: 1.6; }
.dungeon-modal .dungeon-modal-body :deep(.panel-section) { padding: 20px 0; border: 0; border-bottom: 1px solid var(--panel-divider); border-radius: 0; background: none; box-shadow: none; }
.dungeon-modal .dungeon-modal-body :deep(.panel-section:last-child) { border-bottom: 0; }
.dungeon-modal .dungeon-modal-body :deep(.panel-heading) { color: #e4dfd3; font: 500 14px/1.5 'Inter', 'Microsoft YaHei', sans-serif; letter-spacing: 0; text-shadow: none; }
.dungeon-modal .dungeon-modal-body :deep(.panel-item) { border: 1px solid var(--panel-border); border-radius: 6px; background: var(--panel-surface); box-shadow: none; transform: none; }
.dungeon-modal .dungeon-modal-body :deep(button.panel-item:hover:not(:disabled)) { border-color: #857653; background: #232a26; box-shadow: none; transform: none; }
.dungeon-modal .dungeon-modal-body :deep(.panel-item:is(.is-active, .is-selected, .is-equipped)) { border-color: var(--panel-accent); background: #27302a; box-shadow: inset 0 0 0 1px #c6ae7620; }
.dungeon-modal .dungeon-modal-body :deep(.panel-action) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 36px; padding: 8px 12px; border: 1px solid var(--panel-border); border-radius: 4px; background: #202623; color: #d2d4c8; font: inherit; font-size: 12px; line-height: 1.5; letter-spacing: 0; box-shadow: none; transform: none; cursor: pointer; }
.dungeon-modal .dungeon-modal-body :deep(.panel-action:hover:not(:disabled)) { border-color: #857653; background: #2b322d; color: #eee6d4; box-shadow: none; transform: none; }
.dungeon-modal .dungeon-modal-body :deep(.panel-action--danger) { border-color: #644b46; background: #342521; color: #d6aaa0; }
.dungeon-modal .dungeon-modal-body :deep(.panel-action--danger:hover:not(:disabled)) { border-color: #b08073; background: #45302a; color: #f2c4b8; }
.dungeon-modal .dungeon-modal-body :deep(.panel-action:is(.is-active, .active)) { border-color: #857653; background: #c6ae7614; color: #ddc89a; }
.dungeon-modal .dungeon-modal-body :deep(.panel-action svg) { width: 16px; height: 16px; flex-shrink: 0; stroke-width: 1.6; }
.dungeon-modal .dungeon-modal-body :deep(.panel-icon-button) { width: 34px; height: 34px; min-width: 34px; min-height: 34px; padding: 0; }
.dungeon-modal .dungeon-modal-body :deep(:is(.panel-action, .panel-item):disabled) { opacity: 0.45; cursor: not-allowed; }
.dungeon-modal .dungeon-modal-body :deep(:is(.panel-action, .panel-tab, .panel-item):focus-visible) { outline: 2px solid var(--panel-accent); outline-offset: 3px; }
.dungeon-modal .dungeon-modal-body :deep(.panel-empty) { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px 16px; border: 0; border-radius: 0; background: none; color: var(--panel-muted); font-size: 13px; text-align: center; }
@media (max-width: 520px) {
  .dungeon-modal-header { padding: 16px 18px; }
  .dungeon-modal-body { padding: 18px; }
  .dungeon-modal--settings .dungeon-modal-body { padding: 0 18px 20px; }
  .dungeon-modal .dungeon-modal-body :deep(.panel-tab) { gap: 6px; padding: 12px 7px; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .dungeon-modal-close { transition: none; }
}
</style>
