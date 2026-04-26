<template>
  <div class="tab-root fade-up">

    <!-- Header -->
    <div class="tab-header-row">
      <div>
        <p class="tab-label">MANAGEMENT</p>
        <h1 class="tab-title">Candidates</h1>
      </div>
    </div>

    <!-- Election picker -->
    <div class="picker-row">
      <div class="field" style="max-width: 480px; width: 100%">
        <label class="field-label">SELECT ELECTION</label>
        <select v-model="selectedElectionId" class="input" @change="onElectionChange">
          <option value="">— choose an election —</option>
          <option v-for="e in elections" :key="e._id" :value="e._id">
            {{ e.title }} · {{ e.academicYear }} {{ e.semester }} · {{ e.status.toUpperCase() }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading election list -->
    <div v-if="loadingElections" class="center"><span class="spinner" /></div>

    <!-- No election selected -->
    <div v-else-if="!selectedElectionId" class="empty-state">
      <p class="empty-icon">🗳</p>
      <p class="empty-text">Select an election above to manage its candidates.</p>
    </div>

    <!-- Election locked warning -->
    <div v-else-if="selectedElection?.isLocked" class="notice notice-warn">
      This election is locked (votes have been cast). Candidates cannot be modified.
    </div>

    <!-- Positions & candidates -->
    <template v-else>
      <div v-if="loadingCandidates" class="center"><span class="spinner" /></div>

      <div v-else-if="!positions.length" class="empty-state">
        <p class="empty-text">This election has no positions defined yet.</p>
      </div>

      <div v-else class="positions-list">
        <div
          v-for="pos in positions"
          :key="pos._id"
          class="position-card"
        >
          <!-- Position header -->
          <div class="pos-header">
            <div>
              <p class="pos-tag">POSITION</p>
              <h2 class="pos-title">{{ pos.title }}</h2>
              <p v-if="pos.description" class="pos-desc">{{ pos.description }}</p>
            </div>
            <button
              v-if="!selectedElection?.isLocked"
              class="outline-btn"
              @click="toggleAddForm(pos._id)"
            >
              {{ addingFor === pos._id ? '✕ CANCEL' : '+ ADD CANDIDATE' }}
            </button>
          </div>

          <!-- Add candidate form -->
          <transition name="slide">
            <div v-if="addingFor === pos._id" class="add-form">
              <p class="form-label">NEW CANDIDATE — {{ pos.title.toUpperCase() }}</p>
              <div class="form-grid">
                <div class="field" style="grid-column:1/-1">
                  <label class="field-label">FULL NAME *</label>
                  <input v-model="newCandidate.fullName" class="input" placeholder="e.g. Juan Dela Cruz" />
                </div>
                <div class="field">
                  <label class="field-label">STUDENT ID</label>
                  <input v-model="newCandidate.studentId" class="input" placeholder="2021-XXXXX" />
                </div>
                <div class="field">
                  <label class="field-label">DEPARTMENT / COLLEGE</label>
                  <input v-model="newCandidate.department" class="input" placeholder="e.g. BSCS, Engineering" />
                </div>
                <div class="field">
                  <label class="field-label">YEAR LEVEL</label>
                  <select v-model="newCandidate.yearLevel" class="input">
                    <option value="">— optional —</option>
                    <option :value="1">1st Year</option>
                    <option :value="2">2nd Year</option>
                    <option :value="3">3rd Year</option>
                    <option :value="4">4th Year</option>
                    <option :value="5">5th Year</option>
                  </select>
                </div>
                <div class="field" style="grid-column:1/-1">
                  <label class="field-label">PLATFORM / ADVOCACY</label>
                  <textarea
                    v-model="newCandidate.platform"
                    class="input textarea"
                    placeholder="Brief statement of goals and platforms (optional)"
                    rows="3"
                  />
                </div>
                <div class="field" style="grid-column:1/-1">
                  <label class="field-label">CANDIDATE PHOTO (optional)</label>
                  <div class="photo-upload-row">
                    <div class="photo-preview" :class="{ 'has-photo': newCandidate.photoPreview }">
                      <img v-if="newCandidate.photoPreview" :src="newCandidate.photoPreview" alt="Preview" class="photo-img" />
                      <span v-else class="photo-placeholder">NO PHOTO</span>
                    </div>
                    <div class="photo-controls">
                      <label class="upload-label">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style="display:none"
                          @change="onPhotoSelect"
                        />
                        <span class="outline-btn" style="cursor:pointer; display:inline-block">CHOOSE FILE</span>
                      </label>
                      <button v-if="newCandidate.photoPreview" class="remove-btn" style="margin-top:6px" @click="clearPhoto">REMOVE PHOTO</button>
                      <p class="photo-hint">JPG, PNG or WEBP · Max 2 MB</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button class="outline-btn" @click="addingFor = null">CANCEL</button>
                <button
                  class="primary-btn"
                  :disabled="saving || !newCandidate.fullName.trim()"
                  @click="addCandidate(pos)"
                >
                  {{ saving ? 'ADDING...' : 'ADD CANDIDATE' }}
                </button>
              </div>
            </div>
          </transition>

          <!-- Candidate list -->
          <div v-if="candidatesFor(pos._id).length === 0" class="no-candidates">
            No candidates registered for this position yet.
          </div>
          <div v-else class="candidate-list">
            <div
              v-for="c in candidatesFor(pos._id)"
              :key="c._id"
              class="candidate-row"
            >
              <div class="cand-avatar">
                <img v-if="c.photoUrl" :src="c.photoUrl" alt="" class="cand-photo" />
                <span v-else>{{ initials(c.fullName) }}</span>
              </div>
              <div class="cand-info">
                <p class="cand-name">{{ c.fullName }}</p>
                <p class="cand-meta">
                  <span v-if="c.studentId">{{ c.studentId }}</span>
                  <span v-if="c.studentId && c.department"> · </span>
                  <span v-if="c.department">{{ c.department }}</span>
                  <span v-if="c.yearLevel"> · Year {{ c.yearLevel }}</span>
                </p>
                <p v-if="c.platform" class="cand-platform">{{ truncate(c.platform, 120) }}</p>
              </div>
              <div class="cand-actions">
                <button
                  v-if="!selectedElection?.isLocked"
                  class="remove-btn"
                  :disabled="removing === c._id"
                  @click="removeCandidate(c._id)"
                >
                  {{ removing === c._id ? '...' : 'REMOVE' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary footer -->
      <div v-if="candidates.length" class="summary-row">
        <span class="summary-text">
          {{ candidates.length }} candidate{{ candidates.length !== 1 ? 's' : '' }}
          across {{ positions.length }} position{{ positions.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminAPI, candidatesAPI } from '@/utils/api'
import { useToast } from 'vue-toastification'

const toast   = useToast()

// ── Data ──────────────────────────────────────────────────────────
const elections          = ref([])
const loadingElections   = ref(true)
const selectedElectionId = ref('')
const loadingCandidates  = ref(false)
const candidates         = ref([])
const addingFor          = ref(null)   // positionId of open form
const saving             = ref(false)
const removing           = ref(null)  // candidate _id being removed

const blankCandidate = () => ({ fullName: '', studentId: '', department: '', yearLevel: '', platform: '', photoPreview: null, photoBase64: null })
const newCandidate = ref(blankCandidate())

// ── Photo helpers ─────────────────────────────────────────────────
function onPhotoSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Photo must be under 2 MB')
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    newCandidate.value.photoPreview = ev.target.result
    newCandidate.value.photoBase64  = ev.target.result
  }
  reader.readAsDataURL(file)
}

function clearPhoto() {
  newCandidate.value.photoPreview = null
  newCandidate.value.photoBase64  = null
}

// ── Computed ──────────────────────────────────────────────────────
const selectedElection = computed(() =>
  elections.value.find(e => e._id === selectedElectionId.value)
)

const positions = computed(() =>
  (selectedElection.value?.positions ?? []).slice().sort((a, b) => a.order - b.order)
)

const candidatesFor = (posId) =>
  candidates.value.filter(c => c.positionId === posId)

// ── Helpers ───────────────────────────────────────────────────────
const initials = (name) =>
  name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

const truncate = (str, n) =>
  str.length > n ? str.slice(0, n) + '…' : str

// ── Lifecycle ─────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const r = await adminAPI.getElections()
    elections.value = r.data.data
  } catch {
    toast.error('Failed to load elections')
  } finally {
    loadingElections.value = false
  }
})

