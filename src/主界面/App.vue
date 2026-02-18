<template>
  <div class="w-full relative">
    <!-- Splash Screen -->
    <Transition name="scene-fade" mode="out-in">
      <SplashScreen
        v-if="appState === 'SPLASH'"
        key="splash"
        @start="startGame"
        @toggle-fullscreen="toggleFullScreen"
      />

      <!-- Game -->
      <GameView
        v-else
        key="game"
        @back-to-splash="appState = 'SPLASH'"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import GameView from './components/GameView.vue';
import SplashScreen from './components/SplashScreen.vue';
import { useGameStore } from './gameStore';

const appState = ref<'SPLASH' | 'GAME'>('SPLASH');
const gameStore = useGameStore();

/**
 * 开始游戏：初始化 gameStore（加载最新楼层状态、MVU）
 */
async function startGame() {
  appState.value = 'GAME';
  await nextTick();
  await gameStore.initialize();
}

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};
</script>

<style scoped>
/* Scene transition: fade + subtle scale */
.scene-fade-enter-active {
  transition: opacity 0.8s ease, transform 0.8s ease;
}
.scene-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.scene-fade-enter-from {
  opacity: 0;
  transform: scale(1.02);
}
.scene-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
