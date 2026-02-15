<template>
  <div ref="rootEl" class="DungeonAppRoot" @click.stop>
    <section v-if="store.pageState === 'splash'" class="SplashScreen" aria-label="标题页面">
      <div class="SplashScreen__bg" />
      <div class="SplashScreen__content">
        <p class="SplashScreen__subtitle">ETHEREAL DUNGEON</p>
        <h1 class="SplashScreen__title">主界面 · 流式叙事冒险</h1>
        <p class="SplashScreen__desc">在酒馆消息流中运行的前端游戏界面，支持全屏、存档继续与实时文本渲染。</p>

        <div class="SplashScreen__actions">
          <button class="MainBtn MainBtn--ghost" type="button" @click="handleTutorial">新手教程</button>
          <button class="MainBtn MainBtn--primary" type="button" @click="handleNewGame">开始新游戏</button>
          <button
            class="MainBtn"
            :disabled="!store.hasSaveData"
            type="button"
            @click="handleContinueGame"
          >
            继续游戏
          </button>
          <button class="MainBtn" type="button" @click="toggleFullscreen">
            {{ isFullscreen ? '退出全屏' : '进入全屏' }}
          </button>
        </div>

        <footer class="SplashScreen__footer">
          <span>v0.1.0</span>
          <span>Dungeon UI by Tavern Helper</span>
        </footer>
      </div>
    </section>

    <div v-else class="DungeonUI">
      <aside class="Dock">
        <button
          v-for="item in dockItems"
          :key="item.key"
          class="Dock__btn"
          :class="{ 'is-active': activePanel === item.key }"
          type="button"
          @click="activePanel = item.key"
        >
          <span class="Dock__icon">{{ item.icon }}</span>
        </button>
      </aside>

      <section class="Stage">
        <header class="Stage__header">
          <div class="TitleBlock">
            <p class="TitleBlock__sub">ETHEREAL DUNGEON</p>
            <h3 class="TitleBlock__main">主界面 · 流式叙事面板</h3>
          </div>
          <div class="Stage__headerActions">
            <span class="Stage__status" :class="{ 'is-streaming': context.during_streaming }">
              {{ context.during_streaming ? '文本生成中' : '本轮完成' }}
            </span>
            <button class="Stage__fullscreenBtn" type="button" @click="toggleFullscreen">
              {{ isFullscreen ? '退出全屏' : '全屏' }}
            </button>
          </div>
        </header>

        <article class="StoryPanel">
          <div class="StoryPanel__title">
            <span>{{ activePanelName }}</span>
            <span class="StoryPanel__meta">消息 #{{ displayMessageId }}</span>
          </div>

          <div v-if="displayedMaintextHtml" class="StoryPanel__content" v-html="displayedMaintextHtml" />
          <div v-else class="StoryPanel__placeholder">等待开局楼层或模型返回文本…</div>

          <p v-if="currentSum" class="StoryPanel__sum">{{ currentSum }}</p>

          <div class="StoryPanel__actions">
            <button
              v-for="(option, index) in currentOptions"
              :key="`${displayMessageId}-${index}`"
              class="ActionBtn"
              :class="{ 'ActionBtn--danger': index === 0 }"
              type="button"
            >
              {{ option }}
            </button>
            <template v-if="currentOptions.length === 0">
              <button class="ActionBtn ActionBtn--danger" type="button">发起战斗</button>
              <button class="ActionBtn" type="button">悄悄绕行</button>
            </template>
          </div>
        </article>

        <footer class="Stage__footer">
          <span>字符数：{{ currentMaintext.length || normalizedText.length }}</span>
          <span>分段预览：{{ currentMaintext || latestSegment || '无' }}</span>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { injectStreamingMessageContext } from '@util/streaming';
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import type { PageState } from './store';
import { useDataStore } from './store';

type PanelKey = 'map' | 'deck' | 'relic' | 'setting';

const dockItems: Array<{ key: PanelKey; icon: string; name: string }> = [
  { key: 'map', icon: '🗺️', name: '地图' },
  { key: 'deck', icon: '📜', name: '卡组' },
  { key: 'relic', icon: '📦', name: '遗物' },
  { key: 'setting', icon: '⚙️', name: '设置' },
];

const activePanel = ref<PanelKey>('map');
const context = injectStreamingMessageContext();
const store = useDataStore();