// ── Actions ───────────────────────────────────────────────────────
async function onElectionChange() {
  addingFor.value = null
  candidates.value = []
  if (!selectedElectionId.value) return

  loadingCandidates.value = true
  try {
    const r = await candidatesAPI.getByElection(selectedElectionId.value)
    candidates.value = r.data.data
  } catch {
    toast.error('Failed to load candidates')
  } finally {
    loadingCandidates.value = false
  }
}

function toggleAddForm(posId) {
  addingFor.value = addingFor.value === posId ? null : posId
  newCandidate.value = blankCandidate()
}

async function addCandidate(pos) {
  if (!newCandidate.value.fullName.trim()) return
  saving.value = true
  try {
    const payload = {
      election:      selectedElectionId.value,
      positionId:    pos._id,
      positionTitle: pos.title,
      fullName:      newCandidate.value.fullName.trim(),
      studentId:     newCandidate.value.studentId.trim() || undefined,
      department:    newCandidate.value.department.trim() || undefined,
      yearLevel:     newCandidate.value.yearLevel || undefined,
      platform:      newCandidate.value.platform.trim() || undefined,
    }
    const r = await candidatesAPI.create(payload)
    let candidate = r.data.data

    // Upload photo if selected
    if (newCandidate.value.photoBase64) {
      try {
        const photoRes = await candidatesAPI.uploadPhoto(candidate._id, newCandidate.value.photoBase64)
        candidate = photoRes.data.data
      } catch {
        toast.warning(`${payload.fullName} added, but photo upload failed.`)
      }
    }

    candidates.value.push(candidate)
    toast.success(`${payload.fullName} added to ${pos.title}`)
    addingFor.value = null
    newCandidate.value = blankCandidate()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to add candidate')
  } finally {
    saving.value = false
  }
}

