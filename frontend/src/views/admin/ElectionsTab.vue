<template>
  <div class="tab-root fade-up">
    <!-- Results view -->
    <template v-if="results">
      <div class="tab-header-row">
        <div>
          <p class="tab-label">RESULTS</p>
          <h1 class="tab-title">{{ results.election.title }}</h1>
          <p class="tab-label" style="margin-top:8px">
            Turnout: {{ results.election.turnout }} · {{ results.election.totalVotesCast }} votes cast
          </p>
        </div>
        <button class="outline-btn" @click="results = null">← BACK</button>
      </div>

      <div v-for="pos in results.results" :key="pos.positionId" class="result-section">
        <p class="section-label">{{ pos.positionTitle }}</p>
        <div
          v-for="(c, i) in [...pos.candidates].sort((a,b) => b.voteCount - a.voteCount)"
          :key="c.id"
          class="result-row"
          :class="{ winner: i === 0 }"
        >
          <div style="flex:1">
            <p class="result-name">{{ i === 0 ? '★ ' : '' }}{{ c.fullName }}</p>
            <p class="result-dept">{{ c.department }}</p>
          </div>
          <div style="text-align:right">
            <p class="result-votes" :style="{ color: i === 0 ? 'var(--gold)' : 'var(--cream)' }">
              {{ c.voteCount }}
            </p>
            <p class="result-pct">
              {{ pos.totalVotes ? ((c.voteCount / pos.totalVotes) * 100).toFixed(1) : 0 }}%
            </p>
          </div>
        </div>
      </div>
      <div style="height:40px" />
    </template>

    <!-- Elections list view -->
    <template v-else>
      <div class="tab-header-row">
        <div>
          <p class="tab-label">MANAGEMENT</p>
          <h1 class="tab-title">Elections</h1>
        </div>
        <button class="primary-btn" @click="showCreate = !showCreate">
          {{ showCreate ? 'CANCEL' : '+ NEW ELECTION' }}
        </button>
      </div>

      <!-- Create form -->
      <transition name="slide">
        <div v-if="showCreate" class="create-form">
          <p class="form-label">NEW ELECTION</p>
          <div class="form-grid">
            <div class="field" style="grid-column:1/-1">
              <label class="field-label">TITLE</label>
              <input v-model="newElection.title" class="input" placeholder="Election title" />
            </div>
            <div class="field">
              <label class="field-label">ACADEMIC YEAR</label>
              <input v-model="newElection.academicYear" class="input" placeholder="2024-2025" />
            </div>
            <div class="field">
              <label class="field-label">SEMESTER</label>
              <select v-model="newElection.semester" class="input">
                <option>1st</option><option>2nd</option><option>Summer</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">START DATE</label>
              <input v-model="newElection.startDate" type="datetime-local" class="input" />
            </div>
            <div class="field">
              <label class="field-label">END DATE</label>
              <input v-model="newElection.endDate" type="datetime-local" class="input" />
            </div>
          </div>

          <!-- Positions editor -->
          <div class="positions-section">
            <div class="positions-header">
              <p class="field-label" style="margin:0">POSITIONS ({{ newElection.positions.length }})</p>
              <button class="add-pos-btn" @click="addPosition">+ ADD POSITION</button>
            </div>
            <div class="positions-editor">
              <div v-for="(pos, idx) in newElection.positions" :key="idx" class="pos-editor-row">
                <span class="pos-order">{{ idx + 1 }}</span>
                <input
                  v-model="pos.title"
                  class="input pos-input"
                  :placeholder="`Position title (e.g. ${defaultPositionNames[idx] || 'Senator'})`"
                />
                <input
                  v-model="pos.description"
                  class="input pos-input"
                  placeholder="Description (optional)"
                />
                <button class="remove-pos-btn" @click="removePosition(idx)">✕</button>
              </div>
              <div v-if="!newElection.positions.length" class="no-positions">
                No positions yet. Click "+ ADD POSITION" to begin.
              </div>
            </div>
          </div>

          <button class="primary-btn" style="align-self:flex-end" :disabled="creating" @click="createElection">
            {{ creating ? 'CREATING...' : 'CREATE ELECTION' }}
          </button>
        </div>
      </transition>

      <!-- Table -->
      <div v-if="loading" class="center"><span class="spinner" /></div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr class="thead">
              <th v-for="h in ['TITLE','STATUS','START','END','ACTIONS']" :key="h" class="th">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in elections" :key="e._id" class="tr">
              <td class="td">
                <p class="td-title">{{ e.title }}</p>
                <p class="td-meta">{{ e.academicYear }} · {{ e.semester }}</p>
              </td>
              <td class="td">
                <span class="status-badge" :style="{ color: statusColor(e.status), borderColor: statusColor(e.status) }">
                  {{ e.status.replace('_',' ').toUpperCase() }}
                </span>
              </td>
              <td class="td td-mono">{{ fmtDate(e.startDate) }}</td>
              <td class="td td-mono">{{ fmtDate(e.endDate) }}</td>
              <td class="td">
                <div class="action-row">
                  <button v-if="e.status==='draft'"      class="act-btn" @click="changeStatus(e._id,'scheduled')">SCHEDULE</button>
                  <button v-if="['draft','scheduled'].includes(e.status)"  class="act-btn green" @click="changeStatus(e._id,'active')">ACTIVATE</button>
                  <button v-if="e.status==='active'"     class="act-btn" @click="changeStatus(e._id,'paused')">PAUSE</button>
                  <button v-if="e.status==='paused'"     class="act-btn" @click="changeStatus(e._id,'active')">RESUME</button>
                  <button v-if="['active','paused'].includes(e.status)" class="act-btn red" @click="changeStatus(e._id,'closed')">CLOSE</button>
                  <button v-if="e.status==='closed'"     class="act-btn" @click="loadResults(e._id)">RESULTS</button>
                  <button v-if="e.status==='closed'"     class="act-btn green" @click="publishResults(e._id)">PUBLISH</button>
                  <button v-if="e.status==='results_published'" class="act-btn" @click="loadResults(e._id)">VIEW</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'

