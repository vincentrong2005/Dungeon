<template>
  <Teleport to="body">
    <Transition :name="variant === 'magic-book' ? 'magic-book-overlay' : 'dungeon-modal-overlay'" appear>
      <div
        v-if="isOpen"
        :class="[
          'fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md',
          { 'dungeon-modal-overlay--magic-book': variant === 'magic-book' },
        ]"
        @click.self="$emit('close')"
      >
        <div
          data-card-tooltip-boundary
          :class="[
            'dungeon-modal relative mx-4 flex max-h-[90%] w-full max-w-3xl flex-col overflow-hidden',
            { 'dungeon-modal--settings': variant === 'settings' },
            { 'dungeon-modal--magic-book': variant === 'magic-book' },
            { 'dungeon-modal--bare': variant === 'bare' },
            { 'dungeon-modal--grimoire': variant !== 'magic-book' && variant !== 'bare' },
            panelClass,
          ]"
        >
        <!-- Header -->
        <div class="dungeon-modal-header relative flex shrink-0 items-center justify-between">
          <h2 class="dungeon-modal-title">
            <span class="dungeon-modal-title__plate">
              <component :is="icon ?? (variant === 'settings' ? SlidersHorizontal : PanelsTopLeft)" aria-hidden="true" />
              <span class="dungeon-modal-title__text">{{ title }}</span>
            </span>
          </h2>
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
        <!-- 典籍外框：九宫格金饰包角，覆盖在面板边缘之上，不参与交互 -->
        <span v-if="variant !== 'magic-book' && variant !== 'bare'" class="dungeon-modal-frame" aria-hidden="true"></span>
        </div>
      </div>
    </Transition>
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
  /** settings：设置面板；magic-book：整书即弹窗；bare：无外框，内容自带画面（如地图），只保留浮动关闭按钮 */
  variant?: 'settings' | 'magic-book' | 'bare';
  icon?: Component;
}>();

defineEmits<{
  close: [];
  bodyScroll: [event: Event];
}>();
</script>

<style scoped>
/* =====================================================================
   典籍级弹窗（所有非魔法书弹窗）
   - 外框：九宫格金饰包角（--dg-img-frame），作为独立装饰层略微外凸
   - 标题：三段式铭牌（--dg-img-plate）+ 花饰分隔线（--dg-img-divider）
   - 面板：黑铁皮革纹理（--dg-bg-panel）
   - --panel-* 继续作为弹窗内容的局部变量，映射到全局设计变量
   ===================================================================== */
.dungeon-modal {
  --panel-bg: #18120e;
  --panel-surface: var(--dg-surface);
  --panel-border: rgba(201, 161, 96, 0.3);
  --panel-divider: var(--dg-line);
  --panel-accent: var(--dg-gold);
  --panel-text: var(--dg-text);
  --panel-muted: var(--dg-text-muted);
  /* Tailwind 的 font-heading 工具类读取此变量（数值、卡名、小标题），统一为 Cinzel */
  --font-heading: var(--dg-font-title);
  --modal-frame-width: 60px;
  --modal-frame-outset: 16px;
  border: 0;
  border-radius: 0;
  background: var(--dg-bg-panel);
  box-shadow: var(--dg-shadow-deep);
  color: var(--panel-text);
  color-scheme: dark;
  font: 14px/1.6 var(--dg-font-ui);
  letter-spacing: 0;
}

/* 外框需要越出面板边缘；正文区域自身负责滚动 */
.dungeon-modal--grimoire { overflow: visible; }

.dungeon-modal-frame {
  position: absolute;
  z-index: 30;
  inset: calc(var(--modal-frame-outset) * -1);
  border-style: solid;
  border-width: var(--modal-frame-width);
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

.dungeon-modal--settings { max-width: 760px; }

/* 占满整个窗口的弹窗（如战斗测试配置）：只留出外框金饰需要的边距 */
.dungeon-modal.dungeon-modal--fullscreen {
  width: calc(100% - var(--modal-frame-outset) * 2 - 16px);
  max-width: none;
  height: calc(100% - var(--modal-frame-outset) * 2 - 16px);
  max-height: none;
  margin: 0;
}

.dungeon-modal-overlay--magic-book {
  background-color: rgba(0, 0, 0, 0.45) !important;
  backdrop-filter: brightness(0.68) blur(2px) !important;
}

/* 弹窗出现：遮罩淡入，面板轻微上浮 */
.dungeon-modal-overlay-enter-active,
.dungeon-modal-overlay-leave-active {
  transition: opacity 220ms ease;
}

.dungeon-modal-overlay-enter-active .dungeon-modal,
.dungeon-modal-overlay-leave-active .dungeon-modal {
  transition: transform 300ms cubic-bezier(0.2, 0.75, 0.2, 1), opacity 240ms ease;
}

.dungeon-modal-overlay-enter-from,
.dungeon-modal-overlay-leave-to { opacity: 0; }

.dungeon-modal-overlay-enter-from .dungeon-modal,
.dungeon-modal-overlay-leave-to .dungeon-modal {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.985);
}