async function removeCandidate(id) {
  if (!confirm('Remove this candidate? This cannot be undone.')) return
  removing.value = id
  try {
    await candidatesAPI.remove(id)
    candidates.value = candidates.value.filter(c => c._id !== id)
    toast.success('Candidate removed')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to remove candidate')
  } finally {
    removing.value = null
  }
}
</script>

<style scoped>
.tab-root { display: flex; flex-direction: column; gap: 28px; max-width: 1000px; }

.tab-header-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.tab-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: var(--gold); opacity: 0.6; margin-bottom: 6px; }
.tab-title { font-family: var(--font-display); font-size: 2.2rem; color: var(--cream); font-weight: 700; }

.picker-row { display: flex; align-items: flex-end; gap: 16px; }
.field      { display: flex; flex-direction: column; gap: 8px; }
.field-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--gold); opacity: 0.6; }
.input {
  background: var(--ink); border: var(--border-mid); color: var(--cream);
  padding: 10px 14px; font-family: var(--font-mono); font-size: 13px;
  outline: none; width: 100%;
}
.input:focus { border-color: rgba(196,169,106,0.5); }
.textarea   { resize: vertical; min-height: 72px; font-family: var(--font-body); font-size: 14px; }

.center { display: flex; justify-content: center; padding: 60px; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon  { font-size: 2.5rem; margin-bottom: 16px; }
.empty-text  { font-family: var(--font-mono); font-size: 12px; letter-spacing: 1px; color: var(--stone); }

.notice { padding: 14px 20px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 1px; border: var(--border-mid); }
.notice-warn { border-color: rgba(196,132,26,0.35); color: var(--warning); background: rgba(196,132,26,0.06); }

/* ── Positions ── */
.positions-list { display: flex; flex-direction: column; gap: 24px; }

.position-card {
  border: var(--border-dim);
  background: var(--ink-mid);
  overflow: hidden;
}

.pos-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 22px 24px; border-bottom: var(--border-dim);
  flex-wrap: wrap; gap: 12px;
}
.pos-tag   { font-family: var(--font-mono); font-size: 9px; letter-spacing: 3px; color: var(--gold); opacity: 0.5; margin-bottom: 4px; }
.pos-title { font-family: var(--font-display); font-size: 1.4rem; color: var(--cream); font-weight: 700; }
.pos-desc  { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 4px; }

