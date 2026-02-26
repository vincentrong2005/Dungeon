<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <div
        :class="[
          'relative mx-4 flex max-h-[90%] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-300/35 bg-[#100b09]/95 shadow-[0_24px_60px_rgba(0,0,0,0.65),0_0_50px_rgba(217,119,6,0.22)]',
          panelClass,
        ]"
      >
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(251,191,36,0.2),transparent_45%),radial-gradient(circle_at_84%_0%,rgba(251,191,36,0.12),transparent_36%)]"></div>
        <div class="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/6"></div>

        <!-- Header -->
        <div
          class="relative flex shrink-0 items-center justify-between rounded-t-2xl border-b border-amber-300/25 bg-[linear-gradient(120deg,rgba(34,21,14,0.96),rgba(59,35,20,0.92)_46%,rgba(33,20,13,0.96))] px-6 py-4"
        >
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-40"></div>
          <h2 class="relative text-xl font-heading tracking-[0.2em] text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">{{ title }}</h2>
          <button class="relative rounded-full border border-amber-300/30 bg-black/20 p-1 text-amber-200/80 transition-colors hover:text-amber-100" @click="$emit('close')">
            <X class="size-6" />
          </button>
        </div>

        <!-- Body -->
        <div class="relative flex-1 overflow-y-auto custom-scrollbar bg-[linear-gradient(160deg,rgba(20,13,9,0.92),rgba(30,19,12,0.9))] p-8 text-dungeon-paper/80">
          <slot>
            <div class="text-center py-12">
              <div class="mb-4 text-4xl opacity-20 animate-pulse">❖</div>
              <p class="font-ui text-sm uppercase tracking-widest">模块已加载 // 等待数据同步</p>
            </div>
          </slot>
        </div>

        <!-- Ornamental Corners -->
        <div class="pointer-events-none absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-amber-300/75"></div>
        <div class="pointer-events-none absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-amber-300/75"></div>
        <div class="pointer-events-none absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-amber-300/75"></div>
        <div class="pointer-events-none absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-amber-300/75"></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  title: string;
  isOpen: boolean;
  panelClass?: string;
}>();

defineEmits<{
  close: [];
}>();
</script>