const rootEl = ref<HTMLElement | null>(null);
const isFullscreen = ref<boolean>(false);
const currentMaintext = ref<string>('');
const currentSum = ref<string>('');
const currentOptions = ref<string[]>([]);
const parsedMessageId = ref<number | null>(null);

let stopMessageUpdatedListener: (() => void) | null = null;
let stopMessageReceivedListener: (() => void) | null = null;
let stopChatChangedListener: (() => void) | null = null;

const activePanelName = computed(() => {
  return dockItems.find((item) => item.key === activePanel.value)?.name ?? '面板';
});

const normalizedText = computed(() => {
  return context.message.replace(/\r\n/g, '\n').trim();
});

const latestSegment = computed(() => {
  const text = normalizedText.value;
  if (!text) {
    return '';
  }

  const paragraphSegments = text
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);

  if (paragraphSegments.length > 0) {
    return paragraphSegments.at(-1) ?? '';
  }

  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .at(-1) ?? '';
});

const displayMessageId = computed<number>(() => {
  return parsedMessageId.value ?? context.message_id;
});

const displayedMaintextHtml = computed(() => {
  const messageText = (currentMaintext.value || normalizedText.value).trim();
  if (!messageText) {
    return '';
  }

  try {
    return formatAsDisplayedMessage(messageText, {
      message_id: displayMessageId.value,
    });
  } catch (error) {
    console.warn('[主界面] 格式化文本失败，回退为纯文本渲染', error);
    return messageText.replace(/\n/g, '<br>');
  }
});

const setPageState = (state: PageState): void => {
  store.setPageState(state);
};

const extractTagContent = (source: string, tag: 'maintext' | 'option' | 'sum'): string => {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.trim() ?? '';
};

