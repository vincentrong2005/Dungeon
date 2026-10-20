<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <div class="opening-entry-root">
    <div
      v-if="backgroundUrl"
      class="opening-backdrop"
      :style="{ backgroundImage: 'url(' + JSON.stringify(backgroundUrl) + ')' }"
      aria-hidden="true"
    ></div>
    <div class="opening-backdrop__shade" aria-hidden="true"></div>
    <div class="opening-backdrop__veil" aria-hidden="true"></div>

    <button type="button" class="opening-fullscreen-btn" aria-label="切换全屏" @click="toggleFullScreen">
      <Maximize class="size-4" />
    </button>

    <div class="opening-entry-shell">
      <form class="archive-panel" @submit.prevent="handleSubmit">
        <div class="archive-panel__frame" aria-hidden="true"></div>

        <header class="archive-header">
          <div class="archive-heading">
            <p class="archive-eyebrow"><span></span>ABYSSAL OATH</p>
            <h1 class="archive-title">开局信息录入</h1>
            <p class="archive-description">
              在踏入欲望之神的地下城前，让世界记住 {{ previewName }} 的模样。
              三页记录会化作她的档案，并成为命运编织开场时最初的线索。
            </p>
          </div>

          <nav class="stepper" aria-label="信息录入步骤">
            <button
              v-for="(stepInfo, index) in stepItems"
              :key="stepInfo.key"
              type="button"
              class="step-chip"
              :class="{
                'step-chip--active': currentStep === index,
                'step-chip--done': currentStep > index,
              }"
              :aria-current="currentStep === index ? 'step' : undefined"
              @click="jumpToStep(index)"
            >
              <span class="step-chip__index" aria-hidden="true">
                <Check v-if="currentStep > index" class="size-4" />
                <span v-else>0{{ index + 1 }}</span>
              </span>
              <span class="step-chip__copy">
                <span class="step-chip__title">{{ stepInfo.title }}</span>
                <span class="step-chip__status">
                  {{ currentStep === index ? '进行中' : currentStep > index ? '已完成' : '待进入' }}
                </span>
              </span>
            </button>
          </nav>
        </header>

        <div class="archive-content">
          <aside class="archive-rail">
            <section class="chapter-panel" aria-labelledby="chapter-heading">
              <div class="chapter-panel__topline">
                <span class="chapter-kicker">CHAPTER {{ currentStep + 1 }} / 03</span>
                <ScrollText class="chapter-icon" aria-hidden="true" />
              </div>
              <div class="chapter-seal" aria-hidden="true">
                <Fingerprint />
              </div>
              <p class="chapter-overline">档案章节</p>
              <h2 id="chapter-heading" class="chapter-title">{{ currentStepInfo.title }}</h2>
              <p class="chapter-description">{{ currentStepInfo.description }}</p>
              <div class="chapter-rule" aria-hidden="true"><span></span></div>
              <p class="chapter-note">请将真实的她，留在深渊的记录之中。</p>
            </section>

            <section class="preview-panel" aria-labelledby="preview-heading">
              <div class="preview-heading">
                <div class="preview-heading__icon"><UserRound class="size-4" /></div>
                <div>
                  <p class="preview-overline">LIVE CHARACTER RECORD</p>
                  <h2 id="preview-heading">镜中映像</h2>
                </div>
                <span class="preview-live" aria-label="实时更新"></span>
              </div>

              <div class="preview-groups">
                <section v-for="group in profilePreviewGroups" :key="group.title" class="preview-group">
                  <h3 class="preview-group__title">{{ group.title }}</h3>
                  <dl class="preview-fields">
                    <div v-for="field in group.fields" :key="field.label" class="preview-row">
                      <dt>{{ field.label }}</dt>
                      <dd :class="{ 'preview-row__value--empty': field.value === '未填写' }">
                        {{ field.value }}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </section>
          </aside>

          <main class="archive-form-area">
            <div class="form-stage-heading">
              <div>
                <p class="form-stage-overline">RECORD ENTRY <span>·</span> 0{{ currentStep + 1 }}</p>
                <h2>{{ currentStepInfo.title }}</h2>
              </div>
              <span class="form-stage-rule" aria-hidden="true"></span>
            </div>

            <Transition name="step-fade" mode="out-in">
              <div :key="currentStep" class="step-content">
                <template v-if="currentStep === 0">
                  <div class="form-grid">
                    <label class="field">
                      <span class="form-label">种族</span>
                      <select v-model="selectedRace" class="form-control">
                        <option v-for="option in RACE_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label v-if="selectedRace === '自定义'" class="field">
                      <span class="form-label">自定义种族</span>
                      <input
                        v-model="customRace"
                        type="text"
                        class="form-control"
                        maxlength="30"
                        placeholder="输入你的种族名"
                      />
                    </label>

                    <label class="field">
                      <span class="form-label">姓名</span>
                      <input v-model="name" type="text" class="form-control" maxlength="30" placeholder="请输入姓名" />
                    </label>

                    <label class="field">
                      <span class="form-label">年龄</span>
                      <input
                        :value="ageInput"
                        type="text"
                        inputmode="numeric"
                        maxlength="3"
                        class="form-control"
                        placeholder="仅支持数字"
                        @input="handleAgeInput"
                      />
                    </label>

                    <label class="field">
                      <span class="form-label">贞操</span>
                      <select v-model="chastity" class="form-control">
                        <option v-for="option in CHASTITY_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="field field--wide">
                      <span class="form-label">天赋</span>
                      <input
                        v-model="talent"
                        type="text"
                        class="form-control"
                        maxlength="80"
                        placeholder="可选，自定义填写"
                      />
                    </label>

                    <label class="field field--wide">
                      <span class="form-label">外貌</span>
                      <input
                        v-model="appearance"
                        type="text"
                        class="form-control"
                        maxlength="120"
                        placeholder="可选，自定义填写"
                      />
                    </label>

                    <label class="field field--wide">
                      <span class="form-label">特征</span>
                      <input
                        v-model="traits"
                        type="text"
                        class="form-control"
                        maxlength="120"
                        placeholder="可选，自定义填写"
                      />
                    </label>
                  </div>
                </template>

                <template v-else-if="currentStep === 1">
                  <div class="form-grid">
                    <label class="field field--wide">
                      <span class="form-label">身高</span>
                      <div class="range-panel">
                        <div class="range-heading">
                          <span class="range-endpoint">140 cm</span>
                          <span class="range-value">{{ heightCm }}<small>cm</small></span>
                          <span class="range-endpoint">200 cm</span>
                        </div>
                        <input
                          v-model="heightCm"
                          type="range"
                          min="140"
                          max="200"
                          class="range-control"
                          aria-label="身高"
                        />
                        <div class="range-ticks" aria-hidden="true">
                          <span></span><span></span><span></span><span></span><span></span>
                        </div>
                      </div>
                    </label>

                    <label class="field">
                      <span class="form-label">体重</span>
                      <select v-model="weightType" class="form-control">
                        <option v-for="option in WEIGHT_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="field">
                      <span class="form-label">胸围</span>
                      <select v-model="bust" class="form-control">
                        <option v-for="option in BUST_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="field">
                      <span class="form-label">臀部</span>
                      <select v-model="hips" class="form-control">
                        <option v-for="option in HIP_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="field">
                      <span class="form-label">小穴</span>
                      <select v-model="vagina" class="form-control">
                        <option v-for="option in VAGINA_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="field">
                      <span class="form-label">屁穴</span>
                      <select v-model="anus" class="form-control">
                        <option v-for="option in ANUS_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="field field--wide">
                      <span class="form-label">敏感点</span>
                      <input
                        v-model="sensitivePoints"
                        type="text"
                        class="form-control"
                        maxlength="80"
                        placeholder="可选，自定义填写"
                      />
                    </label>
                  </div>
                </template>

                <template v-else>
                  <div class="story-step">
                    <div class="draft-panel">
                      <div class="draft-panel__copy">
                        <div class="draft-panel__title">
                          <Sparkles class="size-4" />
                          <span>命运的草稿</span>
                        </div>
                        <p>结合当前已填写的信息，生成一份可继续修改的背景故事草稿。</p>
                      </div>
                      <button
                        type="button"
                        class="action-btn action-btn--secondary"
                        :disabled="isBusy || !canGenerateBackstory"
                        @click="handleGenerateBackstory"
                      >
                        <Sparkles class="size-4" />
                        {{ backgroundDraftLoading ? '补完中...' : '生成背景草稿' }}
                      </button>
                    </div>

                    <p v-if="backgroundDraftError" class="draft-error" role="alert">{{ backgroundDraftError }}</p>

                    <label class="field story-field">
                      <span class="form-label">自定义背景故事</span>
                      <textarea
                        v-model="backstory"
                        class="form-control story-textarea"
                        maxlength="4000"
                        placeholder="请尽量详细地描述她的来历、身份、性格、欲望、能力、过去经历、与地下城的关系等。越详细越好。"
                      ></textarea>
                      <span class="character-count">{{ backstory.length }} / 4000</span>
                    </label>
                  </div>
                </template>
              </div>
            </Transition>
          </main>
        </div>

        <footer class="archive-footer">
          <div class="footer-message" aria-live="polite">
            <span
              class="footer-message__mark"
              :class="{ 'footer-message__mark--error': currentStepMessage || error }"
              aria-hidden="true"
            >
              {{ currentStepMessage || error ? '!' : '✦' }}
            </span>
            <p v-if="currentStepMessage" class="footer-message__text footer-message__text--error">
              {{ currentStepMessage }}
            </p>
            <p v-else-if="error" class="footer-message__text footer-message__text--error">{{ error }}</p>
            <p v-else class="footer-message__text">
              当三页档案都铭刻完毕，命运便会以此为引，展开 {{ previewName }} 初次踏入地下城的序章。
            </p>
          </div>

          <div class="footer-actions">
            <button type="button" class="action-btn action-btn--quiet" :disabled="isBusy" @click="handleBackAction">
              <ArrowLeft class="size-4" />
              {{ currentStep === 0 ? '返回主菜单' : '上一页' }}
            </button>

            <button
              v-if="currentStep < stepItems.length - 1"
              type="button"
              class="action-btn action-btn--primary"
              :disabled="isBusy || Boolean(currentStepMessage)"
              @click="goNext"
            >
              下一页
              <ArrowRight class="size-4" />
            </button>
            <button
              v-else
              type="submit"
              class="action-btn action-btn--primary"
              :disabled="isBusy || Boolean(validationMessage)"
            >
              {{ loading ? '命运编织中...' : '铭刻档案并进入地下城' }}
              <ShieldCheck class="size-4" />
            </button>
          </div>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Maximize,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-vue-next';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import type { OpeningInfoSubmission } from '../openingProfile';
