<template>
  <div class="w-full relative">
    <!-- Splash Screen -->
    <Transition name="scene-fade" mode="out-in">
      <SplashScreen
        v-if="appState === 'SPLASH'"
        key="splash"
        @start="startGame"
        @toggle-fullscreen="toggleFullScreen"
        @open-collection="isCollectionOpen = true"
        @background-change="splashBackgroundUrl = $event"
      />

      <!-- Game -->
      <GameView
        v-else
        key="game"
        :show-opening-entry="isOpeningEntryOpen"
        :opening-entry-background-url="splashBackgroundUrl"
        :opening-entry-loading="isOpeningEntrySubmitting"
        :opening-entry-error="openingEntryError"
        @back-to-splash="handleBackToSplash"
        @submit-opening-entry="handleOpeningEntrySubmit"
      />
    </Transition>
    <WitchCollectionModal :is-open="isCollectionOpen" @close="isCollectionOpen = false" />
  </div>
</template>

<script setup lang="ts">
import GameView from './components/GameView.vue';
import SplashScreen from './components/SplashScreen.vue';
import WitchCollectionModal from './components/WitchCollectionModal.vue';
import { disposeBgm, initializeBgm } from './bgm';
import { toggleFullScreen } from './fullscreen';
import { useGameStore } from './gameStore';
import { buildOpeningPrompt, type OpeningInfoSubmission } from './openingProfile';

const appState = ref<'SPLASH' | 'GAME'>('SPLASH');
const isCollectionOpen = ref(false);
const isOpeningEntryOpen = ref(false);
const isOpeningEntrySubmitting = ref(false);
const openingEntryError = ref<string | null>(null);
const splashBackgroundUrl = ref('');
const gameStore = useGameStore();

onMounted(() => {
  void initializeBgm();
});

onUnmounted(() => {
  disposeBgm();
});

/**
 * 开始游戏：初始化 gameStore（加载最新楼层状态、MVU）
 */
async function startGame() {
  appState.value = 'GAME';
  isOpeningEntryOpen.value = false;
  isOpeningEntrySubmitting.value = false;
  openingEntryError.value = null;
  await nextTick();
  await gameStore.initialize();
  isOpeningEntryOpen.value = gameStore.isFreshChatSession();
}

function handleBackToSplash() {
  isOpeningEntryOpen.value = false;
  isOpeningEntrySubmitting.value = false;
  openingEntryError.value = null;
  appState.value = 'SPLASH';
}

async function handleOpeningEntrySubmit(payload: OpeningInfoSubmission) {
  if (isOpeningEntrySubmitting.value) return;

  isOpeningEntrySubmitting.value = true;
  openingEntryError.value = null;

  try {
    const roleProfile = {
      种族: payload.race,
      姓名: payload.name,
      年龄: payload.age,
      贞操: payload.chastity,
      天赋: payload.talent,
      外貌: payload.appearance,
      特征: payload.traits,
      身高: payload.heightCm,
      体重: payload.weightType,
      胸围: payload.bust,
      臀部: payload.hips,
      小穴: payload.vagina,
      屁穴: payload.anus,
      敏感点: payload.sensitivePoints,
      背景故事: payload.backstory,
    };

    const updated = await gameStore.updateStatDataFields({
      主角信息: roleProfile,
    });
    if (!updated) {
      gameStore.setPendingStatDataChanges({
        主角信息: roleProfile,
      });
    }

    await gameStore.sendAction(buildOpeningPrompt(payload));
    if (gameStore.error) {
      openingEntryError.value = gameStore.error;
      return;
    }

    isOpeningEntryOpen.value = false;
  } catch (err) {
    openingEntryError.value = err instanceof Error ? err.message : String(err);
  } finally {
    isOpeningEntrySubmitting.value = false;
  }
}
</script>

<style scoped>
/* Scene transition: fade + subtle scale */
.scene-fade-enter-active {
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}
.scene-fade-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
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
