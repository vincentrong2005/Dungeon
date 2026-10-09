<!-- eslint-disable better-tailwindcss/no-unknown-classes, better-tailwindcss/enforce-canonical-classes -->
<template>
  <DungeonModal
    title="新手教程"
    :is-open="isOpen"
    panel-class="tutorial-guide-modal !max-w-[min(94vw,980px)]"
    @close="emit('close')"
  >
    <div class="tutorial-guide-root">
      <div class="tutorial-guide-intro">
        <div>
          <div class="tutorial-guide-kicker"><BookOpen class="size-4" /> 战斗入门</div>
          <h2>先看意图，再看骰子，最后出牌</h2>
          <p>四个章节读完后，可以进入独立的训练战熟悉实际操作。</p>
        </div>
        <div class="tutorial-guide-dummy-mark" aria-hidden="true"><Swords class="size-7" /></div>
      </div>

      <nav class="tutorial-guide-tabs" aria-label="教程章节">
        <button
          v-for="entry in chapters"
          :key="entry.id"
          type="button"
          class="tutorial-guide-tab"
          :class="{ 'tutorial-guide-tab--active': chapter === entry.id }"
          @click="chapter = entry.id"
        >
          <span>{{ entry.label }}</span>
          <small>{{ entry.short }}</small>
        </button>
      </nav>

      <section v-if="chapter === 1" class="tutorial-guide-section">
        <div class="tutorial-guide-section-heading">
          <span class="tutorial-guide-section-number">01</span>
          <div>
            <h3>战场分布与界面认知</h3>
            <p>把每个区域看熟，战斗时就不会错过关键信息。</p>
          </div>
        </div>

        <div class="tutorial-guide-layout-map" aria-label="战场布局示意">
          <div class="tutorial-guide-map-side tutorial-guide-map-side--player">
            <strong>左侧：玩家</strong>
            <span>HP · MP · 护甲</span>
            <span>骰子范围与状态</span>
          </div>
          <div class="tutorial-guide-map-center">
            <span>上方：敌方意图</span>
            <b>🎲 玩家骰子 VS 敌人骰子 🎲</b>
            <span>底部中央：每回合 3 张手牌</span>
          </div>
          <div class="tutorial-guide-map-side tutorial-guide-map-side--enemy">
            <strong>右侧：训练人偶</strong>
            <span>HP · MP</span>
            <span>骰子范围与状态</span>
          </div>
        </div>

        <div class="tutorial-guide-grid">
          <article>
            <h4>手牌区</h4>
            <p>每回合抽取 3 张牌，每回合只能选择 1 张手牌打出。</p>
          </article>
          <article>
            <h4>左下角</h4>
            <p>这里是主动技能和“跳过回合”。主动技能独立于手牌。</p>
          </article>
          <article>
            <h4>右上角</h4>
            <p>可以查看退出战斗、战斗日志、牌库与弃牌堆。</p>
          </article>
          <article>
            <h4>胜负条件</h4>
            <p>敌方 HP 归零即胜利；玩家 HP 归零则战斗失败。</p>
          </article>
        </div>
      </section>

      <section v-else-if="chapter === 2" class="tutorial-guide-section">
        <div class="tutorial-guide-section-heading">
          <span class="tutorial-guide-section-number">02</span>
          <div>
            <h3>核心博弈：骰子与拼点</h3>
            <p>骰子提供基础点数，卡牌与状态会共同决定最终点数。</p>
          </div>
        </div>

        <div class="tutorial-guide-callout tutorial-guide-callout--gold">
          <strong>普通拼点</strong>
          <span>同类攻击牌比较最终点数，点数更高的一方获胜；点数相同则双方都不造成伤害。</span>
        </div>
        <div class="tutorial-guide-grid tutorial-guide-grid--three">
          <article>
            <h4>⚔️ 攻击对攻击</h4>
            <p>红色攻击牌互相拼点，胜者攻击败者。</p>
          </article>
          <article>
            <h4>🔮 法术对法术</h4>
            <p>蓝色法术牌互相拼点，规则与攻击牌相同。</p>
          </article>
          <article>
            <h4>🟢 闪避对攻击</h4>
            <p>闪避点数小于攻击点数时，闪避成功并规避攻击。</p>
          </article>
        </div>
        <div class="tutorial-guide-callout tutorial-guide-callout--blue">
          <strong>法术优先</strong>
          <span>法术牌面对物理攻击牌时不参与拼点，法术牌优先攻击；若双方都存活，物理牌再按结算顺序处理。</span>
        </div>
        <div class="tutorial-guide-callout tutorial-guide-callout--red">
          <strong>重掷骰子</strong>
          <span>上一回合拼点失败后会获得重掷次数。进入可操作阶段后点击玩家骰子即可使用，次数有限。</span>
        </div>
      </section>

      <section v-else-if="chapter === 3" class="tutorial-guide-section">
        <div class="tutorial-guide-section-heading">
          <span class="tutorial-guide-section-number">03</span>
          <div>
            <h3>四色卡牌与克制关系</h3>
            <p>颜色决定卡牌的行动方式，也决定你应该如何应对敌方意图。</p>
          </div>
        </div>

        <div class="tutorial-guide-card-table">
          <div class="tutorial-guide-card-row tutorial-guide-card-row--head">
            <span>颜色</span><span>类型</span><span>规则</span><span>适合时机</span>
          </div>
          <div class="tutorial-guide-card-row tutorial-guide-card-row--physical">
            <b>红色</b><strong>攻击牌 ⚔️</strong><span>物理攻击，同类牌拼点。</span><span>想稳定输出时。</span>
          </div>
          <div class="tutorial-guide-card-row tutorial-guide-card-row--magic">
            <b>蓝色</b><strong>法术牌 🔮</strong><span>消耗 MP；对物理牌不拼点且优先行动。</span><span>需要抢先行动时。</span>
          </div>
          <div class="tutorial-guide-card-row tutorial-guide-card-row--dodge">
            <b>绿色</b><strong>闪避牌 🟢</strong><span>点数小于攻击方时闪避成功。</span><span>敌方准备攻击时。</span>
          </div>
          <div class="tutorial-guide-card-row tutorial-guide-card-row--function">
            <b>黄色</b><strong>功能牌 🛡️</strong><span>不参与普通拼点，行动优先级最高。</span><span>叠护甲或准备资源时。</span>
          </div>
        </div>

        <div class="tutorial-guide-matchups">
          <div><b>红色 vs 红色</b><span>比较大小，平局双方无伤。</span></div>
          <div><b>蓝色 vs 蓝色</b><span>比较大小，平局双方无伤。</span></div>
          <div><b>绿色 vs 红/蓝</b><span>闪避点数更低才成功。</span></div>
          <div><b>黄色 vs 任意类型</b><span>不参与普通拼点，优先执行效果；双方都用黄色牌时，玩家先行动。</span></div>
        </div>
      </section>

      <section v-else class="tutorial-guide-section">
        <div class="tutorial-guide-section-heading">
          <span class="tutorial-guide-section-number">04</span>
          <div>
            <h3>高级作战技巧</h3>
            <p>资源管理和回合节奏，决定你能不能把优势保持到最后。</p>
          </div>
        </div>

        <div class="tutorial-guide-grid tutorial-guide-grid--two">
          <article>
            <h4>主动技能</h4>
            <p>主动技能位于左下角，不占用手牌出牌次数。训练中可以使用“重来！”重掷自己的骰子，也可以使用“你也重来！”重掷敌人的骰子。注意 MP 和 CD。</p>
          </article>
          <article>
            <h4>护甲衰减</h4>
            <p>护甲可以抵挡物理和法术伤害，但回合结束会自动减半。它无法抵挡真实伤害。</p>
          </article>
          <article>
            <h4>真实伤害</h4>
            <p>真实伤害无视护甲，不受普通增伤或减伤影响，直接扣除生命值。</p>
          </article>
          <article>
            <h4>MP 管理</h4>
            <p>蓝色法术牌和部分主动技能都需要 MP。不要为了当前回合的伤害把后续回合的法力全部用光。</p>
          </article>
        </div>

        <div class="tutorial-guide-checklist">
          <strong>每回合检查</strong>
          <span>敌方意图 → HP 与护甲 → MP → 手牌类型 → 是否重掷 → 选择卡牌或跳过回合</span>
        </div>
      </section>

      <div class="tutorial-guide-footer">
        <button type="button" class="tutorial-guide-nav-button" :disabled="chapter === 1" @click="chapter -= 1">
          <ChevronLeft class="size-4" /> 上一章
        </button>
        <span>第 {{ chapter }} / {{ chapters.length }} 章</span>
        <button
          v-if="chapter < chapters.length"
          type="button"
          class="tutorial-guide-nav-button"
          @click="chapter += 1"
        >
          下一章 <ChevronRight class="size-4" />
        </button>
        <button v-else type="button" class="tutorial-guide-start-button" @click="emit('startTraining')">
          <Swords class="size-4" /> 进入训练战
        </button>
      </div>
    </div>
  </DungeonModal>