import {
  ANUS_OPTIONS,
  BUST_OPTIONS,
  CHASTITY_OPTIONS,
  HIP_OPTIONS,
  RACE_OPTIONS,
  VAGINA_OPTIONS,
  WEIGHT_OPTIONS,
} from '../openingProfile';

const props = defineProps<{
  backgroundUrl?: string;
  loading: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  submit: [payload: OpeningInfoSubmission];
  backToSplash: [];
}>();

const gameStore = useGameStore();
const stepItems = [
  {
    key: 'basic',
    title: '基础信息',
    description: '先留下她最初的名字与来历。当地牢第一次注视她时，首先看见的便是这些。',
  },
  {
    key: 'body',
    title: '体型',
    description: '再描摹她的身体轮廓与私密细节。越清晰，深渊回望她时就越真实。',
  },
  {
    key: 'story',
    title: '背景故事',
    description: '最后写下她的过去、执念与欲望。那些未说尽的故事，会在地下城里继续生长。',
  },
] as const;

const currentStep = ref(0);
const selectedRace = ref<(typeof RACE_OPTIONS)[number]>('人类');
const customRace = ref('');
const name = ref('');
const ageInput = ref('');
const chastity = ref<OpeningInfoSubmission['chastity']>('处女');
const talent = ref('');
const appearance = ref('');
const traits = ref('');
const heightCm = ref(165);
const weightType = ref<(typeof WEIGHT_OPTIONS)[number]>('匀称');
const bust = ref<(typeof BUST_OPTIONS)[number]>('C');
const hips = ref<(typeof HIP_OPTIONS)[number]>('圆润');
const vagina = ref<(typeof VAGINA_OPTIONS)[number]>('粉嫩型');
const anus = ref<(typeof ANUS_OPTIONS)[number]>('紧致');
const sensitivePoints = ref('');
const backstory = ref('');
const backgroundDraftLoading = ref(false);
const backgroundDraftError = ref<string | null>(null);

