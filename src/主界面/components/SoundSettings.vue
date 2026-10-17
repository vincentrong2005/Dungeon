<template>
  <div class="feedback-settings" :class="{ 'feedback-settings--compact': compact }" data-ui-sound="none">
    <template v-if="includeMusic">
      <label class="feedback-settings__row feedback-settings__row--track">
        <span class="feedback-settings__label"><Music2 aria-hidden="true" />背景音乐</span>
        <select v-model="selectedTrack" aria-label="背景音乐" :disabled="bgmTracks.length === 0">
          <option v-if="bgmTracks.length === 0" value="">暂无可用曲目</option>
          <option v-for="track in bgmTracks" :key="track.id" :value="track.id">{{ track.name }}</option>
        </select>
      </label>
      <label class="feedback-settings__row feedback-settings__row--slider">
        <span class="feedback-settings__label"><AudioLines aria-hidden="true" />音乐音量</span>
        <span class="feedback-settings__slider">
          <input v-model.number="musicPercent" :style="{ '--range-progress': `${musicPercent}%` }" aria-label="音乐音量" type="range" min="0" max="100" step="1" />
          <output>{{ musicPercent }}<span>%</span></output>
        </span>
      </label>
    </template>
    <label class="feedback-settings__row feedback-settings__row--slider" :class="{ 'is-muted': sfxMuted }">
      <span class="feedback-settings__label"><Volume2 aria-hidden="true" />音效音量</span>
      <span class="feedback-settings__slider">
        <input v-model.number="volumePercent" :style="{ '--range-progress': `${volumePercent}%` }" aria-label="音效音量" type="range" min="0" max="100" step="1" />
        <output>{{ volumePercent }}<span>%</span></output>
      </span>
    </label>
    <label class="feedback-settings__row">
      <span class="feedback-settings__label"><VolumeX aria-hidden="true" />静音音效</span>
      <input class="feedback-settings__switch" :checked="sfxMuted" type="checkbox" role="switch" aria-label="静音音效" @change="setSfxMuted(($event.target as HTMLInputElement).checked)" />
    </label>
    <label class="feedback-settings__row">
      <span class="feedback-settings__label"><Sparkles aria-hidden="true" />战斗特效</span>
      <input class="feedback-settings__switch" :checked="battleEffectsEnabled" type="checkbox" role="switch" aria-label="战斗特效" @change="setBattleEffectsEnabled(($event.target as HTMLInputElement).checked)" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AudioLines, Music2, Sparkles, Volume2, VolumeX } from 'lucide-vue-next';
import { bgmTrackId, bgmTracks, bgmVolume, setBgmTrack, setBgmVolume } from '../bgm';
import { battleEffectsEnabled, setBattleEffectsEnabled, setSfxMuted, setSfxVolume, sfxMuted, sfxVolume } from '../sfx';

defineProps<{ includeMusic?: boolean; compact?: boolean }>();

const selectedTrack = computed({ get: () => bgmTrackId.value, set: value => setBgmTrack(value) });
const musicPercent = computed({ get: () => Math.round(bgmVolume.value * 100), set: value => setBgmVolume(value / 100) });
const volumePercent = computed({ get: () => Math.round(sfxVolume.value * 100), set: value => setSfxVolume(value / 100) });
</script>

<style scoped>
.feedback-settings { container-type: inline-size; color: #d8dcdb; font: 14px/1.5 'Inter', 'Microsoft YaHei', sans-serif; letter-spacing: 0; }
.feedback-settings__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 290px); align-items: center; gap: 24px; min-height: 60px; padding: 14px 0; border-bottom: 1px solid #ffffff0c; }
.feedback-settings__row:last-child { border-bottom: 0; }
.feedback-settings__label { display: flex; align-items: center; gap: 12px; min-width: 0; }
.feedback-settings__label svg { width: 17px; height: 17px; flex-shrink: 0; color: #939c99; stroke-width: 1.6; }
.feedback-settings select { width: 100%; min-width: 0; height: 36px; padding: 0 10px; border: 1px solid #414644; border-radius: 5px; background: #1c2121; color: #e1e5e2; font: inherit; color-scheme: dark; }
.feedback-settings__slider { display: grid; grid-template-columns: minmax(0, 1fr) 46px; align-items: center; gap: 16px; }
.feedback-settings input[type='range'] { appearance: none; width: 100%; min-width: 0; height: 4px; border: 0; border-radius: 2px; background: linear-gradient(to right, #c6ae76 var(--range-progress), #3b4241 var(--range-progress)); cursor: pointer; }
.feedback-settings input[type='range']::-webkit-slider-thumb { appearance: none; width: 13px; height: 13px; border: 2px solid #e3d4ae; border-radius: 50%; background: #c6ae76; box-shadow: 0 0 0 4px #c6ae7610; }
.feedback-settings input[type='range']::-moz-range-thumb { width: 10px; height: 10px; border: 2px solid #e3d4ae; border-radius: 50%; background: #c6ae76; }
.feedback-settings output { color: #ede5d2; font-size: 13px; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.feedback-settings output span { margin-left: 3px; color: #808b86; font-size: 11px; }
.feedback-settings__switch { appearance: none; position: relative; justify-self: end; width: 40px; height: 22px; margin: 0; border: 1px solid #505956; border-radius: 12px; background: #2b3331; cursor: pointer; transition: background 160ms, border-color 160ms; }
.feedback-settings__switch::after { content: ''; position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #8c9892; transition: transform 160ms, background 160ms; }
.feedback-settings__switch:checked { border-color: #8eae99; background: #335341; }
.feedback-settings__switch:checked::after { transform: translateX(18px); background: #c5e1cc; }
.feedback-settings :is(select, input):focus-visible { outline: 2px solid #c6ae76; outline-offset: 5px; }
.feedback-settings select:disabled { opacity: 0.45; cursor: not-allowed; }
.is-muted .feedback-settings__slider { opacity: 0.4; }
.feedback-settings--compact { font-size: 12px; }
.feedback-settings--compact .feedback-settings__row { min-height: 44px; padding: 10px 0; gap: 12px; grid-template-columns: minmax(0, 1fr) auto; }
.feedback-settings--compact .feedback-settings__row--slider { grid-template-columns: minmax(0, 1fr); gap: 12px; padding-bottom: 16px; }
.feedback-settings--compact .feedback-settings__label { gap: 8px; }
.feedback-settings--compact .feedback-settings__label svg { width: 15px; height: 15px; }
@container (max-width: 420px) {
  .feedback-settings__row { gap: 12px; grid-template-columns: minmax(0, 1fr) auto; }
  .feedback-settings__row--slider, .feedback-settings__row--track { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .feedback-settings__switch, .feedback-settings__switch::after { transition: none; }
}
</style>