const toast      = useToast()
const elections  = ref([])
const loading    = ref(true)
const showCreate = ref(false)
const creating   = ref(false)
const results    = ref(null)

const defaultPositionNames = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor', 'PRO', 'Senator']

const blankElection = () => ({
  title: '', academicYear: '2024-2025', semester: '2nd', startDate: '', endDate: '',
  positions: [
    { title: 'President',      description: 'Chief executive of the SSG', order: 1 },
    { title: 'Vice President', description: '',                        order: 2 },
    { title: 'Secretary',      description: '',                        order: 3 },
    { title: 'Treasurer',      description: '',                        order: 4 },
    { title: 'Auditor',        description: '',                        order: 5 },
  ],
})

const newElection = ref(blankElection())

function addPosition() {
  const idx = newElection.value.positions.length
  newElection.value.positions.push({ title: '', description: '', order: idx + 1 })
}

function removePosition(idx) {
  newElection.value.positions.splice(idx, 1)
  newElection.value.positions.forEach((p, i) => { p.order = i + 1 })
}

const statusColors = { draft:'#666', scheduled:'var(--gold)', active:'var(--success)', paused:'var(--warning)', closed:'var(--stone)', results_published:'var(--success)' }
const statusColor = (s) => statusColors[s] || 'var(--stone)'
const fmtDate = (d) => format(new Date(d), 'MMM d, yyyy HH:mm')

async function load() {
  loading.value = true
  try { const r = await adminAPI.getElections(); elections.value = r.data.data }
  catch { toast.error('Failed to load elections') }
  finally { loading.value = false }
}

onMounted(load)

async function createElection() {
  if (!newElection.value.title.trim()) return toast.error('Title is required')
  const validPositions = newElection.value.positions.filter(p => p.title.trim())
  if (!validPositions.length) return toast.error('At least one position is required')

  creating.value = true
  try {
    await adminAPI.createElection({
      ...newElection.value,
      positions: validPositions.map((p, i) => ({ ...p, title: p.title.trim(), order: i + 1 })),
    })
    toast.success('Election created')
    showCreate.value = false
    newElection.value = blankElection()
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to create election')
  } finally { creating.value = false }
}

async function changeStatus(id, status) {
  try {
    await adminAPI.setElectionStatus(id, status)
    toast.success(`Election ${status}`)
    await load()
  } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
}

async function loadResults(id) {
  try {
    const r = await adminAPI.getResults(id)
    results.value = r.data.data
  } catch (err) { toast.error(err.response?.data?.message || 'Results not available yet') }
}

async function publishResults(id) {
  try {
    await adminAPI.publishResults(id)
    toast.success('Results published')
    await load()
  } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
}
</script>