.magic-book-overlay-enter-active,
.magic-book-overlay-leave-active {
  transition: opacity 320ms ease;
}

.magic-book-overlay-enter-active .dungeon-modal--magic-book,
.magic-book-overlay-leave-active .dungeon-modal--magic-book {
  transition: transform 520ms cubic-bezier(0.2, 0.75, 0.2, 1), opacity 360ms ease;
}

.magic-book-overlay-enter-from,
.magic-book-overlay-leave-to {
  opacity: 0;
}

.magic-book-overlay-enter-from .dungeon-modal--magic-book,
.magic-book-overlay-leave-to .dungeon-modal--magic-book {
  opacity: 0;
  transform: translateY(1.5rem) scale(0.94);
}

/* ---------- 标题区 ---------- */
.dungeon-modal-header {
  justify-content: center;
  gap: 16px;
  padding: 22px 72px 20px;
  border-bottom: 0;
  background: none;
}

/* 花饰分隔线 */
.dungeon-modal--grimoire .dungeon-modal-header::after {
  position: absolute;
  right: 0;
  bottom: 2px;
  left: 0;
  height: 16px;
  background: var(--dg-img-divider) center / min(78%, 460px) auto no-repeat;
  opacity: 0.9;
  pointer-events: none;
  content: '';
}

.dungeon-modal-title {
  display: flex;
  min-width: 0;
  max-width: 100%;
  justify-content: center;
  margin: 0;
}

.dungeon-modal-title__plate {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 14px;
  border-style: solid;
  border-width: 0 30px;
  border-image-source: var(--dg-img-plate);
  border-image-slice: 0 66 0 67 fill;
  border-image-repeat: stretch;
  color: var(--dg-gold-bright);
  font: 400 20px/1 var(--dg-font-title);
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.9), 0 0 12px rgba(232, 170, 70, 0.3);
}

.dungeon-modal-title__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dungeon-modal-title svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--dg-gold);
  stroke-width: 1.6;
}

/* 关闭按钮：铁质宝石扣 */
.dungeon-modal-close {
  position: absolute;
  top: 50%;
  right: 22px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(201, 161, 96, 0.55);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a2c22, #16100c 70%);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 220, 160, 0.12), 0 2px 6px rgba(0, 0, 0, 0.5);
  color: var(--dg-gold);
  cursor: pointer;
  transform: translateY(-50%);
  transition: color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.dungeon-modal-close:hover {
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 220, 160, 0.18), 0 0 10px rgba(232, 170, 70, 0.3);
  color: var(--dg-gold-bright);
}

.dungeon-modal-close:focus-visible { outline: 2px solid var(--dg-gold); outline-offset: 3px; }
.dungeon-modal-close svg { width: 17px; height: 17px; stroke-width: 1.8; }

/* ---------- 正文区 ---------- */
.dungeon-modal-body {
  min-height: 0;
  padding: 20px 30px 30px;
  overflow-wrap: anywhere;
  scrollbar-color: rgba(201, 161, 96, 0.4) transparent;
  scrollbar-width: thin;
}

.dungeon-modal--settings .dungeon-modal-body { padding: 0 30px 28px; background: none; }

/* ---------- 共用控件：弹窗内容通过这些类自动获得统一外观 ---------- */
.dungeon-modal .dungeon-modal-body :deep(.panel-tabs) {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--dg-line-strong);
  border-radius: 0;
  background: linear-gradient(180deg, transparent, rgba(201, 161, 96, 0.05));
  box-shadow: none;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-tab) {
  position: relative;
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 46px;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--dg-text-muted);
  font: inherit;
  font-size: 13px;
  letter-spacing: 0.08em;
  box-shadow: none;
  transform: none;
  cursor: pointer;
  transition: color 160ms ease, background-color 160ms ease;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-tab:hover) {
  background: rgba(201, 161, 96, 0.05);
  color: var(--dg-text);
}

.dungeon-modal .dungeon-modal-body :deep(.panel-tab:is(.is-active, .active)) {
  background: linear-gradient(180deg, transparent 40%, rgba(201, 161, 96, 0.1));
  color: var(--dg-gold-bright);
}

/* 选中标签：底部金线 + 中央小菱形 */
.dungeon-modal .dungeon-modal-body :deep(.panel-tab:is(.is-active, .active)::after) {
  position: absolute;
  right: 18%;
  bottom: -1px;
  left: 18%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--dg-gold) 25%, var(--dg-gold-bright) 50%, var(--dg-gold) 75%, transparent);
  content: '';
}

