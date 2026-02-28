<template>
  <div
    class="relative w-full flex flex-col items-center justify-center bg-[#050505] text-dungeon-paper overflow-hidden transition-opacity duration-1000"
    :class="isVisible ? 'opacity-100' : 'opacity-0'"
    :style="{ aspectRatio: '16/9' }"
  >
    <div
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url('${currentBackgroundUrl}')` }"
    ></div>
    <div
      v-if="incomingBackgroundUrl"
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
      :class="isIncomingVisible ? 'opacity-100' : 'opacity-0'"
      :style="{ backgroundImage: `url('${incomingBackgroundUrl}')` }"
    ></div>
    <div
      v-if="outgoingBackgroundUrl"
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
      :class="isOutgoingVisible ? 'opacity-100' : 'opacity-0'"
      :style="{ backgroundImage: `url('${outgoingBackgroundUrl}')` }"
    ></div>

    <button
      type="button"
      class="absolute inset-0 z-[1] bg-transparent cursor-pointer focus:outline-none"
      aria-label="点击切换背景"
      @click="switchBackground"
    ></button>

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
          class="text-xl md:text-2xl font-body text-[#f9e6a0] tracking-[0.35em] uppercase border-t border-dungeon-brown pt-4 mt-2"
        >
          Created by Vin
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
          class="group relative px-8 py-3 bg-[#120b08] hover:bg-dungeon-brown/80 border border-dungeon-brown/80 hover:border-dungeon-gold/60 text-dungeon-paper/85 font-heading tracking-widest flex items-center justify-center space-x-2 transition-all duration-300"
          @click="$emit('openCollection')"
        >
          <Star class="size-4" />
          <span>魔女的收藏</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Maximize, Play, Star } from 'lucide-vue-next';

defineEmits<{
  start: [];
  toggleFullscreen: [];
  openCollection: [];
}>();

const isVisible = ref(false);
const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const splashBackgrounds: string[] = [
  `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF/%E8%83%8C%E6%99%AF1.png`,
  `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF/%E8%83%8C%E6%99%AF2.png`,
  `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF/%E8%83%8C%E6%99%AF3.png`,
  `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF/%E8%83%8C%E6%99%AF4.png`,
  `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF/%E8%83%8C%E6%99%AF5.png`,
] ;
const currentBackgroundUrl = ref<string>(splashBackgrounds[0]);
const incomingBackgroundUrl = ref<string | null>(null);
const outgoingBackgroundUrl = ref<string | null>(null);
const isIncomingVisible = ref(false);
const isOutgoingVisible = ref(true);
const isBackgroundTransitioning = ref(false);
const BACKGROUND_FADE_MS = 700;
let backgroundFadeTimer: ReturnType<typeof setTimeout> | null = null;
let backgroundTransitionToken = 0;

const pickRandomBackground = (exclude?: string) => {
  const candidates = exclude
    ? splashBackgrounds.filter((url) => url !== exclude)
    : splashBackgrounds;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? splashBackgrounds[0];
};

const preloadImage = (url: string) => new Promise<void>((resolve) => {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  const img = new Image();
  img.onload = finish;
  img.onerror = finish;
  img.src = url;
  setTimeout(finish, 1200);
});

const switchBackground = async () => {
  if (isBackgroundTransitioning.value) return;
  const nextUrl = pickRandomBackground(currentBackgroundUrl.value);
  if (nextUrl === currentBackgroundUrl.value) return;
  const token = ++backgroundTransitionToken;

  if (backgroundFadeTimer) {
    clearTimeout(backgroundFadeTimer);
    backgroundFadeTimer = null;
  }

  await preloadImage(nextUrl);
  if (token !== backgroundTransitionToken) return;

  isBackgroundTransitioning.value = true;
  outgoingBackgroundUrl.value = currentBackgroundUrl.value;
  incomingBackgroundUrl.value = nextUrl;
  isOutgoingVisible.value = true;
  isIncomingVisible.value = false;
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (token !== backgroundTransitionToken) return;
  isIncomingVisible.value = true;
  isOutgoingVisible.value = false;

  backgroundFadeTimer = setTimeout(() => {
    if (token !== backgroundTransitionToken) return;
    currentBackgroundUrl.value = nextUrl;
    incomingBackgroundUrl.value = null;
    outgoingBackgroundUrl.value = null;
    isBackgroundTransitioning.value = false;
    backgroundFadeTimer = null;
  }, BACKGROUND_FADE_MS);
};

onMounted(() => {
  currentBackgroundUrl.value = pickRandomBackground();
  isVisible.value = true;
});

onBeforeUnmount(() => {
  backgroundTransitionToken += 1;
  if (backgroundFadeTimer) {
    clearTimeout(backgroundFadeTimer);
    backgroundFadeTimer = null;
  }
});
</script>