const parseOptions = (optionText: string): string[] => {
  return optionText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const loadLatestStructuredMessage = (force = false): void => {
  try {
    const assistantMessages = getChatMessages(-1, { role: 'assistant' }) as ChatMessage[];
    const fallbackMessages = getChatMessages(-1) as ChatMessage[];
    const latest = assistantMessages.at(-1) ?? fallbackMessages.at(-1);

    if (!latest) {
      return;
    }

    if (!force && parsedMessageId.value === latest.message_id) {
      return;
    }

    const rawMessage = latest.message ?? '';
    const maintext = extractTagContent(rawMessage, 'maintext');
    const optionText = extractTagContent(rawMessage, 'option');
    const sumText = extractTagContent(rawMessage, 'sum');

    currentMaintext.value = maintext || rawMessage.trim();
    currentOptions.value = parseOptions(optionText);
    currentSum.value = sumText;
    parsedMessageId.value = latest.message_id;
  } catch (error) {
    console.error('[主界面] 读取楼层并解析 XML 失败', error);
  }
};

const createOpeningStoryMessage = async (): Promise<boolean> => {
  const message = [
    '<maintext>',
    '你推开尘封的地城大门，潮湿空气裹挟着古老咒文迎面而来。',
    '火把在石壁上投下摇曳光影，前方岔路延伸进未知黑暗。',
    '</maintext>',
    '',
    '<sum>开局：已进入地城入口，等待第一次行动。</sum>',
    '',
    '<option>',
    'A. 点燃第二支火把，谨慎前进',
    'B. 贴墙潜行，先侦查声响来源',
    'C. 原地布置标记，建立退路',
    '</option>',
  ].join('\n');

  try {
    await createChatMessages(
      [
        {
          role: 'assistant',
          message,
        },
      ],
      { refresh: 'none' },
    );
    return true;
  } catch (error) {
    console.error('[主界面] 创建开局楼层失败', error);
    return false;
  }
};

const toggleFullscreen = async (): Promise<void> => {
  try {
    const target = rootEl.value;
    if (!target) {
      return;
    }

    if (!document.fullscreenElement) {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if ('webkitRequestFullscreen' in target) {
        (target as HTMLElement & { webkitRequestFullscreen: () => Promise<void> | void }).webkitRequestFullscreen();
      }
      return;
    }

    await document.exitFullscreen?.();
  } catch (err) {
    console.warn('[主界面] 全屏切换失败', err);
  }
};

const handleTutorial = async (): Promise<void> => {
  console.info('[主界面] 打开新手教程并进入游戏页面');
  setPageState('game');
  loadLatestStructuredMessage(true);
  await toggleFullscreen();
};

const handleNewGame = async (): Promise<void> => {
  console.info('[主界面] 开始新游戏并创建开局楼层');
  const created = await createOpeningStoryMessage();
  if (created) {
    store.setHasSaveData(true);
  }
  setPageState('game');
  loadLatestStructuredMessage(true);
  await toggleFullscreen();
};

const handleContinueGame = async (): Promise<void> => {
  console.info('[主界面] 继续游戏');
  setPageState('game');
  loadLatestStructuredMessage(true);
  await toggleFullscreen();
};

const handleFullscreenChange = (): void => {
  isFullscreen.value = document.fullscreenElement === rootEl.value;
};

const syncSaveStateAndStory = (): void => {
  store.setHasSaveData(getLastMessageId() >= 0);
  loadLatestStructuredMessage();
};

onMounted(() => {
  syncSaveStateAndStory();
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  stopMessageUpdatedListener = eventOn(tavern_events.MESSAGE_UPDATED, syncSaveStateAndStory).stop;
  stopMessageReceivedListener = eventOn(tavern_events.MESSAGE_RECEIVED, syncSaveStateAndStory).stop;
  stopChatChangedListener = eventOn(tavern_events.CHAT_CHANGED, syncSaveStateAndStory).stop;
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  stopMessageUpdatedListener?.();
  stopMessageReceivedListener?.();
  stopChatChangedListener?.();
  stopMessageUpdatedListener = null;
  stopMessageReceivedListener = null;
  stopChatChangedListener = null;
});

watchEffect(() => {
  store.setLatestSegment((currentMaintext.value || latestSegment.value).trim());
});
</script>

<style scoped lang="scss">
.DungeonAppRoot {
  width: 100%;
  min-height: 100%;
  height: 100%;
  position: relative;
  color: #e2e8f0;
}

.SplashScreen {
  position: relative;
  width: 100%;
  min-height: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 0.9rem;
  border: 1px solid rgb(148 163 184 / 26%);
  background: linear-gradient(165deg, #0f172a 0%, #121933 50%, #0f172a 100%);
  animation: fade-in 0.4s ease;
}

.SplashScreen__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 15%, rgb(59 130 246 / 20%) 0, transparent 48%),
    radial-gradient(circle at 75% 70%, rgb(168 85 247 / 16%) 0, transparent 46%);
  filter: blur(1px);
}

.SplashScreen__content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

.SplashScreen__subtitle {
  margin: 0;
  letter-spacing: 0.12em;
  opacity: 0.78;
  font-size: 0.75rem;
}

.SplashScreen__title {
  margin: 0;
  font-size: 1.18rem;
  line-height: 1.2;
}

.SplashScreen__desc {
  margin: 0;
  opacity: 0.82;
  font-size: 0.88rem;
  max-width: 60ch;
}

