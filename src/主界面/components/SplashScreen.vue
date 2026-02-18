<template>
  <div
    class="relative w-full flex flex-col items-center justify-center bg-[#050505] text-dungeon-paper overflow-hidden transition-opacity duration-1000"
    :class="isVisible ? 'opacity-100' : 'opacity-0'"
    :style="{ aspectRatio: '16/9' }"
  >
    <!-- Dynamic Background -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,40,30,0.3),_#000000_90%)] z-0"></div>
    <div class="absolute inset-0 opacity-30 z-0 mix-blend-overlay animate-pulse-slow bg-[length:200px] bg-repeat" style="background-image: url('https://www.transparenttextures.com/patterns/dark-matter.png')"></div>

    <!-- Ornamental Frame -->
    <div class="absolute top-8 left-8 w-64 h-64 border-t-2 border-l-2 border-dungeon-brown opacity-50"></div>
    <div class="absolute bottom-8 right-8 w-64 h-64 border-b-2 border-r-2 border-dungeon-brown opacity-50"></div>

    <!-- Fullscreen Button (Top Right, Small) -->
    <button
      class="absolute top-4 right-4 z-50 w-8 h-8 rounded flex items-center justify-center
             bg-dungeon-dark/60 border border-dungeon-brown/50 text-dungeon-gold-dim
             hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50
             transition-all duration-300"
      title="全屏模式"
      @click="$emit('toggleFullscreen')"
    >
      <Maximize class="size-4" />
    </button>

    <!-- Main Content -->
    <div class="z-10 flex flex-col items-center space-y-12">
      <!-- Title Section -->
      <div class="text-center space-y-4 relative">
        <div
          class="w-1 h-24 bg-gradient-to-b from-transparent via-dungeon-gold to-transparent absolute -left-12 top-0 opacity-50"
        ></div>
        <div
          class="w-1 h-24 bg-gradient-to-b from-transparent via-dungeon-gold to-transparent absolute -right-12 top-0 opacity-50"
        ></div>

        <h1
          class="text-6xl md:text-8xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-[#f9e6a0] to-dungeon-gold-dim drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] tracking-wide"
        >
          欲望地牢
        </h1>
        <h2
          class="text-xl md:text-2xl font-body text-dungeon-gold-dim tracking-[0.5em] uppercase border-t border-dungeon-brown pt-4 mt-2"
        >
          Desire Dungeon
        </h2>
      </div>

      <!-- Menu Actions -->
      <div class="flex flex-col space-y-4 w-64">
        <button
          class="group relative px-8 py-4 bg-[#1a0f08] hover:bg-dungeon-brown border border-dungeon-gold/30 hover:border-dungeon-gold transition-all duration-300 flex items-center justify-center space-x-3 overflow-hidden"
          @click="$emit('start')"
        >
          <div class="absolute inset-0 w-0 bg-dungeon-gold/10 transition-all duration-300 group-hover:w-full"></div>
          <Play class="size-5 text-dungeon-gold group-hover:scale-110 transition-transform" />
          <span class="font-heading text-lg tracking-widest text-dungeon-paper group-hover:text-dungeon-gold">
            进入深渊
          </span>
        </button>

        <button
          disabled
          class="group px-8 py-3 bg-black/50 border border-dungeon-brown text-gray-600 font-heading tracking-widest cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Star class="size-4" />
          <span>魔女的收藏</span>
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div
      class="absolute bottom-6 text-dungeon-brown text-xs font-mono tracking-widest flex flex-col items-center space-y-2 opacity-60 hover:opacity-100 transition-opacity"
    >
      <div class="w-12 h-[1px] bg-dungeon-brown mb-2"></div>
      <p>VER 0.2.0 // TAVERN ENGINE</p>
      <div class="flex items-center space-x-2">
        <Github class="size-3" />
        <span>POWERED BY LLM</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Github, Maximize, Play, Star } from 'lucide-vue-next';

defineEmits<{
  start: [];
  toggleFullscreen: [];
}>();

const isVisible = ref(false);
onMounted(() => {
  isVisible.value = true;
});
</script>
