<template>
  <div class="ballot-body">
    <!-- Position tabs -->
    <div class="pos-tabs">
      <button
        v-for="(pw, i) in positionsWithCandidates"
        :key="pw.position._id"
        class="pos-tab"
        :class="{
          active:   i === currentIndex,
          selected: selections[pw.position._id],
        }"
        @click="$emit('changePosition', i)"
      >
        <span class="tab-num">{{ selections[pw.position._id] ? '✓' : (i + 1) + '.' }}</span>
        {{ pw.position.title }}
      </button>
    </div>

    <!-- Current position -->
    <transition name="slide" mode="out-in">
      <div :key="currentIndex" class="position-section">
        <div class="pos-header">
          <p class="pos-num">POSITION {{ currentIndex + 1 }} OF {{ positionsWithCandidates.length }}</p>
          <h2 class="pos-title">{{ current.position.title }}</h2>
          <p v-if="current.position.description" class="pos-desc">{{ current.position.description }}</p>
        </div>

        <div class="candidate-grid">
          <button
            v-for="c in current.candidates"
            :key="c._id"
            class="candidate-card"
            :class="{ selected: selections[current.position._id] === c._id }"
            @click="$emit('select', current.position._id, c._id)"
          >
            <div class="avatar">
              <img v-if="c.photoUrl" :src="c.photoUrl" alt="" class="avatar-photo" />
              <span v-else class="initials">{{ initials(c.fullName) }}</span>
            </div>
            <div class="cand-info">
              <h3 class="cand-name">{{ c.fullName }}</h3>
              <p class="cand-meta">{{ c.department }} · Year {{ c.yearLevel }}</p>
              <p v-if="c.platform" class="cand-platform">{{ c.platform }}</p>
            </div>
            <div class="check-circle" :class="{ checked: selections[current.position._id] === c._id }">
              <span v-if="selections[current.position._id] === c._id">✓</span>
            </div>
          </button>
        </div>

        <div class="nav-row">
          <button v-if="currentIndex > 0" class="nav-btn" @click="$emit('changePosition', currentIndex - 1)">← PREVIOUS</button>
          <div style="flex:1" />
          <button
            v-if="currentIndex < positionsWithCandidates.length - 1"
            class="nav-btn primary"
            @click="$emit('changePosition', currentIndex + 1)"
          >NEXT POSITION →</button>
          <button
            v-else
            class="nav-btn primary"
            :disabled="!allSelected"
            :style="{ opacity: allSelected ? 1 : 0.4 }"
            @click="allSelected && $emit('review')"
          >REVIEW BALLOT →</button>
        </div>

        <p v-if="!allSelected && currentIndex === positionsWithCandidates.length - 1" class="incomplete-note">
          ○ Please select a candidate for all positions before reviewing.
        </p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  positionsWithCandidates: Array,
  selections: Object,
  currentIndex: Number,
})
defineEmits(['select', 'changePosition', 'review'])

const current    = computed(() => props.positionsWithCandidates[props.currentIndex] || {})
const allSelected= computed(() => props.positionsWithCandidates.every(pw => props.selections[pw.position._id]))

function initials(name) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }
</script>

<style scoped>
.ballot-body { display: flex; flex-direction: column; gap: 28px; }

.pos-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.pos-tab {
  background: transparent; border: 1px solid rgba(196,169,106,0.1);
  color: var(--stone); padding: 8px 16px;
  font-family: var(--font-body); font-size: 0.9rem;
  cursor: pointer; transition: all 0.2s;
}
.pos-tab.active   { background: rgba(196,169,106,0.12); border-color: rgba(196,169,106,0.4); color: var(--gold); }
.pos-tab.selected { border-color: rgba(42,138,90,0.5); color: var(--success); }
.tab-num          { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; margin-right: 4px; }

.position-section { display: flex; flex-direction: column; gap: 24px; }
.pos-header { display: flex; flex-direction: column; gap: 6px; }
.pos-num    { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--gold); opacity: 0.5; }
.pos-title  { font-family: var(--font-display); font-size: 2rem; color: var(--cream); }
.pos-desc   { font-family: var(--font-body); color: var(--mist); font-size: 1rem; }

.candidate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.candidate-card {
  display: flex; align-items: flex-start; gap: 14px; padding: 18px;
  background: var(--ink); border: 1px solid rgba(196,169,106,0.12);
  cursor: pointer; text-align: left; transition: all 0.2s;
}
.candidate-card:hover { border-color: rgba(196,169,106,0.3); }
.candidate-card.selected {
  background: rgba(196,169,106,0.08);
  border-color: rgba(196,169,106,0.6);
  box-shadow: inset 0 0 20px rgba(196,169,106,0.03);
}

.avatar {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: rgba(196,169,106,0.1); border: 1px solid rgba(196,169,106,0.2);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.avatar-photo { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
.initials { font-family: var(--font-mono); font-size: 14px; color: var(--gold); font-weight: 600; }
.cand-info  { flex: 1; }
.cand-name  { font-family: var(--font-display); font-size: 1.1rem; color: var(--cream); margin-bottom: 4px; }
.cand-meta  { font-family: var(--font-mono); font-size: 10px; color: var(--stone); letter-spacing: 0.5px; margin-bottom: 6px; }
.cand-platform {
  font-family: var(--font-body); font-size: 0.85rem; color: var(--mist); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

.check-circle {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid rgba(196,169,106,0.2);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; background: transparent;
}
.check-circle.checked { background: var(--gold); border-color: var(--gold); color: var(--ink); font-size: 11px; font-weight: bold; }

.nav-row { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
.nav-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.2);
  color: var(--stone); padding: 12px 24px; cursor: pointer;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; transition: all 0.2s;
}
.nav-btn:hover:not(:disabled) { color: var(--gold); border-color: rgba(196,169,106,0.4); }
.nav-btn.primary { background: var(--gold); color: var(--ink); border-color: var(--gold); font-weight: 600; letter-spacing: 3px; }
.nav-btn.primary:hover:not(:disabled) { background: var(--gold-light); }
.nav-btn:disabled { cursor: not-allowed; }

.incomplete-note { font-family: var(--font-mono); font-size: 11px; color: var(--stone); letter-spacing: 0.5px; }


@media (max-width: 900px) {
  .step-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .candidate-card { padding: 14px 12px; gap: 10px; }
}
@media (max-width: 480px) {
  .avatar { width: 36px; height: 36px; }
  .cand-name { font-size: 1rem; }
}

</style>