/* ── Add form ── */
.add-form {
  padding: 22px 24px;
  background: rgba(196,169,106,0.03);
  border-bottom: var(--border-dim);
  display: flex; flex-direction: column; gap: 16px;
}
.form-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: var(--gold); opacity: 0.7; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* ── Candidate rows ── */
.no-candidates {
  padding: 24px; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 1px; color: var(--stone); text-align: center;
}
.candidate-list { display: flex; flex-direction: column; }
.candidate-row {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 16px 24px; border-bottom: 1px solid rgba(196,169,106,0.06);
}
.candidate-row:last-child { border-bottom: none; }

.cand-avatar {
  width: 40px; height: 40px; flex-shrink: 0;
  background: rgba(196,169,106,0.1); border: var(--border-dim);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 12px; color: var(--gold); font-weight: 600;
  overflow: hidden;
}
.cand-photo { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ── Photo upload ── */
.photo-upload-row { display: flex; align-items: flex-start; gap: 16px; }
.photo-preview {
  width: 80px; height: 80px; flex-shrink: 0;
  background: rgba(196,169,106,0.05); border: var(--border-dim);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.photo-preview.has-photo { border-color: rgba(196,169,106,0.4); }
.photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-placeholder { font-family: var(--font-mono); font-size: 8px; letter-spacing: 1px; color: var(--stone); }
.photo-controls { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.upload-label { display: inline-block; }
.photo-hint { font-family: var(--font-mono); font-size: 9px; color: var(--stone); letter-spacing: 0.5px; margin-top: 2px; }
.cand-info  { flex: 1; min-width: 0; }
.cand-name  { font-family: var(--font-body); font-size: 1.05rem; color: var(--cream); font-weight: 600; }
.cand-meta  { font-family: var(--font-mono); font-size: 10px; color: var(--stone); margin-top: 2px; }
.cand-platform { font-family: var(--font-body); font-size: 0.85rem; color: var(--mist); margin-top: 4px; font-style: italic; line-height: 1.4; }
.cand-actions { flex-shrink: 0; padding-top: 2px; }

/* ── Summary ── */
.summary-row { padding: 12px 0; border-top: var(--border-dim); }
.summary-text { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--stone); }

/* ── Buttons ── */
.primary-btn {
  background: var(--gold); color: var(--ink); border: none;
  padding: 10px 22px; font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 3px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.primary-btn:hover:not(:disabled) { background: var(--gold-light); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.outline-btn {
  background: transparent; border: 1px solid rgba(196,169,106,0.25); color: var(--gold);
  padding: 9px 18px; font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 2px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.outline-btn:hover { background: rgba(196,169,106,0.06); }

.remove-btn {
  background: transparent; border: 1px solid rgba(196,42,42,0.25); color: var(--danger);
  padding: 6px 12px; font-family: var(--font-mono); font-size: 9px;
  letter-spacing: 1.5px; cursor: pointer; transition: all 0.2s;
}
.remove-btn:hover:not(:disabled) { background: rgba(196,42,42,0.08); border-color: rgba(196,42,42,0.5); }
.remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Transitions ── */
.slide-enter-active, .slide-leave-active { transition: all 0.22s var(--ease-out); overflow: hidden; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 600px; }

@keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-up { animation: fade-up 0.3s var(--ease-out) both; }


@media (max-width: 900px) {
  .tab-header-row { flex-direction: column; gap: 12px; align-items: flex-start; }
  .form-grid { grid-template-columns: 1fr !important; }
  .pos-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .cand-row   { flex-wrap: wrap; gap: 8px; }
  .photo-upload-row { flex-direction: column; }
}
@media (max-width: 480px) {
  .tab-title { font-size: 1.6rem; }
}

</style>