.SplashScreen__actions {
  margin-top: 0.2rem;
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.MainBtn {
  border: 1px solid rgb(148 163 184 / 38%);
  border-radius: 0.55rem;
  background: rgb(15 23 42 / 65%);
  color: #e2e8f0;
  padding: 0.38rem 0.76rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.MainBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.MainBtn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgb(96 165 250 / 55%);
  box-shadow: 0 0 18px rgb(59 130 246 / 18%);
}

.MainBtn--primary {
  border-color: rgb(56 189 248 / 68%);
  background: linear-gradient(145deg, rgb(14 116 144 / 82%), rgb(37 99 235 / 72%));
}

.MainBtn--ghost {
  background: rgb(51 65 85 / 44%);
}

.SplashScreen__footer {
  margin-top: 0.45rem;
  opacity: 0.58;
  font-size: 0.74rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.DungeonUI {
  margin: 0.25rem 0;
  padding: 0.6rem;
  border-radius: 0.9rem;
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0.7rem;
  color: #e2e8f0;
  background: linear-gradient(140deg, #0f172a 0%, #111827 65%, #1e293b 100%);
  border: 1px solid rgb(148 163 184 / 26%);
  box-shadow:
    0 12px 28px rgb(0 0 0 / 38%),
    inset 0 1px 0 rgb(255 255 255 / 4%);
  animation: fade-in 0.35s ease;
}

.Dock {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.Dock__btn {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid rgb(96 165 250 / 32%);
  background: rgb(15 23 42 / 85%);
  color: #93c5fd;
  cursor: pointer;
  transition: all 0.2s ease;
}

.Dock__btn:hover,
.Dock__btn.is-active {
  transform: translateY(-1px);
  border-color: rgb(125 211 252 / 65%);
  box-shadow: 0 0 16px rgb(56 189 248 / 20%);
}

.Dock__icon {
  font-size: 1rem;
}

.Stage {
  min-width: 0;
}

.Stage__header {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: flex-start;
  margin-bottom: 0.6rem;
}

.Stage__headerActions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.Stage__fullscreenBtn {
  border: 1px solid rgb(148 163 184 / 38%);
  border-radius: 0.45rem;
  background: rgb(30 41 59 / 62%);
  color: #e2e8f0;
  padding: 0.16rem 0.45rem;
  font-size: 0.72rem;
}

.TitleBlock__sub {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.TitleBlock__main {
  margin: 0.08rem 0 0;
  font-size: 0.98rem;
  font-weight: 700;
}

.Stage__status {
  flex-shrink: 0;
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  border: 1px solid rgb(148 163 184 / 28%);
  opacity: 0.85;
}

.Stage__status.is-streaming {
  color: #7dd3fc;
  border-color: rgb(56 189 248 / 62%);
}

.StoryPanel {
  border-radius: 0.7rem;
  border: 1px solid rgb(148 163 184 / 22%);
  background: rgb(15 23 42 / 66%);
  padding: 0.75rem;
}

.StoryPanel__title {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.78rem;
  opacity: 0.85;
}

.StoryPanel__meta {
  opacity: 0.62;
}

.StoryPanel__content {
  max-height: 20rem;
  overflow: auto;
  line-height: 1.58;
  word-break: break-word;
  font-size: 0.95rem;
}

.StoryPanel__placeholder {
  min-height: 5.5rem;
  display: grid;
  place-items: center;
  opacity: 0.68;
  border: 1px dashed rgb(125 211 252 / 28%);
  border-radius: 0.55rem;
  font-size: 0.9rem;
}

.StoryPanel__actions {
  margin-top: 0.65rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.StoryPanel__sum {
  margin: 0.55rem 0 0;
  padding: 0.42rem 0.55rem;
  border-left: 3px solid rgb(125 211 252 / 45%);
  background: rgb(30 41 59 / 55%);
  border-radius: 0.4rem;
  font-size: 0.78rem;
  opacity: 0.9;
}

.ActionBtn {
  border: 1px solid rgb(125 211 252 / 34%);
  border-radius: 0.4rem;
  background: transparent;
  color: #93c5fd;
  padding: 0.28rem 0.7rem;
  font-size: 0.78rem;
}

.ActionBtn--danger {
  color: #fecaca;
  border-color: rgb(248 113 113 / 45%);
  background: rgb(127 29 29 / 22%);
}

.Stage__footer {
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.16rem;
  font-size: 0.7rem;
  opacity: 0.62;
}

@media (max-width: 768px) {
  .DungeonUI {
    grid-template-columns: 2.25rem 1fr;
    gap: 0.55rem;
    padding: 0.5rem;
  }

  .StoryPanel__content {
    max-height: 16rem;
  }
}

@media (max-width: 480px) {
  .SplashScreen__content {
    padding: 0.72rem;
  }

  .SplashScreen__title {
    font-size: 1.02rem;
  }

  .DungeonUI {
    grid-template-columns: 2rem 1fr;
    border-radius: 0.75rem;
  }

  .Dock__btn {
    width: 1.95rem;
    height: 1.95rem;
  }

  .TitleBlock__main {
    font-size: 0.9rem;
  }

  .StoryPanel__content {
    max-height: 12rem;
    font-size: 0.88rem;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.DungeonAppRoot:fullscreen,
.DungeonAppRoot:-webkit-full-screen,
.DungeonAppRoot:-moz-full-screen,
.DungeonAppRoot:-ms-fullscreen {
  width: 100vw !important;
  min-height: 100vh !important;
  height: 100vh !important;
  margin: 0 !important;
  border-radius: 0 !important;
}
</style>