.dungeon-modal .dungeon-modal-body :deep(.panel-tab:is(.is-active, .active)::before) {
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 7px;
  height: 7px;
  border: 1px solid var(--dg-gold-bright);
  background: var(--dg-arcane);
  box-shadow: 0 0 6px var(--dg-arcane-glow);
  transform: translateX(-50%) rotate(45deg);
  content: '';
}

.dungeon-modal .dungeon-modal-body :deep(.panel-tab svg) { width: 16px; height: 16px; flex-shrink: 0; stroke-width: 1.6; }

.dungeon-modal .dungeon-modal-body :deep(.panel-section) {
  position: relative;
  padding: 20px 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
}

/* 分区之间：两端渐隐的金线 */
.dungeon-modal .dungeon-modal-body :deep(.panel-section:not(:last-child)::after) {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-line-strong) 15%, var(--dg-line-strong) 85%, transparent);
  content: '';
}

.dungeon-modal .dungeon-modal-body :deep(.panel-heading) {
  color: var(--dg-gold-bright);
  font: 400 16px/1.5 var(--dg-font-title);
  letter-spacing: 0.1em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}

.dungeon-modal .dungeon-modal-body :deep(.panel-item) {
  border: 1px solid rgba(201, 161, 96, 0.22);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(255, 220, 160, 0.035), transparent 40%), var(--dg-surface);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.05), 0 1px 2px rgba(0, 0, 0, 0.35);
  transform: none;
}

.dungeon-modal .dungeon-modal-body :deep(button.panel-item:hover:not(:disabled)) {
  border-color: rgba(201, 161, 96, 0.5);
  background: linear-gradient(180deg, rgba(255, 220, 160, 0.05), transparent 40%), var(--dg-surface-hover);
  transform: none;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-item:is(.is-active, .is-selected, .is-equipped)) {
  border-color: var(--dg-gold);
  background: linear-gradient(180deg, rgba(255, 220, 160, 0.06), transparent 40%), var(--dg-surface-active);
  box-shadow: inset 0 0 0 1px rgba(240, 208, 138, 0.18), 0 0 10px rgba(232, 170, 70, 0.12);
}

/* 按钮：黑铁底 + 金色细边 + 顶部高光 */
.dungeon-modal .dungeon-modal-body :deep(.panel-action) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 2px;
  background: linear-gradient(180deg, #2f241c, #1a1310);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.45);
  color: var(--dg-text);
  font: inherit;
  font-size: 12.5px;
  line-height: 1.5;
  letter-spacing: 0.06em;
  transform: none;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-action:hover:not(:disabled)) {
  border-color: var(--dg-gold-bright);
  background: linear-gradient(180deg, #3b2d22, #211813);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 0 8px rgba(232, 170, 70, 0.18);
  color: var(--dg-text-strong);
  transform: none;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-action--danger) {
  border-color: rgba(192, 80, 63, 0.6);
  background: linear-gradient(180deg, #3a1d17, #22100c);
  color: #e6b2a6;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-action--danger:hover:not(:disabled)) {
  border-color: #e07a66;
  background: linear-gradient(180deg, #4a241c, #2a130e);
  box-shadow: inset 0 1px 0 rgba(255, 200, 180, 0.15), 0 0 8px rgba(192, 80, 63, 0.3);
  color: #f6cdc2;
}

.dungeon-modal .dungeon-modal-body :deep(.panel-action:is(.is-active, .active)) {
  border-color: var(--dg-gold);
  background: linear-gradient(180deg, rgba(201, 161, 96, 0.22), rgba(120, 80, 34, 0.18)), #1d1511;
  color: var(--dg-gold-bright);
}

.dungeon-modal .dungeon-modal-body :deep(.panel-action svg) { width: 16px; height: 16px; flex-shrink: 0; stroke-width: 1.6; }
.dungeon-modal .dungeon-modal-body :deep(.panel-icon-button) { width: 34px; height: 34px; min-width: 34px; min-height: 34px; padding: 0; }
.dungeon-modal .dungeon-modal-body :deep(:is(.panel-action, .panel-item):disabled) { opacity: 0.45; cursor: not-allowed; }
.dungeon-modal .dungeon-modal-body :deep(:is(.panel-action, .panel-tab, .panel-item):focus-visible) { outline: 2px solid var(--dg-gold); outline-offset: 3px; }

/* 标题行：左侧标题字体标签，右侧计数铭牌 */
.dungeon-modal .dungeon-modal-body :deep(.panel-caption) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  color: var(--dg-gold-bright);
  font: 400 16px/1.4 var(--dg-font-title);
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}

.dungeon-modal .dungeon-modal-body :deep(.panel-caption::after) {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line-strong), var(--dg-line) 70%, transparent);
  content: '';
}

