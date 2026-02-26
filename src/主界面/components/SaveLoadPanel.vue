<template>
  <DungeonModal title="回档记录" :is-open="isOpen" @close="$emit('close')">
    <div v-if="entries.length === 0" class="text-center py-8">
      <BookOpen class="size-12 mx-auto text-dungeon-gold/30 mb-4" />
      <p class="text-gray-500 font-ui">暂无存档记录</p>
    </div>

    <div v-else class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
      <button
        v-for="entry in entries"
        :key="entry.messageId"
        class="group w-full text-left p-4 rounded-lg border transition-all duration-300
               bg-dungeon-dark/60 border-dungeon-brown/50
               hover:bg-dungeon-brown/30 hover:border-dungeon-gold/40
               hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
        @click="handleRollback(entry.messageId)"
      >
        <div class="flex items-start gap-3">
          <!-- Floor Number Badge -->
          <div class="shrink-0 w-10 h-10 rounded bg-[#1a0f08] border border-dungeon-gold/20
                      flex items-center justify-center shadow-inner
                      group-hover:border-dungeon-gold/50 transition-colors">
            <span class="text-dungeon-gold font-heading text-sm">#{{ entry.messageId }}</span>
          </div>

          <!-- Summary Text -->
          <p class="text-sm text-dungeon-paper/80 font-ui leading-relaxed flex-1
                    group-hover:text-dungeon-paper transition-colors">
            {{ entry.summary }}
          </p>

          <!-- Arrow Icon -->
          <RotateCcw class="size-4 text-dungeon-gold/30 group-hover:text-dungeon-gold
                          shrink-0 mt-1 transition-colors" />
        </div>
      </button>
    </div>

    <!-- Bottom Action Buttons -->
    <div class="mt-4 pt-4 border-t border-dungeon-gold/15">
      <div class="flex gap-3">
        <button
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-300
                 bg-dungeon-dark/60 border-dungeon-brown/50 text-dungeon-paper/70
                 hover:bg-dungeon-brown/30 hover:border-dungeon-gold/40 hover:text-dungeon-gold
                 disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="gameStore.isGenerating"
          @click="handleReroll"
        >
          <RefreshCw class="size-4" />
          <span class="font-ui text-sm tracking-wide">重Roll</span>
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-300
                 bg-dungeon-dark/60 border-dungeon-brown/50 text-dungeon-paper/70
                 hover:bg-dungeon-brown/30 hover:border-dungeon-gold/40 hover:text-dungeon-gold
                 disabled:opacity-30 disabled:cursor-not-allowed"
          :class="gameStore.isEditing ? 'border-dungeon-gold/50 text-dungeon-gold bg-dungeon-brown/20' : ''"
          :disabled="gameStore.isGenerating"
          @click="handleEdit"
        >
          <Pencil class="size-4" />
          <span class="font-ui text-sm tracking-wide">编辑</span>
        </button>
      </div>
      <button
        class="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-300
               bg-dungeon-dark/60 border-dungeon-brown/50 text-dungeon-paper/70
               hover:bg-dungeon-brown/30 hover:border-dungeon-gold/40 hover:text-dungeon-gold
               disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="gameStore.isGenerating || isManualSummaryRunning"
        @click="handleManualSummary"
      >
        <BookOpen class="size-4" />
        <span class="font-ui text-sm tracking-wide">
          {{ isManualSummaryRunning ? '正在重建总结...' : '手动总结' }}
        </span>
      </button>
    </div>

    <!-- Confirm Dialog -->
    <div
      v-if="confirmTarget !== null"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div class="glass-panel rounded-xl p-6 max-w-sm mx-4 border border-dungeon-gold/30">
        <h3 class="font-heading text-dungeon-gold text-lg mb-3">确认回档</h3>
        <p class="text-dungeon-paper/70 font-ui text-sm mb-6">
          回到第 <span class="text-dungeon-gold font-bold">{{ confirmTarget }}</span> 楼？
          <br />
          <span class="text-red-400/80 text-xs">此操作将删除之后的所有进度。</span>
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 text-sm font-ui text-gray-400 border border-gray-700 rounded
                   hover:bg-gray-800 transition-colors"
            @click="confirmTarget = null"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-sm font-ui text-dungeon-gold border border-dungeon-gold/40 rounded
                   hover:bg-dungeon-gold/10 transition-colors"
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

defineProps<{
  isOpen: boolean;
  entries: SaveEntry[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const gameStore = useGameStore();
const confirmTarget = ref<number | null>(null);
const isManualSummaryRunning = ref(false);

function handleRollback(messageId: number) {
  confirmTarget.value = messageId;
}

async function doRollback() {
  if (confirmTarget.value !== null) {
    await gameStore.rollbackTo(confirmTarget.value);
    confirmTarget.value = null;
  }
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

async function handleManualSummary() {
  if (gameStore.isGenerating || isManualSummaryRunning.value) return;
  isManualSummaryRunning.value = true;
  try {
    const writtenCount = await gameStore.rebuildAutoSummaryChronicleFromMessages();
    if (writtenCount < 0) {
      toastr.error('手动总结失败，请查看控制台日志。');
      return;
    }
    if (writtenCount === 0) {
      toastr.warning('未找到可重建的总结条目或自动总结条目。');
      return;
    }
    toastr.success(`手动总结完成，已覆盖写入 ${writtenCount} 条。`);
  } finally {
    isManualSummaryRunning.value = false;
  }
}
</script>