const currentStepInfo = computed(() => stepItems[currentStep.value] ?? stepItems[0]);
const resolvedRace = computed(() => (selectedRace.value === '自定义' ? customRace.value.trim() : selectedRace.value));
const previewName = computed(() => name.value.trim() || '{{user}}');
const isBusy = computed(() => props.loading || backgroundDraftLoading.value);
const canGenerateBackstory = computed(() => !stepMessages.value[0]);

const profilePreviewGroups = computed(() => [
  {
    title: '身份档案',
    fields: [
      { label: '姓名', value: name.value.trim() || '未填写' },
      { label: '种族', value: resolvedRace.value || '未填写' },
      { label: '年龄', value: ageInput.value ? ageInput.value + ' 岁' : '未填写' },
      { label: '贞操', value: chastity.value || '未填写' },
    ],
  },
  {
    title: '天赋与外貌',
    fields: [
      { label: '天赋', value: talent.value.trim() || '未填写' },
      { label: '外貌', value: appearance.value.trim() || '未填写' },
      { label: '特征', value: traits.value.trim() || '未填写' },
    ],
  },
  {
    title: '体型记录',
    fields: [
      { label: '身高', value: String(heightCm.value) + ' cm' },
      { label: '体重', value: weightType.value || '未填写' },
      { label: '胸围', value: bust.value || '未填写' },
      { label: '臀部', value: hips.value || '未填写' },
      { label: '小穴', value: vagina.value || '未填写' },
      { label: '屁穴', value: anus.value || '未填写' },
      { label: '敏感点', value: sensitivePoints.value.trim() || '未填写' },
    ],
  },
  {
    title: '背景故事',
    fields: [{ label: '记录', value: backstory.value.trim() || '未填写' }],
  },
]);

const validationMessage = computed(() => {
  if (!resolvedRace.value) return '请填写种族。';
  if (!name.value.trim()) return '请填写姓名。';
  if (!/^\d+$/u.test(ageInput.value)) return '年龄仅支持数字。';
  if (!backstory.value.trim()) return '请填写背景故事，越详细越好。';
  return '';
});

const stepMessages = computed(() => {
  const basic = !resolvedRace.value
    ? '请先填写种族。'
    : !name.value.trim()
      ? '请先填写姓名。'
      : !/^\d+$/u.test(ageInput.value)
        ? '年龄仅支持数字。'
        : '';

  const body = '';
  const story = !backstory.value.trim() ? '请填写背景故事，越详细越好。' : '';

  return [basic, body, story];
});

const currentStepMessage = computed(() => stepMessages.value[currentStep.value] ?? '');