/* 计数铭牌：金线小牌 + 数据字体 */
.dungeon-modal .dungeon-modal-body :deep(.panel-count) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 2px;
  background: linear-gradient(180deg, #2a1f18, #15100c);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.1);
  color: var(--dg-gold-bright);
  font: 600 12px/1.6 var(--dg-font-data);
  letter-spacing: 0.06em;
  text-shadow: none;
  font-variant-numeric: tabular-nums;
}


.dungeon-modal .dungeon-modal-body :deep(.panel-empty) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 16px;
  border: 0;
  border-radius: 0;
  background: none;
  color: var(--dg-text-faint);
  font-family: var(--dg-font-serif);
  font-size: 13px;
  font-style: italic;
  letter-spacing: 0.06em;
  text-align: center;
}

/* =====================================================================
   魔法书变体：整书即弹窗，不使用典籍外框与铭牌
   ===================================================================== */
.dungeon-modal--magic-book {
  width: min(96vw, 112rem, calc(96vh * 1.5));
  max-width: none;
  max-height: 100vh;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.dungeon-modal--magic-book .dungeon-modal-header {
  position: absolute;
  z-index: 40;
  inset: 0 0 auto auto;
  padding: 0.9rem 1rem;
  border: 0;
  background: transparent;
  transform: translate(18%, -14%);
}
.dungeon-modal--magic-book .dungeon-modal-title { display: none; }
.dungeon-modal--magic-book .dungeon-modal-close {
  position: static;
  width: 2.9rem;
  height: 2.9rem;
  border: 1px solid rgba(192, 141, 76, 0.68);
  border-radius: 0.45rem;
  background: linear-gradient(145deg, rgba(45, 24, 16, 0.94), rgba(10, 8, 9, 0.94));
  color: rgba(255, 224, 163, 0.92);
  box-shadow: inset 0 0 0 1px rgba(255, 224, 163, 0.08), 0 0 18px rgba(251, 191, 36, 0.12);
  transform: none;
}
.dungeon-modal--magic-book .dungeon-modal-close:hover {
  border-color: rgba(251, 191, 36, 0.95);
  background: linear-gradient(145deg, rgba(102, 45, 23, 0.96), rgba(23, 12, 10, 0.96));
  color: #fff0c7;
  box-shadow: inset 0 0 0 1px rgba(255, 224, 163, 0.16), 0 0 24px rgba(251, 191, 36, 0.28);
}
.dungeon-modal--magic-book .dungeon-modal-body {
  max-height: 100vh;
  padding: 0;
  overflow: visible;
  background: transparent;
}

/* =====================================================================
   无外框变体：内容自身就是画面（地图），弹窗只负责遮罩与浮动关闭按钮
   ===================================================================== */
.dungeon-modal--bare {
  width: auto;
  max-width: none;
  max-height: none;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.dungeon-modal--bare .dungeon-modal-header {
  position: absolute;
  z-index: 40;
  inset: 0 0 auto auto;
  padding: 0.9rem;
  border: 0;
  background: transparent;
}
.dungeon-modal--bare .dungeon-modal-title { display: none; }
.dungeon-modal--bare .dungeon-modal-close {
  position: static;
  width: 2.6rem;
  height: 2.6rem;
  transform: none;
}
.dungeon-modal--bare .dungeon-modal-body {
  max-height: none;
  padding: 0;
  overflow: visible;
  background: transparent;
}

@media (max-width: 520px) {
  .dungeon-modal { --modal-frame-width: 44px; --modal-frame-outset: 12px; }
  .dungeon-modal-header { padding: 18px 56px 18px; }
  .dungeon-modal-title__plate { height: 34px; border-width: 0 25px; font-size: 17px; letter-spacing: 0.12em; text-indent: 0.12em; }
  .dungeon-modal-close { right: 14px; width: 30px; height: 30px; }
  .dungeon-modal-body { padding: 16px 20px 24px; }
  .dungeon-modal--settings .dungeon-modal-body { padding: 0 20px 22px; }
  .dungeon-modal--magic-book { width: 100vw; max-height: 100vh; }
  .dungeon-modal--magic-book .dungeon-modal-header { padding: 0.55rem 0.65rem; }
  .dungeon-modal--magic-book .dungeon-modal-close { width: 2.35rem; height: 2.35rem; }
  .dungeon-modal .dungeon-modal-body :deep(.panel-tab) { gap: 6px; padding: 12px 7px; font-size: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .dungeon-modal-close { transition: none; }
  .dungeon-modal-overlay-enter-active .dungeon-modal,
  .dungeon-modal-overlay-leave-active .dungeon-modal { transition: opacity 120ms ease; transform: none; }
}
</style>