</template>

<script setup lang="ts">
import { BookOpen, ChevronLeft, ChevronRight, Swords } from 'lucide-vue-next';
import DungeonModal from './DungeonModal.vue';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: []; startTraining: [] }>();

const chapters = [
  { id: 1, label: '第一章', short: '界面' },
  { id: 2, label: '第二章', short: '拼点' },
  { id: 3, label: '第三章', short: '卡牌' },
  { id: 4, label: '第四章', short: '技巧' },
] as const;
const chapter = ref(1);

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) chapter.value = 1;
});
</script>

<style scoped>
.tutorial-guide-root { display: flex; flex-direction: column; gap: 1rem; }
.tutorial-guide-intro { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; border: 1px solid rgba(245, 158, 11, 0.25); background: rgba(42, 25, 15, 0.75); }
.tutorial-guide-kicker { display: flex; align-items: center; gap: 0.4rem; color: #f6c86e; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; }
.tutorial-guide-intro h2 { margin: 0.35rem 0 0; color: #fff1c8; font-family: Georgia, serif; font-size: clamp(1.2rem, 2.5vw, 1.75rem); }
.tutorial-guide-intro p { margin: 0.35rem 0 0; color: rgba(255, 244, 214, 0.68); font-size: 0.78rem; }
.tutorial-guide-dummy-mark { display: grid; width: 3.5rem; aspect-ratio: 1; place-items: center; border: 1px solid rgba(245, 158, 11, 0.38); color: #f6c86e; background: rgba(0, 0, 0, 0.25); }
.tutorial-guide-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.45rem; }
.tutorial-guide-tab { display: flex; min-height: 3.2rem; flex-direction: column; align-items: flex-start; justify-content: center; gap: 0.2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); padding: 0.5rem 0.65rem; color: rgba(255, 244, 214, 0.68); text-align: left; transition: border-color 160ms ease, background 160ms ease, color 160ms ease; }
.tutorial-guide-tab:hover, .tutorial-guide-tab--active { border-color: rgba(245, 158, 11, 0.62); background: rgba(120, 67, 22, 0.34); color: #ffe4a3; }
.tutorial-guide-tab small { color: rgba(255,255,255,0.44); font-size: 0.66rem; }
.tutorial-guide-section { display: flex; flex-direction: column; gap: 1rem; }
.tutorial-guide-section-heading { display: flex; gap: 0.75rem; align-items: flex-start; }
.tutorial-guide-section-number { color: #eeb85e; font-family: Georgia, serif; font-size: 1.35rem; font-weight: 700; }
.tutorial-guide-section-heading h3 { margin: 0; color: #ffefc4; font-family: Georgia, serif; font-size: 1.2rem; }
.tutorial-guide-section-heading p { margin: 0.25rem 0 0; color: rgba(255,244,214,0.62); font-size: 0.78rem; }
.tutorial-guide-layout-map { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 0.6rem; align-items: stretch; }
.tutorial-guide-map-side, .tutorial-guide-map-center { display: flex; min-height: 7.5rem; flex-direction: column; justify-content: center; gap: 0.45rem; border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; background: rgba(0,0,0,0.2); font-size: 0.74rem; }
.tutorial-guide-map-side strong { color: #ffdb8a; }
.tutorial-guide-map-side span, .tutorial-guide-map-center span { color: rgba(255,244,214,0.62); }
.tutorial-guide-map-center { align-items: center; text-align: center; border-color: rgba(245,158,11,0.32); background: rgba(77, 44, 19, 0.28); }
.tutorial-guide-map-center b { color: #f5d48b; font-size: 0.78rem; }
.tutorial-guide-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.6rem; }
.tutorial-guide-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.tutorial-guide-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.tutorial-guide-grid article { border: 1px solid rgba(255,255,255,0.09); background: rgba(0,0,0,0.18); padding: 0.75rem; }
.tutorial-guide-grid h4 { margin: 0 0 0.35rem; color: #f7d17e; font-size: 0.82rem; }
.tutorial-guide-grid p { margin: 0; color: rgba(255,244,214,0.67); font-size: 0.74rem; line-height: 1.65; }
.tutorial-guide-callout { display: flex; gap: 0.75rem; align-items: baseline; border-left: 3px solid #d89a35; background: rgba(0,0,0,0.22); padding: 0.75rem 0.9rem; font-size: 0.78rem; line-height: 1.6; }
.tutorial-guide-callout strong { flex: 0 0 auto; color: #ffe4a3; }
.tutorial-guide-callout span { color: rgba(255,244,214,0.72); }
.tutorial-guide-callout--blue { border-left-color: #4d9ee8; }
.tutorial-guide-callout--red { border-left-color: #e25555; }
.tutorial-guide-card-table { overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
.tutorial-guide-card-row { display: grid; grid-template-columns: 0.6fr 1.1fr 2.2fr 1.3fr; gap: 0.6rem; align-items: center; padding: 0.65rem 0.75rem; border-top: 1px solid rgba(255,255,255,0.07); color: rgba(255,244,214,0.7); font-size: 0.72rem; line-height: 1.45; }
.tutorial-guide-card-row:first-child { border-top: 0; }
.tutorial-guide-card-row--head { color: rgba(255,244,214,0.42); background: rgba(0,0,0,0.25); font-size: 0.65rem; }
.tutorial-guide-card-row--physical { border-left: 3px solid #e35b5b; }
.tutorial-guide-card-row--magic { border-left: 3px solid #579eea; }
.tutorial-guide-card-row--dodge { border-left: 3px solid #54b987; }
.tutorial-guide-card-row--function { border-left: 3px solid #e6ba55; }
.tutorial-guide-card-row b, .tutorial-guide-card-row strong { color: #ffe7aa; }
.tutorial-guide-matchups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
.tutorial-guide-matchups div { display: flex; flex-direction: column; gap: 0.2rem; border: 1px solid rgba(255,255,255,0.09); padding: 0.65rem 0.75rem; background: rgba(0,0,0,0.18); font-size: 0.73rem; }
.tutorial-guide-matchups b { color: #f5d48b; }
.tutorial-guide-matchups span { color: rgba(255,244,214,0.62); }
.tutorial-guide-checklist { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: baseline; border: 1px solid rgba(245,158,11,0.25); background: rgba(77,44,19,0.25); padding: 0.75rem 0.9rem; font-size: 0.76rem; }
.tutorial-guide-checklist strong { color: #ffe4a3; }
.tutorial-guide-checklist span { color: rgba(255,244,214,0.72); }
.tutorial-guide-footer { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding-top: 0.35rem; color: rgba(255,244,214,0.5); font-size: 0.72rem; }
.tutorial-guide-nav-button, .tutorial-guide-start-button { display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid rgba(245,158,11,0.32); padding: 0.5rem 0.75rem; color: #f9d98f; background: rgba(77,44,19,0.25); font-size: 0.74rem; transition: border-color 160ms ease, background 160ms ease, opacity 160ms ease; }
.tutorial-guide-nav-button:hover:not(:disabled), .tutorial-guide-start-button:hover { border-color: rgba(245,158,11,0.7); background: rgba(120,67,22,0.42); }
.tutorial-guide-nav-button:disabled { cursor: not-allowed; opacity: 0.35; }
.tutorial-guide-start-button { border-color: rgba(52,211,153,0.45); color: #a7f3d0; background: rgba(6,78,59,0.28); }
@media (max-width: 760px) {
  .tutorial-guide-tabs, .tutorial-guide-layout-map, .tutorial-guide-grid, .tutorial-guide-grid--three, .tutorial-guide-grid--two { grid-template-columns: 1fr; }
  .tutorial-guide-map-side, .tutorial-guide-map-center { min-height: auto; }
  .tutorial-guide-card-row { grid-template-columns: 0.65fr 1fr; }
  .tutorial-guide-card-row span:nth-child(3), .tutorial-guide-card-row span:nth-child(4) { grid-column: 2; }
  .tutorial-guide-card-row--head { display: none; }
  .tutorial-guide-matchups { grid-template-columns: 1fr; }
  .tutorial-guide-callout { flex-direction: column; gap: 0.25rem; }
  .tutorial-guide-footer { flex-wrap: wrap; }
}
</style>