const handleAgeInput = (event: Event) => {
  const nextValue = (event.target as HTMLInputElement).value.replace(/\D+/gu, '').slice(0, 3);
  ageInput.value = nextValue;
};

const jumpToStep = (index: number) => {
  if (isBusy.value) return;
  if (index <= currentStep.value) {
    currentStep.value = index;
    return;
  }
  const blockedIndex = stepMessages.value.findIndex((message, i) => i < index && Boolean(message));
  currentStep.value = blockedIndex >= 0 ? blockedIndex : index;
};

const goPrev = () => {
  if (isBusy.value || currentStep.value === 0) return;
  currentStep.value -= 1;
};

const handleBackAction = () => {
  if (isBusy.value) return;
  if (currentStep.value === 0) {
    emit('backToSplash');
    return;
  }
  goPrev();
};

const goNext = () => {
  if (isBusy.value || currentStep.value >= stepItems.length - 1) return;
  if (currentStepMessage.value) return;
  currentStep.value += 1;
};

const buildCurrentSubmission = (): OpeningInfoSubmission => ({
  race: resolvedRace.value,
  name: name.value.trim(),
  age: Number(ageInput.value),
  chastity: chastity.value,
  talent: talent.value.trim(),
  appearance: appearance.value.trim(),
  traits: traits.value.trim(),
  heightCm: Number(heightCm.value),
  weightType: weightType.value,
  bust: bust.value,
  hips: hips.value,
  vagina: vagina.value,
  anus: anus.value,
  sensitivePoints: sensitivePoints.value.trim(),
  backstory: backstory.value.trim(),
});

const handleGenerateBackstory = async () => {
  if (isBusy.value || !canGenerateBackstory.value) return;

  backgroundDraftLoading.value = true;
  backgroundDraftError.value = null;

  try {
    const draft = await gameStore.generateOpeningBackstoryDraft(buildCurrentSubmission());
    backstory.value = draft;
  } catch (err) {
    backgroundDraftError.value = err instanceof Error ? err.message : String(err);
  } finally {
    backgroundDraftLoading.value = false;
  }
};

const handleSubmit = () => {
  if (isBusy.value || validationMessage.value) return;

  emit('submit', buildCurrentSubmission());
};
</script>

<style scoped>
.opening-entry-root {
  position: absolute;
  z-index: 140;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: #eadfc9;
  -webkit-overflow-scrolling: touch;
}

