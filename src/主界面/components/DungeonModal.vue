<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div
        class="relative w-full max-w-3xl p-1 bg-dungeon-brown rounded-lg shadow-2xl border border-dungeon-gold/40 mx-4 flex flex-col max-h-[90%]"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-dungeon-gold/20 bg-[#1a0f08] rounded-t-lg shrink-0"
        >
          <h2 class="text-xl font-heading text-dungeon-gold tracking-widest">{{ title }}</h2>
          <button class="text-dungeon-gold-dim hover:text-dungeon-gold transition-colors" @click="$emit('close')">
            <X class="size-6" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-8 flex-1 overflow-y-auto custom-scrollbar text-dungeon-paper/60 bg-dungeon-brown">
          <slot>
            <div class="text-center py-12">
              <div class="mb-4 text-4xl opacity-20 animate-pulse">❖</div>
              <p class="font-ui text-sm uppercase tracking-widest">模块已加载 // 等待数据同步</p>
            </div>
          </slot>
        </div>

        <!-- Ornamental Corners -->
        <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-dungeon-gold -mt-1 -ml-1 pointer-events-none"></div>
        <div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-dungeon-gold -mt-1 -mr-1 pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-dungeon-gold -mb-1 -ml-1 pointer-events-none"></div>
        <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-dungeon-gold -mb-1 -mr-1 pointer-events-none"></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  title: string;
  isOpen: boolean;
}>();

defineEmits<{
  close: [];
}>();
</script>
