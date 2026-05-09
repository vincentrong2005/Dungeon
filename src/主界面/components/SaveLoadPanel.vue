<template>
  <DungeonModal title="回档记录" :is-open="isOpen" @close="$emit('close')">
    <div v-if="entries.length === 0" class="save-load-empty">
      <BookOpen class="save-load-empty-icon" />
      <p class="save-load-empty-text">暂无存档记录</p>
    </div>

    <template v-else>
      <div class="save-load-toolbar">
        <span class="save-load-toolbar-label">排序</span>
        <div class="save-load-order-toggle" role="group" aria-label="回档记录排序">
          <button
            class="save-load-order-btn"
            :class="sortOrder === 'desc' ? 'is-active' : ''"
            type="button"
            @click="setSortOrder('desc')"
          >
            倒序
          </button>
          <button
            class="save-load-order-btn"
            :class="sortOrder === 'asc' ? 'is-active' : ''"
            type="button"
            @click="setSortOrder('asc')"
          >
            正序
          </button>
        </div>
      </div>

      <div ref="listEl" class="save-load-list custom-scrollbar">
        <button
          v-for="entry in sortedEntries"
          :key="entry.messageId"
          class="save-load-entry group"
          @click="handleRollback(entry.messageId)"
        >
          <div class="save-load-entry-badge">
            <span>#{{ entry.messageId }}</span>
          </div>
          <div class="save-load-entry-main">
            <div class="save-load-entry-title">第 {{ entry.messageId }} 层</div>
            <p class="save-load-entry-summary">{{ entry.summary }}</p>
          </div>
          <RotateCcw class="save-load-entry-icon" />
        </button>
      </div>
    </template>

    <div class="save-load-actions">
      <button
        class="save-load-action-btn"
        :disabled="gameStore.isGenerating"
        @click="handleReroll"
      >
        <RefreshCw class="size-4" />
        <span class="font-ui text-sm tracking-wide">重Roll</span>
      </button>
      <button
        class="save-load-action-btn"
        :class="gameStore.isEditing ? 'is-active' : ''"
        :disabled="gameStore.isGenerating"
        @click="handleEdit"
      >
        <Pencil class="size-4" />
        <span class="font-ui text-sm tracking-wide">编辑正文</span>
      </button>
    </div>

    <div
      v-if="confirmTarget !== null"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm"
    >
      <div class="save-load-confirm">
        <h3 class="save-load-confirm-title">确认回档</h3>
        <p class="save-load-confirm-text">
          回到第 <span class="save-load-confirm-target">{{ confirmTarget }}</span> 层？
          <br />
          <span class="save-load-confirm-warning">此操作会清除之后的全部进度。</span>
        </p>
        <div class="save-load-confirm-actions">
          <button
            class="save-load-confirm-btn save-load-confirm-btn--cancel"
            @click="confirmTarget = null"
          >
            取消
          </button>
          <button
            class="save-load-confirm-btn save-load-confirm-btn--confirm"
            @click="doRollback"
          >
            确认回档
          </button>
        </div>
      </div>
    </div>
  </DungeonModal>
</template>

<script setup lang="ts">
import { BookOpen, Pencil, RefreshCw, RotateCcw } from 'lucide-vue-next';
import { useGameStore, type SaveEntry } from '../gameStore';
import DungeonModal from './DungeonModal.vue';

const props = defineProps<{
  isOpen: boolean;
  entries: SaveEntry[];
}>();

const emit = defineEmits<{
  close: [];
  rollback: [];
}>();

const gameStore = useGameStore();
const confirmTarget = ref<number | null>(null);
const sortOrder = ref<'asc' | 'desc'>('desc');
const listEl = ref<HTMLElement | null>(null);
const sortedEntries = computed(() => {
  const direction = sortOrder.value === 'asc' ? 1 : -1;
  return [...props.entries].sort((a, b) => (a.messageId - b.messageId) * direction);
});

function setSortOrder(order: 'asc' | 'desc') {
  if (sortOrder.value === order) return;
  sortOrder.value = order;
  nextTick(() => {
    listEl.value?.scrollTo({ top: 0, behavior: 'auto' });
  });
}

function handleRollback(messageId: number) {
  confirmTarget.value = messageId;
}

async function doRollback() {
  const targetMessageId = confirmTarget.value;
  if (targetMessageId === null) return;

  confirmTarget.value = null;
  emit('rollback');
  emit('close');
  await gameStore.rollbackTo(targetMessageId);
}

function handleReroll() {
  if (gameStore.isGenerating) return;
  emit('close');
  gameStore.rerollCurrent();
}

function handleEdit() {
  if (gameStore.isGenerating) return;
  emit('close');
  gameStore.startEdit();
}
</script>

<style scoped>
.save-load-empty {
  border-radius: 0.85rem;
  border: 1px dashed rgba(212, 175, 55, 0.3);
  background: rgba(24, 15, 10, 0.64);
  padding: 2rem 1rem;
  text-align: center;
}

.save-load-empty-icon {
  margin: 0 auto 0.85rem;
  width: 3rem;
  height: 3rem;
  color: rgba(212, 175, 55, 0.35);
}

.save-load-empty-text {
  color: rgba(212, 212, 216, 0.8);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
}

.save-load-list {
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 0.42rem;
}

.save-load-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.72rem;
  padding: 0 0.12rem;
}

.save-load-toolbar-label {
  color: rgba(245, 222, 179, 0.74);
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}

