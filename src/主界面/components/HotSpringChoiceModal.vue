<template>
  <div class="absolute inset-0 z-103 bg-black/85">
    <div class="absolute inset-0 flex items-center justify-center p-4">
      <div class="dg-skin-panel spring-panel w-full max-w-3xl">
        <div class="mb-3 text-center">
          <div class="dg-skin-title">温泉</div>
          <span class="dg-skin-divider" aria-hidden="true"></span>
          <div class="dg-skin-hint mt-1">泉水的力量有限，只能为你做一件事。</div>
        </div>

        <div class="grid grid-cols-1 gap-3" :class="purifiableCurses.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'">
          <button type="button" class="spring-option" :disabled="busy" @click="emit('heal')">
            <div class="font-heading text-base text-emerald-200">浸泡疗伤</div>
            <div class="mt-1 text-sm text-dungeon-paper/80">恢复至满血</div>
            <div class="mt-1 text-xs text-dungeon-paper/55">生命 {{ hp }} / {{ maxHp }}{{ hp >= maxHp ? '（已满）' : '' }}</div>
          </button>

          <button
            type="button"
            class="spring-option"
            :class="{ 'spring-option--active': mode === 'cleanse' }"
            :disabled="busy || cleansableStatuses.length === 0"
            @click="mode = mode === 'cleanse' ? 'none' : 'cleanse'"
          >
            <div class="font-heading text-base text-sky-200">洗去污秽</div>
            <div class="mt-1 text-sm text-dungeon-paper/80">净化一个负面状态</div>
            <div class="mt-1 text-xs text-dungeon-paper/55">
              {{ cleansableStatuses.length > 0 ? `可净化 ${cleansableStatuses.length} 个` : '没有可净化的负面状态' }}
            </div>
          </button>

          <button
            v-if="purifiableCurses.length > 0"
            type="button"
            class="spring-option"
            :class="{ 'spring-option--active': mode === 'purify' }"
            :disabled="busy"
            @click="mode = mode === 'purify' ? 'none' : 'purify'"
          >
            <div class="font-heading text-base text-fuchsia-200">净化诅咒</div>
            <div class="mt-1 text-sm text-dungeon-paper/80">净化一张诅咒牌</div>
            <div class="mt-1 text-xs text-dungeon-paper/55">诅咒先化为【愧疚】，愧疚再净化化为【空白】</div>
          </button>
        </div>

        <div v-if="mode === 'purify'" class="mt-4 flex flex-col gap-2">
          <div class="text-xs text-fuchsia-100/70">选择要净化的诅咒牌：</div>
          <button
            v-for="entry in purifiableCurses"
            :key="entry.from"
            type="button"
            class="spring-status"
            :disabled="busy"
            @click="emit('purify', entry.from)"
          >
            <span class="font-semibold text-fuchsia-200"
              >【{{ entry.from }}】<template v-if="entry.count && entry.count > 1"> ×{{ entry.count }}</template></span
            >
            <span class="text-xs text-sky-200/80">净化后会化为【{{ entry.to }}】</span>
          </button>
        </div>

        <div v-if="mode === 'cleanse'" class="mt-4 flex flex-col gap-2">
          <div class="text-xs text-sky-100/70">选择要净化的负面状态：</div>
          <button
            v-for="entry in cleansableStatuses"
            :key="entry.raw"
            type="button"
            class="spring-status"
            :disabled="busy"
            @click="emit('cleanse', entry.raw)"
          >
            <span class="font-semibold text-fuchsia-200">{{ entry.raw }}</span>
            <span class="text-xs text-dungeon-paper/70">{{ entry.description }}</span>
            <span v-if="entry.degradeTo" class="text-xs text-sky-200/80">净化后会退化为 {{ entry.degradeTo }}</span>
          </button>
        </div>

        <div class="mt-5 flex justify-end">
          <button type="button" class="dg-skin-btn-ghost" :disabled="busy" @click="emit('close')">暂不使用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hp: number;
  maxHp: number;
  cleansableStatuses: Array<{ raw: string; description: string; degradeTo?: string }>;
  purifiableCurses: Array<{ from: string; to: string; count?: number }>;
  busy?: boolean;
}>();

const emit = defineEmits<{
  heal: [];
  cleanse: [raw: string];
  purify: [curseName: string];
  close: [];
}>();

const mode = ref<'none' | 'cleanse' | 'purify'>('none');
</script>

<style scoped>
.spring-panel {
  padding: 0.4rem 0.8rem 0.6rem;
}

.spring-option {
  padding: 14px;
  border: 1px solid rgba(125, 211, 252, 0.3);
  border-radius: 8px;
  background: rgba(15, 30, 40, 0.6);
  text-align: left;
  transition: border-color 0.2s, transform 0.2s;
}

.spring-option:hover:not(:disabled) {
  border-color: rgba(186, 230, 253, 0.7);
  transform: translateY(-2px);
}

.spring-option:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.spring-option--active {
  border-color: rgba(186, 230, 253, 0.85);
}

.spring-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid rgba(125, 211, 252, 0.25);
  border-radius: 4px;
  background: rgba(15, 30, 40, 0.55);
  text-align: left;
}

.spring-status:hover:not(:disabled) {
  border-color: rgba(186, 230, 253, 0.7);
}

.spring-cancel {
  padding: 6px 18px;
  border: 1px solid rgba(120, 140, 160, 0.6);
  border-radius: 3px;
  color: rgba(226, 232, 240, 0.75);
}
</style>
