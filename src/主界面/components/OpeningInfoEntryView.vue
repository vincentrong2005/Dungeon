<template>
  <div class="opening-entry-root absolute inset-0 z-[140] overflow-y-auto overflow-x-hidden overscroll-contain">
    <div
      v-if="backgroundUrl"
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url('${backgroundUrl}')` }"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(78,52,28,0.24),rgba(0,0,0,0.88)_78%)]"
    ></div>
    <div class="absolute inset-0 bg-black/45 backdrop-blur-[3px]"></div>

    <button type="button" class="opening-fullscreen-btn" aria-label="切换全屏" @click="toggleFullScreen">
      <Maximize class="size-4" />
    </button>

    <div
      class="opening-entry-shell relative z-[1] mx-auto flex min-h-full w-full max-w-6xl items-start justify-center px-3 py-4 sm:px-4 md:items-center md:px-8 md:py-10"
    >
      <form
        class="w-full max-w-full overflow-visible rounded-[24px] border border-[#6d4a1a] bg-[linear-gradient(180deg,rgba(27,18,12,0.92),rgba(10,7,5,0.94))] shadow-[0_28px_90px_rgba(0,0,0,0.55)] md:overflow-hidden md:rounded-[30px]"
        @submit.prevent="handleSubmit"
      >
        <div class="border-b border-[#6d4a1a]/65 px-4 py-5 sm:px-6 md:px-10 md:py-6">
          <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div class="max-w-3xl">
              <p class="text-xs uppercase tracking-[0.38em] text-amber-200/60">Abyssal Oath</p>
              <h2 class="mt-3 font-heading text-[1.9rem] tracking-[0.12em] text-[#f6deb0] md:text-4xl">开局信息录入</h2>
              <p class="mt-3 text-sm leading-7 text-[#d9c6aa]/84 md:text-base">
                在踏入欲望之神的地下城前，让世界记住 {{ previewName }} 的模样。
                三页记录会化作她的档案，并成为命运编织开场时最初的线索。
              </p>
            </div>

            <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                v-for="(stepInfo, index) in stepItems"
                :key="stepInfo.key"
                type="button"
                class="step-chip"
                :class="{
                  'step-chip--active': currentStep === index,
                  'step-chip--done': currentStep > index,
                }"
                @click="jumpToStep(index)"
              >
                <span class="step-chip__index">0{{ index + 1 }}</span>
                <span class="step-chip__title">{{ stepInfo.title }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="grid md:min-h-[600px] md:grid-cols-[280px_minmax(0,1fr)]">
          <aside class="border-b border-[#6d4a1a]/35 bg-black/12 px-4 py-5 sm:px-6 md:border-b-0 md:border-r md:px-8 md:py-6">
            <div class="rounded-[24px] border border-[#6d4a1a]/35 bg-black/15 p-5">
              <p class="text-xs uppercase tracking-[0.35em] text-amber-200/45">Chapter {{ currentStep + 1 }}/3</p>
              <h3 class="mt-3 font-heading text-2xl tracking-[0.16em] text-[#f3d08f]">
                {{ currentStepInfo.title }}
              </h3>
              <p class="mt-3 text-sm leading-7 text-[#d7c4a7]/78">
                {{ currentStepInfo.description }}
              </p>
            </div>

            <div class="mt-5 rounded-[24px] border border-[#6d4a1a]/35 bg-[rgba(16,10,7,0.55)] p-5">
              <p class="text-xs uppercase tracking-[0.32em] text-amber-200/42">镜中映像</p>
              <div class="mt-4 space-y-3 text-sm text-[#ead8bb]/82">
                <p><span class="preview-label">姓名</span>{{ previewName }}</p>
                <p><span class="preview-label">种族</span>{{ resolvedRace || '待填写' }}</p>
                <p><span class="preview-label">年龄</span>{{ ageInput || '待填写' }}</p>
                <p><span class="preview-label">天赋</span>{{ talent.trim() || '未填写' }}</p>
                <p><span class="preview-label">外貌</span>{{ appearance.trim() || '未填写' }}</p>
                <p><span class="preview-label">特征</span>{{ traits.trim() || '未填写' }}</p>
                <p><span class="preview-label">体型</span>{{ `${heightCm}cm / ${weightType}` }}</p>
                <p><span class="preview-label">敏感点</span>{{ sensitivePoints.trim() || '未填写' }}</p>
              </div>
            </div>
          </aside>

          <section class="px-4 py-5 sm:px-6 md:px-10 md:py-8">
            <Transition name="step-fade" mode="out-in">
              <div :key="currentStep" class="space-y-5">
                <template v-if="currentStep === 0">
                  <div class="form-grid">
                    <label class="block space-y-2">
                      <span class="form-label">种族</span>
                      <select v-model="selectedRace" class="form-control">
                        <option v-for="option in RACE_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label v-if="selectedRace === '自定义'" class="block space-y-2">
                      <span class="form-label">自定义种族</span>
                      <input
                        v-model="customRace"
                        type="text"
                        class="form-control"
                        maxlength="30"
                        placeholder="输入你的种族名"
                      />
                    </label>

                    <label class="block space-y-2">
                      <span class="form-label">姓名</span>
                      <input v-model="name" type="text" class="form-control" maxlength="30" placeholder="请输入姓名" />
                    </label>

                    <label class="block space-y-2">
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

                    <label class="block space-y-2">
                      <span class="form-label">贞操</span>
                      <select v-model="chastity" class="form-control">
                        <option v-for="option in CHASTITY_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="block space-y-2 md:col-span-2">
                      <span class="form-label">天赋</span>
                      <input
                        v-model="talent"
                        type="text"
                        class="form-control"
                        maxlength="80"
                        placeholder="可选，自定义填写"
                      />
                    </label>

                    <label class="block space-y-2 md:col-span-2">
                      <span class="form-label">外貌</span>
                      <input
                        v-model="appearance"
                        type="text"
                        class="form-control"
                        maxlength="120"
                        placeholder="可选，自定义填写"
                      />
                    </label>

                    <label class="block space-y-2 md:col-span-2">
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
                    <label class="block space-y-3 md:col-span-2">
                      <span class="form-label">身高</span>
                      <div class="rounded-[24px] border border-[#6d4a1a]/45 bg-black/18 px-5 py-5">
                        <div class="mb-3 flex items-center justify-between text-sm text-[#e6d3b7]">
                          <span>140cm</span>
                          <span class="text-lg font-semibold text-[#f8e2b6]">{{ heightCm }}cm</span>
                          <span>200cm</span>
                        </div>
                        <input
                          v-model="heightCm"
                          type="range"
                          min="140"
                          max="200"
                          class="h-2 w-full accent-[#d2a45c]"
                        />
                      </div>
                    </label>

                    <label class="block space-y-2">
                      <span class="form-label">体重</span>
                      <select v-model="weightType" class="form-control">
                        <option v-for="option in WEIGHT_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="block space-y-2">
                      <span class="form-label">胸围</span>
                      <select v-model="bust" class="form-control">
                        <option v-for="option in BUST_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="block space-y-2">
                      <span class="form-label">臀部</span>
                      <select v-model="hips" class="form-control">
                        <option v-for="option in HIP_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="block space-y-2">
                      <span class="form-label">小穴</span>
                      <select v-model="vagina" class="form-control">
                        <option v-for="option in VAGINA_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="block space-y-2">
                      <span class="form-label">屁穴</span>
                      <select v-model="anus" class="form-control">
                        <option v-for="option in ANUS_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      </select>
                    </label>

                    <label class="block space-y-2 md:col-span-2">
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
                  <div class="space-y-4">
                    <div
                      class="flex flex-col gap-3 rounded-[24px] border border-[#6d4a1a]/35 bg-black/12 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div class="space-y-1">
                        <p class="text-sm text-[#ead8bb]/88">
                          想先拿到一版可修改的草稿时，可以让世界按已填信息补完背景。
                        </p>
                        <p class="text-xs text-[#c9b59a]/70">
                          生成时只结合当前已填写信息生成草稿与背景作为提示词发送。
                        </p>
                      </div>
                      <button
                        type="button"
                        class="nav-btn nav-btn--secondary shrink-0"
                        :disabled="isBusy || !canGenerateBackstory"
                        @click="handleGenerateBackstory"
                      >
                        {{ backgroundDraftLoading ? '补完中...' : '根据已填信息生成背景' }}
                      </button>
                    </div>

                    <p v-if="backgroundDraftError" class="text-sm text-rose-300">{{ backgroundDraftError }}</p>

                    <label class="block space-y-2">
                      <span class="form-label">自定义背景故事</span>
                      <textarea
                        v-model="backstory"
                        class="form-control min-h-[240px] resize-y md:min-h-[320px]"
                        maxlength="4000"
                        placeholder="请尽量详细地描述她的来历、身份、性格、欲望、能力、过去经历、与地下城的关系等。越详细越好。"
                      ></textarea>
                    </label>
                  </div>
                </template>
              </div>
            </Transition>
          </section>
        </div>

        <div class="border-t border-[#6d4a1a]/60 bg-black/14 px-4 py-5 sm:px-6 md:px-10">
          <p v-if="currentStepMessage" class="text-sm text-rose-300">{{ currentStepMessage }}</p>
          <p v-else-if="error" class="text-sm text-rose-300">{{ error }}</p>
          <p v-else class="text-sm text-[#cbb89f]/75">
            当三页档案都铭刻完毕，命运便会以此为引，展开 {{ previewName }} 初次踏入地下城的序章。
          </p>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" class="nav-btn nav-btn--ghost" :disabled="isBusy" @click="handleBackAction">
              {{ currentStep === 0 ? '返回主菜单' : '返回上一页' }}
            </button>

            <div class="flex flex-col gap-3 sm:flex-row">
              <button
                v-if="currentStep < stepItems.length - 1"
                type="button"
                class="nav-btn nav-btn--primary"
                :disabled="isBusy || Boolean(currentStepMessage)"
                @click="goNext"
              >
                下一页
              </button>
              <button
                v-else
                type="submit"
                class="nav-btn nav-btn--primary"
                :disabled="isBusy || Boolean(validationMessage)"
              >
                {{ loading ? '命运编织中...' : '铭刻档案并进入地下城' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Maximize } from 'lucide-vue-next';
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
    description: '先留下她最初的名字与来历。当地牢第一次注视她时，首先看见的便是这些。 ',
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
  -webkit-overflow-scrolling: touch;
}

.opening-entry-shell {
  padding-top: max(4rem, calc(env(safe-area-inset-top) + 0.75rem));
  padding-right: max(0.75rem, env(safe-area-inset-right));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-left: max(0.75rem, env(safe-area-inset-left));
}

.form-grid {
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.form-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  letter-spacing: 0.12em;
  color: rgba(247, 226, 181, 0.9);
}

.form-control {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(117, 80, 28, 0.72);
  background: rgba(8, 6, 5, 0.38);
  padding: 0.9rem 1rem;
  font-size: 16px;
  color: #f3e2c8;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.form-control:focus {
  border-color: rgba(214, 171, 98, 0.92);
  box-shadow: 0 0 0 1px rgba(214, 171, 98, 0.35);
  background: rgba(12, 9, 7, 0.58);
}

.form-control::placeholder {
  color: rgba(199, 179, 153, 0.46);
}

.step-chip {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.35rem;
  border-radius: 1.1rem;
  border: 1px solid rgba(117, 80, 28, 0.4);
  background: rgba(0, 0, 0, 0.18);
  padding: 0.9rem 1rem;
  text-align: left;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.step-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(214, 171, 98, 0.5);
}

.step-chip--active {
  border-color: rgba(224, 181, 96, 0.9);
  background: rgba(112, 74, 27, 0.28);
  box-shadow: inset 0 0 0 1px rgba(224, 181, 96, 0.16);
}

.step-chip--done {
  border-color: rgba(126, 162, 94, 0.6);
  background: rgba(54, 78, 38, 0.22);
}

.step-chip__index {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  color: rgba(246, 221, 182, 0.56);
}

.step-chip__title {
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  color: #f2ddba;
  overflow-wrap: anywhere;
}

.preview-label {
  display: inline-block;
  min-width: 3.5rem;
  margin-right: 0.55rem;
  color: rgba(247, 226, 181, 0.6);
}

.nav-btn {
  display: inline-flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.85rem 1.6rem;
  font-family: var(--font-heading, inherit);
  font-size: 0.98rem;
  letter-spacing: 0.16em;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    filter 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.nav-btn:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.nav-btn--ghost {
  border: 1px solid rgba(117, 80, 28, 0.65);
  background: rgba(0, 0, 0, 0.15);
  color: #e8d3b5;
}

.nav-btn--primary {
  border: 1px solid #d0a259;
  background: linear-gradient(180deg, #4f3514, #2d1a0b);
  color: #f8e2b6;
}

.nav-btn--secondary {
  border: 1px solid rgba(173, 132, 71, 0.7);
  background: rgba(40, 24, 13, 0.7);
  color: #f4dfb7;
}

.opening-fullscreen-btn {
  position: absolute;
  top: max(0.75rem, env(safe-area-inset-top));
  right: max(0.75rem, env(safe-area-inset-right));
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(117, 80, 28, 0.5);
  background: rgba(15, 10, 8, 0.58);
  color: rgba(214, 175, 92, 0.9);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.opening-fullscreen-btn:hover {
  background: rgba(40, 23, 12, 0.82);
  border-color: rgba(214, 175, 92, 0.65);
  color: rgba(255, 227, 172, 0.96);
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.step-fade-enter-from,
.step-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (min-width: 640px) {
  .nav-btn {
    width: auto;
    min-width: 180px;
  }
}
</style>