<style scoped>
.tab-root { display: flex; flex-direction: column; gap: 28px; max-width: 1000px; }
.tab-header-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.tab-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.tab-title { font-family: var(--font-display); font-size: 2.2rem; color: var(--cream); font-weight: 700; }

.create-form {
  background: var(--ink-mid); border: var(--border-mid);
  padding: 28px; display: flex; flex-direction: column; gap: 20px;
}
.form-label  { font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; color: var(--gold); }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field       { display: flex; flex-direction: column; gap: 8px; }
.field-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; }
.input {
  background: var(--ink); border: var(--border-mid); color: var(--cream);
  padding: 10px 14px; font-family: var(--font-mono); font-size: 13px;
  outline: none; width: 100%;
}
.input:focus { border-color: rgba(196,169,106,0.5); }

.center { display: flex; justify-content: center; padding: 60px; }
.table-wrap { overflow-x: auto; border: var(--border-dim); }
.table { width: 100%; border-collapse: collapse; }
.thead { background: rgba(196,169,106,0.04); }
.th { padding: 12px 16px; text-align: left; font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--stone); border-bottom: var(--border-dim); white-space: nowrap; }
.tr { border-bottom: 1px solid rgba(196,169,106,0.06); }
.td { padding: 14px 16px; vertical-align: middle; }
.td-title { font-family: var(--font-body); color: var(--cream); font-size: 1rem; }
.td-meta  { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 2px; }
.td-mono  { font-family: var(--font-mono); font-size: 11px; color: var(--stone); }
.status-badge { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; padding: 3px 8px; border: 1px solid; display: inline-block; }

.action-row { display: flex; gap: 8px; flex-wrap: wrap; }
.act-btn { background: transparent; border: 1px solid rgba(196,169,106,0.2); color: var(--stone); padding: 6px 12px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.5px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.act-btn:hover { color: var(--gold); border-color: rgba(196,169,106,0.4); }
.act-btn.green { border-color: rgba(42,138,90,0.3); color: var(--success); }
.act-btn.red   { border-color: rgba(196,42,42,0.3); color: var(--danger); }

.section-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 8px; }
.result-section { display: flex; flex-direction: column; gap: 2px; margin-bottom: 24px; }
.result-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: var(--border-dim); }
.result-row.winner { background: rgba(196,169,106,0.06); border-color: rgba(196,169,106,0.3); }
.result-name  { font-family: var(--font-display); font-size: 1.1rem; color: var(--cream); }
.result-dept  { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 2px; }
.result-votes { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; }
.result-pct   { font-family: var(--font-mono); font-size: 10px; color: var(--stone); }

.primary-btn { background: var(--gold); color: var(--ink); border: none; padding: 12px 24px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
.primary-btn:hover:not(:disabled) { background: var(--gold-light); }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.outline-btn { background: transparent; border: 1px solid rgba(196,169,106,0.25); color: var(--gold); padding: 10px 20px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
.outline-btn:hover { background: rgba(196,169,106,0.06); }

/* Positions editor */
.positions-section { display: flex; flex-direction: column; gap: 12px; }
.positions-header { display: flex; justify-content: space-between; align-items: center; }
.positions-editor { display: flex; flex-direction: column; gap: 8px; padding: 16px; background: rgba(0,0,0,0.2); border: var(--border-dim); }
.pos-editor-row { display: flex; align-items: center; gap: 10px; }
.pos-order { font-family: var(--font-mono); font-size: 10px; color: var(--gold); opacity: 0.5; width: 18px; text-align: right; flex-shrink: 0; }
.pos-input { flex: 1; }
.no-positions { font-family: var(--font-mono); font-size: 11px; color: var(--stone); text-align: center; padding: 12px 0; }
.add-pos-btn { background: transparent; border: 1px solid rgba(196,169,106,0.2); color: var(--gold); padding: 6px 14px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
.add-pos-btn:hover { background: rgba(196,169,106,0.06); border-color: rgba(196,169,106,0.4); }
.remove-pos-btn { background: transparent; border: 1px solid rgba(196,42,42,0.2); color: var(--danger); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; flex-shrink: 0; transition: all 0.2s; }
.remove-pos-btn:hover { background: rgba(196,42,42,0.08); border-color: rgba(196,42,42,0.5); }


@media (max-width: 900px) {
  .tab-header-row { flex-direction: column; gap: 12px; align-items: flex-start; }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { min-width: 560px; }
  .form-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .tab-title { font-size: 1.6rem; }
  .pos-list { gap: 8px; }
}

</style>