.opening-backdrop,
.opening-backdrop__shade,
.opening-backdrop__veil {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.opening-backdrop {
  z-index: -3;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.opening-backdrop__shade {
  z-index: -2;
  background:
    radial-gradient(ellipse at 50% 34%, rgba(77, 57, 35, 0.2), transparent 58%),
    linear-gradient(180deg, rgba(4, 4, 5, 0.46), rgba(4, 4, 5, 0.76));
}

.opening-backdrop__veil {
  z-index: -1;
  background: rgba(5, 5, 7, 0.22);
  backdrop-filter: blur(2px);
}

.opening-entry-shell {
  display: flex;
  min-height: 100%;
  align-items: flex-start;
  justify-content: center;
  padding: max(4.25rem, calc(env(safe-area-inset-top) + 1rem)) max(0.75rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
}

.archive-panel {
  position: relative;
  isolation: isolate;
  width: min(100%, 1440px);
  overflow: hidden;
  border: 1px solid rgba(168, 128, 61, 0.75);
  border-radius: 6px;
  background:
    radial-gradient(ellipse at 15% 0%, rgba(118, 91, 52, 0.1), transparent 32%),
    repeating-linear-gradient(135deg, transparent 0 18px, rgba(201, 174, 119, 0.012) 18px 19px),
    linear-gradient(145deg, rgba(23, 20, 18, 0.96), rgba(13, 12, 12, 0.97) 56%, rgba(17, 13, 12, 0.97));
  box-shadow:
    0 28px 88px rgba(0, 0, 0, 0.68),
    0 0 0 1px rgba(12, 9, 7, 0.8),
    inset 0 1px 0 rgba(252, 223, 166, 0.1);
  backdrop-filter: blur(18px);
}

.archive-panel__frame {
  position: absolute;
  z-index: 0;
  inset: 8px;
  border: 1px solid rgba(173, 139, 80, 0.2);
  pointer-events: none;
  background-image:
    linear-gradient(90deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(180deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(270deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(180deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(90deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(0deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(270deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68)),
    linear-gradient(0deg, rgba(202, 166, 97, 0.68), rgba(202, 166, 97, 0.68));
  background-repeat: no-repeat;
  background-position:
    left top,
    left top,
    right top,
    right top,
    left bottom,
    left bottom,
    right bottom,
    right bottom;
  background-size:
    19px 1px,
    1px 19px,
    19px 1px,
    1px 19px,
    19px 1px,
    1px 19px,
    19px 1px,
    1px 19px;
}

.archive-header,
.archive-content,
.archive-footer {
  position: relative;
  z-index: 1;
}

.archive-header {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  gap: 2rem;
  align-items: end;
  padding: 2.25rem 2.5rem 1.75rem;
  border-bottom: 1px solid rgba(167, 126, 60, 0.46);
  background: linear-gradient(180deg, rgba(8, 7, 7, 0.24), rgba(0, 0, 0, 0.04));
}

.archive-heading {
  min-width: 0;
}

.archive-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0;
  color: rgba(201, 166, 101, 0.76);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.26em;
}

.archive-eyebrow span {
  width: 1.35rem;
  height: 1px;
  background: #a98244;
  box-shadow: 0 0 8px rgba(192, 153, 86, 0.35);
}

.archive-title {
  margin: 0.55rem 0 0;
  color: #f2dfb9;
  font-family: var(--font-heading, inherit);
  font-size: 2.15rem;
  font-weight: 500;
  line-height: 1.25;
}

.archive-description {
  max-width: 39rem;
  margin: 0.85rem 0 0;
  color: rgba(222, 211, 192, 0.72);
  font-size: 1rem;
  line-height: 1.8;
}

.stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  min-width: 0;
}

.step-chip {
  display: flex;
  min-width: 0;
  min-height: 72px;
  align-items: center;
  gap: 0.72rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid rgba(164, 133, 79, 0.3);
  border-radius: 4px;
  background: rgba(5, 5, 6, 0.38);
  color: #cfbea0;
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}

.step-chip:hover {
  border-color: rgba(207, 169, 100, 0.64);
  background-color: rgba(46, 36, 24, 0.58);
}

.step-chip:focus-visible,
.opening-fullscreen-btn:focus-visible,
.action-btn:focus-visible {
  outline: 2px solid #d7b16c;
  outline-offset: 2px;
}

.step-chip--active {
  border-color: rgba(222, 183, 108, 0.94);
  background: linear-gradient(145deg, rgba(94, 69, 33, 0.42), rgba(39, 30, 21, 0.68));
  box-shadow:
    inset 0 0 0 1px rgba(224, 189, 121, 0.14),
    0 0 16px rgba(171, 127, 54, 0.12);
  color: #f0ddb5;
}

.step-chip--done {
  border-color: rgba(108, 139, 92, 0.52);
  background: rgba(35, 48, 33, 0.3);
}

.step-chip__index {
  display: grid;
  width: 1.85rem;
  height: 1.85rem;
  flex: 0 0 1.85rem;
  place-items: center;
  border: 1px solid rgba(191, 157, 93, 0.42);
  border-radius: 50%;
  color: #c7a765;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}

.step-chip--active .step-chip__index {
  border-color: rgba(231, 194, 119, 0.84);
  background: rgba(175, 132, 57, 0.15);
  color: #f6d99d;
}

.step-chip--done .step-chip__index {
  border-color: rgba(132, 166, 109, 0.68);
  color: #a2bd8b;
}

.step-chip__copy {
  display: grid;
  min-width: 0;
  gap: 0.22rem;
}

.step-chip__title {
  color: #ead9b8;
  font-size: 0.92rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.step-chip__status {
  color: rgba(196, 181, 155, 0.53);
  font-size: 0.75rem;
}

.step-chip--active .step-chip__status {
  color: #d5b775;
}

.step-chip--done .step-chip__status {
  color: #9eb287;
}

.archive-content {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: 620px;
}

.archive-rail {
  min-width: 0;
  padding: 1.45rem 1.25rem 1.6rem 1.65rem;
  border-right: 1px solid rgba(167, 126, 60, 0.32);
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.15), rgba(8, 7, 7, 0.06));
}

.chapter-panel,
.preview-panel {
  position: relative;
  min-width: 0;
  border: 1px solid rgba(164, 132, 80, 0.3);
  border-radius: 4px;
  background: linear-gradient(145deg, rgba(29, 25, 21, 0.78), rgba(13, 12, 12, 0.7));
}

.chapter-panel {
  min-height: 225px;
  overflow: hidden;
  padding: 1rem 1.05rem 1.05rem;
}

.chapter-panel::after {
  position: absolute;
  right: -2.5rem;
  bottom: -4rem;
  width: 10rem;
  height: 10rem;
  border: 1px solid rgba(188, 153, 90, 0.1);
  border-radius: 50%;
  box-shadow:
    0 0 0 12px rgba(188, 153, 90, 0.025),
    0 0 0 26px rgba(188, 153, 90, 0.02);
  content: '';
  pointer-events: none;
}

.chapter-panel__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(194, 161, 100, 0.66);
}

.chapter-kicker,
.preview-overline,
.form-stage-overline {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.18em;
}

.chapter-icon {
  width: 1rem;
  height: 1rem;
  stroke-width: 1.4;
}

.chapter-seal {
  display: grid;
  width: 2.45rem;
  height: 2.45rem;
  margin-top: 1.25rem;
  place-items: center;
  border: 1px solid rgba(185, 146, 77, 0.55);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(153, 112, 43, 0.22), rgba(26, 20, 13, 0.12) 70%);
  color: #caa65e;
  box-shadow: inset 0 0 0 3px rgba(185, 146, 77, 0.06);
}

.chapter-seal svg {
  width: 1.15rem;
  height: 1.15rem;
  stroke-width: 1.5;
}

.chapter-overline {
  margin: 0.9rem 0 0;
  color: rgba(202, 177, 133, 0.64);
  font-size: 0.76rem;
  letter-spacing: 0.12em;
}

.chapter-title {
  margin: 0.35rem 0 0;
  color: #eddaaf;
  font-family: var(--font-heading, inherit);
  font-size: 1.38rem;
  font-weight: 500;
  line-height: 1.35;
}

.chapter-description {
  margin: 0.65rem 0 0;
  color: rgba(218, 205, 182, 0.76);
  font-size: 0.9rem;
  line-height: 1.75;
}

.chapter-rule {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.chapter-rule::before,
.chapter-rule::after {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, transparent, rgba(181, 144, 75, 0.55));
  content: '';
}

.chapter-rule::after {
  transform: rotate(180deg);
}

.chapter-rule span {
  width: 0.34rem;
  height: 0.34rem;
  transform: rotate(45deg);
  border: 1px solid rgba(206, 169, 98, 0.7);
}

.chapter-note {
  margin: 0.65rem 0 0;
  color: rgba(194, 176, 148, 0.56);
  font-size: 0.76rem;
  line-height: 1.5;
}

.preview-panel {
  margin-top: 1rem;
  padding: 0.95rem 1rem 0.75rem;
}

.preview-heading {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(164, 132, 80, 0.22);
}

.preview-heading__icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 2rem;
  place-items: center;
  border: 1px solid rgba(174, 137, 72, 0.38);
  border-radius: 50%;
  color: #c8a25b;
}

.preview-overline {
  margin: 0;
  color: rgba(191, 157, 97, 0.6);
  font-size: 0.72rem;
  letter-spacing: 0.13em;
}

.preview-heading h2 {
  margin: 0.15rem 0 0;
  color: #e6d5b4;
  font-family: var(--font-heading, inherit);
  font-size: 1.12rem;
  font-weight: 500;
}

.preview-live {
  width: 0.42rem;
  height: 0.42rem;
  margin-left: auto;
  border-radius: 50%;
  background: #9aaf77;
  box-shadow: 0 0 8px rgba(154, 175, 119, 0.45);
}

.preview-groups {
  max-height: 430px;
  overflow: auto;
  scrollbar-color: rgba(172, 137, 76, 0.5) rgba(4, 4, 4, 0.2);
  scrollbar-width: thin;
}

.preview-group {
  padding-top: 0.72rem;
}

.preview-group + .preview-group {
  margin-top: 0.15rem;
  border-top: 1px solid rgba(164, 132, 80, 0.16);
}

.preview-group__title {
  margin: 0 0 0.28rem;
  color: rgba(198, 163, 99, 0.77);
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.1em;
}

.preview-fields {
  margin: 0;
}

.preview-row {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr);
  gap: 0.45rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid rgba(218, 203, 177, 0.055);
  font-size: 0.88rem;
  line-height: 1.5;
}

.preview-row dt {
  color: rgba(203, 188, 162, 0.58);
}

.preview-row dd {
  min-width: 0;
  margin: 0;
  color: rgba(232, 219, 196, 0.86);
  overflow-wrap: anywhere;
}

.preview-row dd.preview-row__value--empty {
  color: rgba(180, 166, 144, 0.4);
}

.preview-group:last-child .preview-row dd {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.archive-form-area {
  min-width: 0;
  padding: 2rem 2.5rem 2.25rem;
}

.form-stage-heading {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.5rem;
}

.form-stage-overline {
  margin: 0;
  color: rgba(191, 157, 97, 0.64);
}

.form-stage-overline span {
  padding: 0 0.28rem;
  color: rgba(218, 183, 113, 0.8);
}

.form-stage-heading h2 {
  margin: 0.3rem 0 0;
  color: #eddfc5;
  font-family: var(--font-heading, inherit);
  font-size: 1.42rem;
  font-weight: 500;
}

.form-stage-rule {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, rgba(171, 131, 62, 0.38), transparent);
}

.step-content {
  min-height: 390px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.15rem 1.25rem;
}

.field {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 0.48rem;
}

.field--wide {
  grid-column: 1 / -1;
}

.form-label {
  color: rgba(230, 213, 182, 0.85);
  font-size: 0.92rem;
  letter-spacing: 0.075em;
}

.form-control {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 52px;
  border: 1px solid rgba(143, 111, 58, 0.55);
  border-radius: 4px;
  outline: none;
  background-color: rgba(6, 6, 7, 0.58);
  padding: 0.82rem 0.95rem;
  color: #eee2cb;
  font: inherit;
  font-size: 1rem;
  line-height: 1.5;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

select.form-control {
  appearance: none;
  padding-right: 2.5rem;
  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Cpath d='m3 5 4 4 4-4' stroke='%23c7a25e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
}

select.form-control option {
  background: #171412;
  color: #eee2cb;
}

textarea.form-control {
  min-height: 310px;
  resize: vertical;
}

.form-control:focus {
  border-color: rgba(215, 177, 103, 0.9);
  background-color: rgba(9, 8, 8, 0.78);
  box-shadow:
    0 0 0 1px rgba(215, 177, 103, 0.34),
    0 0 15px rgba(162, 120, 49, 0.11);
}

.form-control::placeholder {
  color: rgba(188, 176, 155, 0.44);
}

.range-panel {
  min-height: 94px;
  border: 1px solid rgba(143, 111, 58, 0.43);
  border-radius: 4px;
  background: rgba(5, 5, 6, 0.43);
  padding: 0.8rem 1rem 0.6rem;
}

.range-heading {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.range-endpoint {
  color: rgba(189, 176, 151, 0.56);
  font-size: 0.78rem;
}

.range-endpoint:last-child {
  text-align: right;
}

.range-value {
  color: #f1d69d;
  font-size: 1.28rem;
  font-variant-numeric: tabular-nums;
}

.range-value small {
  margin-left: 0.12rem;
  color: rgba(224, 203, 163, 0.68);
  font-size: 0.8rem;
}

.range-control {
  display: block;
  width: 100%;
  height: 18px;
  margin: 0.35rem 0 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.range-control::-webkit-slider-runnable-track {
  height: 4px;
  border: 1px solid rgba(159, 123, 61, 0.45);
  border-radius: 5px;
  background: linear-gradient(90deg, rgba(122, 91, 43, 0.8), rgba(81, 65, 43, 0.65));
}

.range-control::-moz-range-track {
  height: 4px;
  border: 1px solid rgba(159, 123, 61, 0.45);
  border-radius: 5px;
  background: linear-gradient(90deg, rgba(122, 91, 43, 0.8), rgba(81, 65, 43, 0.65));
}

.range-control::-webkit-slider-thumb {
  width: 15px;
  height: 15px;
  margin-top: -6px;
  appearance: none;
  border: 2px solid #dfbf7b;
  border-radius: 50%;
  background: #4a3820;
  box-shadow: 0 0 8px rgba(214, 172, 91, 0.3);
}

.range-control::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid #dfbf7b;
  border-radius: 50%;
  background: #4a3820;
  box-shadow: 0 0 8px rgba(214, 172, 91, 0.3);
}

.range-control:focus-visible {
  outline: 1px solid rgba(222, 183, 108, 0.85);
  outline-offset: 4px;
}

.range-ticks {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.range-ticks span {
  width: 1px;
  height: 4px;
  background: rgba(197, 163, 100, 0.36);
}

.story-step {
  display: grid;
  gap: 1.1rem;
}

.draft-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(151, 118, 62, 0.4);
  border-radius: 4px;
  background: linear-gradient(110deg, rgba(37, 30, 22, 0.66), rgba(13, 12, 12, 0.52));
  padding: 0.95rem 1rem;
}

.draft-panel__copy {
  min-width: 0;
}

.draft-panel__title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #e7d2a8;
  font-size: 0.92rem;
}

.draft-panel__title svg {
  color: #c5a35f;
}

.draft-panel__copy p {
  margin: 0.3rem 0 0;
  color: rgba(202, 191, 170, 0.63);
  font-size: 0.84rem;
  line-height: 1.55;
}

.story-field {
  position: relative;
}

.story-textarea {
  min-height: 330px;
  padding-bottom: 2rem;
  line-height: 1.8;
}

.character-count {
  position: absolute;
  right: 0.75rem;
  bottom: 0.65rem;
  color: rgba(190, 176, 151, 0.47);
  font-size: 0.74rem;
  pointer-events: none;
}

.draft-error {
  margin: -0.45rem 0 0;
  color: #d89a91;
  font-size: 0.9rem;
}

.archive-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 88px;
  border-top: 1px solid rgba(167, 126, 60, 0.42);
  background: rgba(3, 3, 4, 0.26);
  padding: 1rem 2.25rem;
}

.footer-message {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.6rem;
}

.footer-message__mark {
  display: grid;
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 1.15rem;
  margin-top: 0.08rem;
  place-items: center;
  border: 1px solid rgba(183, 144, 74, 0.47);
  border-radius: 50%;
  color: #c7a35f;
  font-size: 0.62rem;
}

.footer-message__mark--error {
  border-color: rgba(179, 105, 91, 0.58);
  color: #d99a8e;
}

.footer-message__text {
  max-width: 45rem;
  margin: 0;
  color: rgba(205, 192, 168, 0.66);
  font-size: 0.86rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.footer-message__text--error {
  color: #d9a198;
}

.footer-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.7rem;
}

.action-btn {
  display: inline-flex;
  min-height: 48px;
  min-width: 138px;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.65rem 1rem;
  color: #ead9b8;
  font-family: var(--font-heading, inherit);
  font-size: 0.95rem;
  line-height: 1.35;
  text-align: center;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease,
    color 150ms ease,
    transform 150ms ease,
    opacity 150ms ease;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.action-btn--quiet {
  border-color: rgba(147, 116, 62, 0.42);
  background: rgba(7, 7, 8, 0.36);
  color: rgba(222, 208, 183, 0.82);
}

.action-btn--quiet:hover:not(:disabled) {
  border-color: rgba(199, 159, 85, 0.72);
  background: rgba(34, 27, 19, 0.72);
}

.action-btn--secondary {
  min-width: 150px;
  flex: 0 0 auto;
  border-color: rgba(177, 139, 73, 0.6);
  background: rgba(47, 35, 20, 0.68);
  color: #e8d2a7;
}

.action-btn--secondary:hover:not(:disabled) {
  border-color: rgba(220, 179, 100, 0.9);
  background: rgba(69, 49, 24, 0.84);
  box-shadow: 0 0 14px rgba(159, 119, 48, 0.12);
}

.action-btn--primary {
  border-color: #bd9651;
  background: linear-gradient(180deg, #644a22, #3c2b16);
  color: #f5e5c4;
  box-shadow: inset 0 1px 0 rgba(255, 228, 168, 0.13);
}

.action-btn--primary:hover:not(:disabled) {
  border-color: #e0bd76;
  background: linear-gradient(180deg, #765828, #4c3519);
  box-shadow:
    inset 0 1px 0 rgba(255, 228, 168, 0.18),
    0 0 16px rgba(176, 129, 48, 0.16);
}

.opening-fullscreen-btn {
  position: fixed;
  z-index: 2;
  top: max(0.75rem, env(safe-area-inset-top));
  right: max(0.75rem, env(safe-area-inset-right));
  display: inline-flex;
  width: 2.35rem;
  height: 2.35rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(173, 136, 69, 0.52);
  border-radius: 4px;
  background: rgba(10, 9, 9, 0.72);
  color: #d4b36f;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.opening-fullscreen-btn:hover {
  border-color: rgba(224, 190, 118, 0.86);
  background: rgba(43, 32, 19, 0.88);
  color: #f0d69b;
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.step-fade-enter-from,
.step-fade-leave-to {
  transform: translateY(6px);
  opacity: 0;
}

@media (max-width: 1100px) {
  .archive-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .archive-panel {
    width: 58rem;
    transform: scale(1.4);
    transform-origin: top center;
  }

  .opening-fullscreen-btn {
    transform: scale(1.4);
    transform-origin: top right;
  }
}

@media (max-width: 900px) {
  .archive-content {
    grid-template-columns: minmax(0, 1fr);
  }

  .archive-rail {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 1rem;
    border-right: 0;
    border-bottom: 1px solid rgba(167, 126, 60, 0.32);
    padding: 1.2rem 1.5rem;
  }

  .chapter-panel {
    min-height: 0;
  }

  .preview-panel {
    margin-top: 0;
  }

  .preview-groups {
    max-height: 280px;
  }

  .archive-form-area {
    padding: 1.5rem 1.75rem 1.75rem;
  }

  .step-content {
    min-height: 330px;
  }
}

@media (max-width: 620px) {
  .opening-entry-shell {
    padding-top: max(3.75rem, calc(env(safe-area-inset-top) + 0.8rem));
    padding-right: max(0.55rem, env(safe-area-inset-right));
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    padding-left: max(0.55rem, env(safe-area-inset-left));
  }

  .archive-panel {
    border-radius: 4px;
  }

  .archive-panel__frame {
    inset: 5px;
  }

  .archive-header {
    gap: 1rem;
    padding: 1.25rem 1rem 1rem;
  }

  .archive-title {
    font-size: 1.75rem;
  }

  .archive-description {
    margin-top: 0.6rem;
    font-size: 0.92rem;
    line-height: 1.65;
  }

  .stepper {
    gap: 0.35rem;
  }

  .step-chip {
    min-height: 72px;
    flex-direction: column;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.48rem 0.28rem;
    text-align: center;
  }

  .step-chip__index {
    width: 1.5rem;
    height: 1.5rem;
    flex-basis: 1.5rem;
  }

  .step-chip__title {
    font-size: 0.8rem;
  }

  .step-chip__status {
    display: none;
  }

  .archive-rail {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
    padding: 0.85rem 0.8rem;
  }

  .chapter-panel {
    padding: 0.85rem;
  }

  .chapter-seal {
    float: right;
    margin-top: 0.55rem;
  }

  .chapter-title {
    font-size: 1.35rem;
  }

  .chapter-description {
    max-width: 38rem;
    margin-top: 0.45rem;
  }

  .chapter-rule,
  .chapter-note {
    display: none;
  }

  .preview-panel {
    padding: 0.8rem 0.85rem 0.65rem;
  }

  .preview-groups {
    max-height: 240px;
  }

  .archive-form-area {
    padding: 1.25rem 1rem 1.35rem;
  }

  .form-label {
    font-size: 0.95rem;
  }

  .form-control {
    min-height: 54px;
    font-size: 1rem;
  }

  .form-stage-heading {
    margin-bottom: 1.1rem;
  }

  .step-content {
    min-height: 0;
  }

  .form-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.95rem;
  }

  .field--wide {
    grid-column: auto;
  }

  .draft-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .action-btn--secondary {
    width: 100%;
  }

  .story-textarea,
  textarea.form-control {
    min-height: 300px;
  }

  .archive-footer {
    align-items: stretch;
    flex-direction: column;
    gap: 0.8rem;
    padding: 0.9rem 1rem 1rem;
  }

  .footer-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.55rem;
  }

  .action-btn {
    min-width: 0;
    padding: 0.7rem 0.55rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 370px) {
  .footer-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .footer-actions .action-btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