.save-load-order-toggle {
  display: inline-flex;
  border-radius: 0.58rem;
  border: 1px solid rgba(92, 62, 38, 0.7);
  background: rgba(16, 11, 8, 0.72);
  padding: 0.16rem;
}

.save-load-order-btn {
  min-width: 3.2rem;
  border-radius: 0.42rem;
  border: 1px solid transparent;
  color: rgba(231, 229, 228, 0.7);
  font-family: 'Inter', sans-serif;
  font-size: 0.76rem;
  line-height: 1;
  padding: 0.38rem 0.58rem;
  transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.save-load-order-btn:hover,
.save-load-order-btn:focus-visible {
  outline: none;
  color: rgba(251, 191, 36, 0.95);
}

.save-load-order-btn.is-active {
  border-color: rgba(212, 175, 55, 0.38);
  background: rgba(120, 53, 15, 0.26);
  color: rgba(251, 191, 36, 0.96);
}

.save-load-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.76rem;
  width: 100%;
  border-radius: 0.82rem;
  border: 1px solid rgba(92, 62, 38, 0.7);
  background:
    radial-gradient(circle at 14% 10%, rgba(251, 191, 36, 0.08), transparent 48%),
    rgba(16, 11, 8, 0.72);
  padding: 0.78rem;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.save-load-entry:hover {
  transform: translateY(-1px);
  border-color: rgba(212, 175, 55, 0.52);
  background: rgba(34, 21, 14, 0.82);
  box-shadow: 0 0 16px rgba(212, 175, 55, 0.14);
}

.save-load-entry-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(212, 175, 55, 0.32);
  background: rgba(26, 15, 8, 0.95);
  color: rgba(251, 191, 36, 0.95);
  font-family: 'Cinzel', serif;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
}

.save-load-entry-main {
  min-width: 0;
  flex: 1;
}

.save-load-entry-title {
  color: rgba(245, 222, 179, 0.94);
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.03em;
  margin-bottom: 0.28rem;
}

.save-load-entry-summary {
  margin: 0;
  color: rgba(231, 229, 228, 0.86);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.save-load-entry-icon {
  width: 1rem;
  height: 1rem;
  margin-top: 0.18rem;
  color: rgba(212, 175, 55, 0.45);
  flex-shrink: 0;
  transition: color 0.18s ease, transform 0.18s ease;
}

.save-load-entry:hover .save-load-entry-icon {
  color: rgba(251, 191, 36, 0.95);
  transform: rotate(-12deg);
}

.save-load-actions {
  margin-top: 0.95rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(212, 175, 55, 0.15);
  display: flex;
  gap: 0.68rem;
}

.save-load-action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.44rem;
  border-radius: 0.62rem;
  border: 1px solid rgba(92, 62, 38, 0.72);
  background: rgba(18, 11, 7, 0.72);
  color: rgba(231, 229, 228, 0.78);
  padding: 0.58rem 0.82rem;
  transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.save-load-action-btn:hover:not(:disabled),
.save-load-action-btn:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: rgba(212, 175, 55, 0.55);
  background: rgba(45, 26, 16, 0.8);
  color: rgba(251, 191, 36, 0.95);
}

.save-load-action-btn.is-active {
  border-color: rgba(212, 175, 55, 0.65);
  background: rgba(82, 49, 28, 0.44);
  color: rgba(251, 191, 36, 0.95);
}

.save-load-action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.save-load-confirm {
  width: min(92vw, 26rem);
  border-radius: 0.9rem;
  border: 1px solid rgba(212, 175, 55, 0.34);
  background:
    radial-gradient(circle at 18% 10%, rgba(251, 191, 36, 0.14), transparent 52%),
    rgba(10, 8, 6, 0.95);
  padding: 1.08rem 1.12rem;
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.52),
    0 0 20px rgba(212, 175, 55, 0.16);
}

.save-load-confirm-title {
  margin: 0;
  color: rgba(251, 191, 36, 0.95);
  font-size: 1rem;
  letter-spacing: 0.05em;
  font-family: 'Cinzel', serif;
}

.save-load-confirm-text {
  margin: 0.8rem 0 1rem;
  color: rgba(231, 229, 228, 0.88);
  font-size: 0.86rem;
  line-height: 1.55;
  font-family: 'Inter', sans-serif;
}

.save-load-confirm-target {
  color: rgba(251, 191, 36, 0.96);
  font-weight: 700;
}

.save-load-confirm-warning {
  color: rgba(248, 113, 113, 0.9);
  font-size: 0.76rem;
}

.save-load-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.62rem;
}

.save-load-confirm-btn {
  border-radius: 0.54rem;
  border: 1px solid transparent;
  padding: 0.44rem 0.84rem;
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.save-load-confirm-btn--cancel {
  border-color: rgba(82, 82, 91, 0.8);
  background: rgba(24, 24, 27, 0.7);
  color: rgba(212, 212, 216, 0.88);
}

.save-load-confirm-btn--cancel:hover {
  border-color: rgba(113, 113, 122, 0.95);
  color: rgba(244, 244, 245, 0.95);
}

.save-load-confirm-btn--confirm {
  border-color: rgba(212, 175, 55, 0.45);
  background: rgba(120, 53, 15, 0.28);
  color: rgba(251, 191, 36, 0.95);
}

.save-load-confirm-btn--confirm:hover {
  border-color: rgba(251, 191, 36, 0.8);
  background: rgba(146, 64, 14, 0.36);
  color: rgba(255, 243, 214, 0.98);
}
</style>
