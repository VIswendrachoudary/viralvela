import { db, ADMIN_PIN } from '../firebase.js'
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, addDoc, serverTimestamp, getCountFromServer
} from 'firebase/firestore'
import { showToast, formatDate, formatDateTime, skeletonRows, debounce } from '../utils.js'
import { renderNav } from '../components/nav.js'

const SESSION_KEY = '3mfc_admin_ok'
let currentAdminTab = 'config'
let unsubscribeSubmissions = null
let unsubscribeTeams = null
let unsubscribeBinSubs = null
let unsubscribeBinTeams = null

export function renderAdmin() {
  renderNav('admin')
  const page = document.getElementById('page')

  // Check session
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    renderAdminDashboard(page)
  } else {
    renderAdminLogin(page)
  }
}

/* ── PIN Login ─────────────────────────────────────────────────── */
function renderAdminLogin(page) {
  page.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 64px);">
      <div class="form-card fade-up" style="max-width:400px;text-align:center;padding:56px 48px;">
        <div style="font-size:52px;margin-bottom:20px;">🎬</div>
        <p class="eyebrow">Admin Portal</p>
        <h1 class="section-title" style="font-size:26px;margin-bottom:8px;">Enter Admin PIN</h1>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--paper-dim);margin-bottom:32px;letter-spacing:.5px;line-height:1.7;">
          This area is restricted to contest organisers.
        </p>
        <form id="pin-form">
          <div class="form-group" style="text-align:left;">
            <label class="form-label" for="pin-input">Admin PIN</label>
            <div style="position:relative;">
              <input
                class="form-input"
                type="password"
                id="pin-input"
                placeholder="Enter PIN…"
                autocomplete="current-password"
                style="font-size:20px;letter-spacing:4px;text-align:center;padding-right:44px;"
                autofocus
              />
              <button type="button" id="toggle-admin-pin" aria-label="Toggle password visibility" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--paper-dim);cursor:pointer;font-size:18px;padding:4px;">👁️</button>
            </div>
            <p class="form-error" id="pin-error" style="display:none;">Incorrect PIN. Try again.</p>
          </div>
          <button type="submit" class="btn" style="width:100%;margin-top:8px;" id="pin-btn">
            Unlock →
          </button>
        </form>
      </div>
    </div>
  `

  const input = document.getElementById('pin-input')
  const errEl = document.getElementById('pin-error')
  const toggleBtn = document.getElementById('toggle-admin-pin')

  toggleBtn?.addEventListener('click', () => {
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    toggleBtn.textContent = isPassword ? '🙈' : '👁️'
  })

  input?.addEventListener('input', () => {
    if (errEl) errEl.style.display = 'none'
  })

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      if (errEl) errEl.style.display = 'none'
    }
  })

  document.getElementById('pin-form').addEventListener('submit', e => {
    e.preventDefault()
    const entered = input.value.trim()
    if (entered.toLowerCase() === ADMIN_PIN.toLowerCase()) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      renderAdminDashboard(document.getElementById('page'))
    } else {
      errEl.style.display = 'block'
      input.value = ''
      input.focus()
      input.style.animation = 'none'
      requestAnimationFrame(() => {
        input.style.animation = 'shake .3s ease'
      })
    }
  })
}

/* ── Main Dashboard ────────────────────────────────────────────── */
function renderAdminDashboard(page) {
  page.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-title">Admin Panel</div>
        <button class="admin-nav-item ${currentAdminTab==='config'?'active':''}" data-tab="config">
          <span class="nav-icon">⚙️</span> Contest Settings
        </button>
        <button class="admin-nav-item ${currentAdminTab==='team-registrations'?'active':''}" data-tab="team-registrations">
          <span class="nav-icon">📋</span> Team Registrations
          <span id="teams-badge" style="margin-left:auto;font-size:10px;background:var(--amber-glow);color:var(--amber);padding:2px 7px;border-radius:20px;"></span>
        </button>
        <button class="admin-nav-item ${currentAdminTab==='submissions'?'active':''}" data-tab="submissions">
          <span class="nav-icon">📥</span> Submissions
          <span id="sub-badge" style="margin-left:auto;font-size:10px;background:var(--amber-glow);color:var(--amber);padding:2px 7px;border-radius:20px;"></span>
        </button>
        <button class="admin-nav-item ${currentAdminTab==='bin'?'active':''}" data-tab="bin">
          <span class="nav-icon">🗑️</span> Recycle Bin
          <span id="bin-badge" style="margin-left:auto;font-size:10px;background:rgba(194,59,34,0.25);color:var(--red);padding:2px 7px;border-radius:20px;"></span>
        </button>
        <button class="admin-nav-item ${currentAdminTab==='finalists'?'active':''}" data-tab="finalists">
          <span class="nav-icon">🏆</span> Finalists
        </button>
        <button class="admin-nav-item ${currentAdminTab==='votes'?'active':''}" data-tab="votes">
          <span class="nav-icon">🗳️</span> Votes
        </button>
        <div style="border-top:1px solid var(--line);margin-top:24px;padding-top:16px;">
          <button class="admin-nav-item" id="lock-btn" style="color:var(--grey);">
            <span class="nav-icon">🔒</span> Lock
          </button>
        </div>
      </aside>

      <main class="admin-content" id="admin-main">
        <div class="loader-wrap"><div class="loader"></div></div>
      </main>
    </div>
  `

  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  document.getElementById('lock-btn').addEventListener('click', () => {
    if (unsubscribeSubmissions) { unsubscribeSubmissions(); unsubscribeSubmissions = null }
    if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
    if (unsubscribeBinSubs) { unsubscribeBinSubs(); unsubscribeBinSubs = null }
    if (unsubscribeBinTeams) { unsubscribeBinTeams(); unsubscribeBinTeams = null }
    sessionStorage.removeItem(SESSION_KEY)
    renderAdminLogin(document.getElementById('page'))
  })

  loadSubmissionCount()
  loadTeamCount()
  switchTab(currentAdminTab)
}

function switchTab(tab) {
  currentAdminTab = tab
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab)
  })
  const main = document.getElementById('admin-main')
  if (!main) return
  if (tab === 'config')                 renderConfigTab(main)
  else if (tab === 'team-registrations') renderTeamRegistrationsTab(main)
  else if (tab === 'submissions')        renderSubmissionsTab(main)
  else if (tab === 'bin')                renderBinTab(main)
  else if (tab === 'finalists')          renderFinalistsTab(main)
  else if (tab === 'votes')              renderVotesTab(main)
}

async function loadSubmissionCount() {
  try {
    const snap = await getCountFromServer(collection(db, 'submissions'))
    const badge = document.getElementById('sub-badge')
    if (badge) badge.textContent = snap.data().count
  } catch (_) {}
}

async function loadTeamCount() {
  try {
    const snap = await getCountFromServer(collection(db, 'teamRegistrations'))
    const badge = document.getElementById('teams-badge')
    if (badge) badge.textContent = snap.data().count
  } catch (_) {}
}

/* ================================================================
   CONFIG TAB
================================================================ */
async function renderConfigTab(main) {
  main.innerHTML = `
    <div class="admin-header">
      <h2>Contest Settings</h2>
      <p>Changes save to Firestore and update the public site instantly.</p>
    </div>
    <div class="loader-wrap"><div class="loader"></div></div>
  `

  let cfg = {}
  try {
    const snap = await getDoc(doc(db, 'config', 'contest'))
    if (snap.exists()) cfg = snap.data()
  } catch (err) {
    showToast('Failed to load config: ' + err.message, 'error')
  }

  main.innerHTML = `
    <div class="admin-header">
      <h2>Contest Settings</h2>
      <p>Changes save to Firestore and update the public site instantly.</p>
    </div>
    <form id="config-form">

      <div class="config-section">
        <div class="config-section-title">School &amp; Branding</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="cfg-school">School Name</label>
            <input class="form-input" id="cfg-school" value="${esc(cfg.schoolName||'')}" placeholder="e.g. Northview High" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-dept">Department / Organiser</label>
            <input class="form-input" id="cfg-dept" value="${esc(cfg.department||'')}" placeholder="Film Club" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="cfg-email">Contact Email</label>
            <input class="form-input" type="email" id="cfg-email" value="${esc(cfg.contactEmail||'')}" placeholder="films@school.edu" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-website">Website URL</label>
            <input class="form-input" id="cfg-website" value="${esc(cfg.website||'')}" placeholder="school.edu/filmchallenge" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="cfg-theme">This Year's Theme</label>
          <input class="form-input" id="cfg-theme" value="${esc(cfg.theme||'')}" placeholder="e.g. Starting Over" />
        </div>
      </div>

      <div class="config-section">
        <div class="config-section-title">Key Dates</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="cfg-open">Entries Open</label>
            <input class="form-input" type="date" id="cfg-open" value="${toDateInput(cfg.openDate)}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-deadline">Submission Deadline</label>
            <input class="form-input" type="date" id="cfg-deadline" value="${toDateInput(cfg.deadlineDate)}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-finalists">Finalists Announced</label>
            <input class="form-input" type="date" id="cfg-finalists" value="${toDateInput(cfg.finalistsDate)}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-screening">Screening Night</label>
            <input class="form-input" type="date" id="cfg-screening" value="${toDateInput(cfg.screeningDate)}" />
          </div>
        </div>
      </div>

      <div class="config-section">
        <div class="config-section-title">Prize Descriptions</div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="cfg-prize1">Best Picture Prize</label>
            <input class="form-input" id="cfg-prize1" value="${esc(cfg.prizeBestPicture||'')}" placeholder="e.g. ₹5,000 + Trophy" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-prize2">Best Director Prize</label>
            <input class="form-input" id="cfg-prize2" value="${esc(cfg.prizeBestDirector||'')}" placeholder="e.g. ₹2,500" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cfg-prize3">Audience Choice Prize</label>
            <input class="form-input" id="cfg-prize3" value="${esc(cfg.prizeAudience||'')}" placeholder="e.g. ₹1,500" />
          </div>
        </div>
      </div>

      <div class="save-bar">
        <button type="submit" class="btn" id="save-config-btn">Save Changes</button>
        <span class="save-status" id="save-status"></span>
      </div>
    </form>
  `

  document.getElementById('config-form').addEventListener('submit', async e => {
    e.preventDefault()
    const btn = document.getElementById('save-config-btn')
    const status = document.getElementById('save-status')
    btn.disabled = true; btn.textContent = 'Saving…'

    const data = {
      schoolName:        document.getElementById('cfg-school').value.trim(),
      department:        document.getElementById('cfg-dept').value.trim(),
      contactEmail:      document.getElementById('cfg-email').value.trim(),
      website:           document.getElementById('cfg-website').value.trim(),
      theme:             document.getElementById('cfg-theme').value.trim(),
      openDate:          document.getElementById('cfg-open').value || null,
      deadlineDate:      document.getElementById('cfg-deadline').value || null,
      finalistsDate:     document.getElementById('cfg-finalists').value || null,
      screeningDate:     document.getElementById('cfg-screening').value || null,
      prizeBestPicture:  document.getElementById('cfg-prize1').value.trim(),
      prizeBestDirector: document.getElementById('cfg-prize2').value.trim(),
      prizeAudience:     document.getElementById('cfg-prize3').value.trim(),
      updatedAt:         serverTimestamp(),
    }

    try {
      await setDoc(doc(db, 'config', 'contest'), data, { merge: true })
      showToast('Settings saved! ✓', 'success')
      status.textContent = '✓ Saved'; status.className = 'save-status saved'
      setTimeout(() => { if (status) { status.textContent = ''; status.className = 'save-status' } }, 3000)
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error')
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes'
    }
  })
}

/* ================================================================
   TEAM REGISTRATIONS TAB
================================================================ */
function renderTeamRegistrationsTab(main) {
  if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }

  main.innerHTML = `
    <div class="admin-header">
      <h2>Team Registrations</h2>
      <p>View registered teams, leaders, reg numbers, WhatsApp numbers, and submission timestamps.</p>
    </div>
    <div class="stats-bar">
      <div class="stat-box"><div class="stat-label">Total Teams</div><div class="stat-value" id="st-team-total">—</div></div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
      <input class="form-input" id="search-team" placeholder="Search team ID, name, leader, phone..."
        style="max-width:300px;padding:9px 14px;font-size:13px;" />
      <button class="btn btn-outline btn-sm" id="download-teams-csv" type="button">
        Download CSV
      </button>
    </div>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Team ID / Name</th>
            <th>Leader &amp; Reg No</th>
            <th>Contact / WhatsApp</th>
            <th>Registered Timestamp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="team-tbody">${skeletonRows(6)}</tbody>
      </table>
    </div>
  `

  let allTeams = []

  const q = query(collection(db, 'teamRegistrations'), orderBy('createdAt', 'desc'))
  unsubscribeTeams = onSnapshot(q, snapshot => {
    const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    allTeams = raw.filter(t => t.status !== 'bin')
    setText('st-team-total', allTeams.length)
    const badge = document.getElementById('teams-badge')
    if (badge) badge.textContent = allTeams.length
    renderTeamRows(filterTeams(allTeams))
  }, err => showToast('Could not load team registrations: ' + err.message, 'error'))

  const doFilter = debounce(() => renderTeamRows(filterTeams(allTeams)), 300)
  document.getElementById('search-team')?.addEventListener('input', doFilter)
  document.getElementById('download-teams-csv')?.addEventListener('click', () => {
    downloadTeamsCsv(filterTeams(allTeams))
  })
}

function filterTeams(all) {
  const search = document.getElementById('search-team')?.value.toLowerCase() || ''
  if (!search) return all
  return all.filter(t =>
    t.registrationId?.toLowerCase().includes(search) ||
    t.teamName?.toLowerCase().includes(search) ||
    t.directorName?.toLowerCase().includes(search) ||
    t.directorRegistrationNumber?.toLowerCase().includes(search) ||
    t.contactEmail?.toLowerCase().includes(search) ||
    t.whatsappNumber?.toLowerCase().includes(search)
  )
}

function renderTeamRows(teams) {
  const tbody = document.getElementById('team-tbody')
  if (!tbody) return
  if (teams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--grey);font-family:'IBM Plex Mono',monospace;font-size:12px;">No team registrations found.</td></tr>`
    return
  }
  tbody.innerHTML = teams.map(t => `
    <tr>
      <td>
        <span class="sub-id-box">${esc(t.registrationId || t.id)}</span><br/>
        <strong>${esc(t.teamName)}</strong>
      </td>
      <td>
        <strong>${esc(t.directorName)}</strong><br/>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--amber);">${esc(t.directorRegistrationNumber || '—')}</span>
      </td>
      <td>
        <span style="font-size:12px;">✉️ ${esc(t.contactEmail)}</span><br/>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--paper-dim);">💬 ${esc(t.whatsappNumber || '—')}</span>
      </td>
      <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--paper-dim);">
        📅 ${formatDateTime(t.createdAt)}
      </td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" data-action="view-team" data-id="${t.id}">👁️ View Details</button>
          <button class="btn btn-sm btn-danger" data-action="bin-team" data-id="${t.id}">🗑 Move to Bin</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action
      const id = btn.dataset.id
      const team = teams.find(item => item.id === id)
      if (action === 'view-team' && team) {
        showDetailsModal('Team Registration Details', team, 'registration')
      } else if (action === 'bin-team') {
        handleBinTeam(id)
      }
    })
  })
}

async function handleBinTeam(id) {
  try {
    await updateDoc(doc(db, 'teamRegistrations', id), { status: 'bin' })
    showToast('Moved team registration to Bin.', 'success')
  } catch (err) { showToast('Error: ' + err.message, 'error') }
}

/* ================================================================
   SUBMISSIONS TAB
================================================================ */
function renderSubmissionsTab(main) {
  if (unsubscribeSubmissions) { unsubscribeSubmissions(); unsubscribeSubmissions = null }

  main.innerHTML = `
    <div class="admin-header">
      <h2>Submissions</h2>
      <p>Review all submitted films, timestamps, contacts, and WhatsApp info. Promote entries to Finalists.</p>
    </div>
    <div class="stats-bar">
      <div class="stat-box"><div class="stat-label">Total</div><div class="stat-value" id="st-total">—</div></div>
      <div class="stat-box"><div class="stat-label">Pending</div><div class="stat-value" id="st-pending">—</div></div>
      <div class="stat-box"><div class="stat-label">Finalists</div><div class="stat-value" id="st-finalist">—</div></div>
      <div class="stat-box"><div class="stat-label">Rejected</div><div class="stat-value" id="st-rejected">—</div></div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
      <input class="form-input" id="search-sub" placeholder="Search title, director, reg ID..."
        style="max-width:260px;padding:9px 14px;font-size:13px;" />
      <select class="form-select" id="filter-status" style="max-width:160px;padding:9px 14px;font-size:13px;">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="finalist">Finalist</option>
        <option value="rejected">Rejected</option>
      </select>
      <button class="btn btn-outline btn-sm" id="download-submissions-csv" type="button">
        Download CSV
      </button>
    </div>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Film Title</th><th>Director &amp; Contacts</th><th>Synopsis</th>
            <th>Submitted Timestamp</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="sub-tbody">${skeletonRows(6)}</tbody>
      </table>
    </div>
  `

  let allSubmissions = []

  const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'))
  unsubscribeSubmissions = onSnapshot(q, snapshot => {
    const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    allSubmissions = raw.filter(s => s.status !== 'bin')
    updateStats(allSubmissions)
    renderSubmissionRows(filterSubs(allSubmissions))
  }, err => showToast('Could not load submissions: ' + err.message, 'error'))

  const doFilter = debounce(() => renderSubmissionRows(filterSubs(allSubmissions)), 300)
  document.getElementById('search-sub')?.addEventListener('input', doFilter)
  document.getElementById('filter-status')?.addEventListener('change', doFilter)
  document.getElementById('download-submissions-csv')?.addEventListener('click', () => {
    const rows = filterSubs(allSubmissions)
    downloadSubmissionsCsv(rows)
  })
}

function filterSubs(all) {
  const search = document.getElementById('search-sub')?.value.toLowerCase() || ''
  const status = document.getElementById('filter-status')?.value || ''
  return all.filter(s =>
    (!search || s.filmTitle?.toLowerCase().includes(search) || s.directorName?.toLowerCase().includes(search) || s.teamRegistrationId?.toLowerCase().includes(search)) &&
    (!status || s.status === status)
  )
}

function updateStats(subs) {
  const c = { pending:0, finalist:0, rejected:0 }
  subs.forEach(s => { if (c[s.status] !== undefined) c[s.status]++ })
  setText('st-total',    subs.length)
  setText('st-pending',  c.pending)
  setText('st-finalist', c.finalist)
  setText('st-rejected', c.rejected)
  const badge = document.getElementById('sub-badge')
  if (badge) badge.textContent = subs.length
}

function renderSubmissionRows(submissions) {
  const tbody = document.getElementById('sub-tbody')
  if (!tbody) return
  if (submissions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--grey);font-family:'IBM Plex Mono',monospace;font-size:12px;">No submissions found.</td></tr>`
    return
  }
  tbody.innerHTML = submissions.map(s => `
    <tr>
      <td>
        <strong>${esc(s.filmTitle)}</strong><br/>
        <a href="${esc(s.filmLink)}" target="_blank" rel="noopener"
          style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--amber);letter-spacing:.5px;">
          View Film ↗
        </a>
      </td>
      <td>
        <strong>${esc(s.directorName)}</strong><br/>
        <span style="font-size:11px;color:var(--paper-dim);">✉️ ${esc(s.contactEmail)}</span><br/>
        ${s.whatsappNumber ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--amber);">💬 ${esc(s.whatsappNumber)}</span>` : ''}
      </td>
      <td style="max-width:200px;">
        <span style="font-size:12px;color:var(--paper-dim);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${esc(s.synopsis || s.logline || '—')}
        </span>
      </td>
      <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--paper-dim);">
        📅 ${formatDateTime(s.createdAt)}
      </td>
      <td><span class="status-badge status-${s.status||'pending'}">${s.status||'pending'}</span></td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" data-action="view-sub" data-id="${s.id}">👁️ View Details</button>
          ${s.status !== 'finalist' ? `<button class="btn btn-sm" data-action="promote" data-id="${s.id}" data-title="${esc(s.filmTitle)}">★ Finalist</button>` : ''}
          ${s.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" data-action="reject" data-id="${s.id}">✕ Reject</button>`
            : `<button class="btn btn-sm btn-outline" data-action="restore" data-id="${s.id}">↩ Restore</button>`}
          <button class="btn btn-sm btn-danger" data-action="bin" data-id="${s.id}">🗑 Move to Bin</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action
      const id = btn.dataset.id
      const sub = submissions.find(item => item.id === id)
      if (action === 'view-sub' && sub) {
        showDetailsModal('Video Submission Details', sub, 'submission')
      } else {
        handleSubAction(action, id, btn.dataset.title)
      }
    })
  })
}

async function handleSubAction(action, id, filmTitle) {
  const subRef = doc(db, 'submissions', id)

  if (action === 'promote') {
    if (!confirm(`Promote "${filmTitle}" to Finalists?`)) return
    try {
      const snap = await getDoc(subRef)
      if (!snap.exists()) { showToast('Not found.', 'error'); return }
      const d = snap.data()
      await addDoc(collection(db, 'finalists'), {
        filmTitle: d.filmTitle, directorName: d.directorName,
        synopsis: d.synopsis || d.logline || '',
        filmLink: d.filmLink, teamMembers: d.teamMembers || '',
        contactEmail: d.contactEmail, submissionId: id,
        votes: 0, addedAt: serverTimestamp(),
      })
      await updateDoc(subRef, { status: 'finalist' })
      showToast(`"${filmTitle}" promoted! 🏆`, 'success')
    } catch (err) { showToast('Error: ' + err.message, 'error') }
  }
  else if (action === 'reject') {
    try { await updateDoc(subRef, { status: 'rejected' }); showToast('Rejected.') }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }
  else if (action === 'restore') {
    try { await updateDoc(subRef, { status: 'pending' }); showToast('Restored to pending.') }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }
  else if (action === 'bin') {
    try { await updateDoc(subRef, { status: 'bin' }); showToast('Moved submission to Bin.') }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }
}

/* ================================================================
   RECYCLE BIN TAB
================================================================ */
function renderBinTab(main) {
  if (unsubscribeSubmissions) { unsubscribeSubmissions(); unsubscribeSubmissions = null }
  if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
  if (unsubscribeBinSubs) { unsubscribeBinSubs(); unsubscribeBinSubs = null }
  if (unsubscribeBinTeams) { unsubscribeBinTeams(); unsubscribeBinTeams = null }

  main.innerHTML = `
    <div class="admin-header">
      <h2>Recycle Bin</h2>
      <p>Deleted submissions and team registrations. View details, restore, or permanently delete them.</p>
    </div>

    <div style="margin-bottom:28px;">
      <div id="bin-subs-section" style="margin-bottom:32px;">
        <h3 style="font-size:16px;margin-bottom:12px;color:var(--amber);">Deleted Submissions</h3>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr><th>Film Title</th><th>Director</th><th>Email</th><th>Actions</th></tr>
            </thead>
            <tbody id="bin-subs-tbody">${skeletonRows(3)}</tbody>
          </table>
        </div>
      </div>

      <div id="bin-teams-section">
        <h3 style="font-size:16px;margin-bottom:12px;color:var(--amber);">Deleted Team Registrations</h3>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr><th>Team ID</th><th>Team Name</th><th>Leader Name</th><th>Email</th><th>Actions</th></tr>
            </thead>
            <tbody id="bin-teams-tbody">${skeletonRows(3)}</tbody>
          </table>
        </div>
      </div>
    </div>
  `

  const qSubs = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'))
  unsubscribeBinSubs = onSnapshot(qSubs, snapshot => {
    const deletedSubs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.status === 'bin')
    renderBinSubRows(deletedSubs)
    updateBinBadge()
  }, err => showToast('Error loading bin submissions: ' + err.message, 'error'))

  const qTeams = query(collection(db, 'teamRegistrations'), orderBy('createdAt', 'desc'))
  unsubscribeBinTeams = onSnapshot(qTeams, snapshot => {
    const deletedTeams = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status === 'bin')
    renderBinTeamRows(deletedTeams)
    updateBinBadge()
  }, err => showToast('Error loading bin teams: ' + err.message, 'error'))
}

async function updateBinBadge() {
  try {
    const [subSnap, teamSnap] = await Promise.all([
      getDocs(query(collection(db, 'submissions'))),
      getDocs(query(collection(db, 'teamRegistrations')))
    ])
    const countSubBin = subSnap.docs.filter(d => d.data().status === 'bin').length
    const countTeamBin = teamSnap.docs.filter(d => d.data().status === 'bin').length
    const badge = document.getElementById('bin-badge')
    if (badge) badge.textContent = countSubBin + countTeamBin
  } catch (_) {}
}

function renderBinSubRows(items) {
  const tbody = document.getElementById('bin-subs-tbody')
  if (!tbody) return
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--grey);font-family:'IBM Plex Mono',monospace;font-size:12px;">No deleted submissions.</td></tr>`
    return
  }
  tbody.innerHTML = items.map(s => `
    <tr>
      <td><strong>${esc(s.filmTitle)}</strong></td>
      <td>${esc(s.directorName)}</td>
      <td>${esc(s.contactEmail)}</td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" data-view-bin-sub="${s.id}">👁️ View Details</button>
          <button class="btn btn-sm btn-outline" data-restore-sub="${s.id}">Restore</button>
          <button class="btn btn-sm btn-danger" data-perm-del-sub="${s.id}" data-title="${esc(s.filmTitle)}">Delete Permanently</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-view-bin-sub]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = items.find(i => i.id === btn.dataset.viewBinSub)
      if (sub) showDetailsModal('Bin Submission Details', sub, 'submission')
    })
  })

  tbody.querySelectorAll('[data-restore-sub]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await updateDoc(doc(db, 'submissions', btn.dataset.restoreSub), { status: 'pending' })
        showToast('Submission restored to Submissions.', 'success')
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  })
  tbody.querySelectorAll('[data-perm-del-sub]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Permanently delete "${btn.dataset.title}"? This cannot be undone.`)) return
      try {
        await deleteDoc(doc(db, 'submissions', btn.dataset.permDelSub))
        showToast('Submission permanently erased.', 'success')
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  })
}

function renderBinTeamRows(items) {
  const tbody = document.getElementById('bin-teams-tbody')
  if (!tbody) return
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--grey);font-family:'IBM Plex Mono',monospace;font-size:12px;">No deleted teams.</td></tr>`
    return
  }
  tbody.innerHTML = items.map(t => `
    <tr>
      <td><span class="sub-id-box" style="font-size:11px;">${esc(t.registrationId || t.id)}</span></td>
      <td><strong>${esc(t.teamName)}</strong></td>
      <td>${esc(t.directorName)}</td>
      <td>${esc(t.contactEmail)}</td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" data-view-bin-team="${t.id}">👁️ View Details</button>
          <button class="btn btn-sm btn-outline" data-restore-team="${t.id}">Restore</button>
          <button class="btn btn-sm btn-danger" data-perm-del-team="${t.id}" data-name="${esc(t.teamName)}">Delete Permanently</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-view-bin-team]').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = items.find(i => i.id === btn.dataset.viewBinTeam)
      if (team) showDetailsModal('Bin Team Registration Details', team, 'registration')
    })
  })

  tbody.querySelectorAll('[data-restore-team]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await updateDoc(doc(db, 'teamRegistrations', btn.dataset.restoreTeam), { status: 'registered' })
        showToast('Team registration restored.', 'success')
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  })
  tbody.querySelectorAll('[data-perm-del-team]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Permanently delete team "${btn.dataset.name}"? This cannot be undone.`)) return
      try {
        await deleteDoc(doc(db, 'teamRegistrations', btn.dataset.permDelTeam))
        showToast('Team permanently erased.', 'success')
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  })
}

/* ================================================================
   VIEW DETAILS MODAL ("VIEW BIN / VIEW DETAIL PAGE")
================================================================ */
function showDetailsModal(title, item, type = 'submission') {
  document.getElementById('details-modal-overlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'details-modal-overlay'
  overlay.className = 'modal-overlay'
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;'

  overlay.innerHTML = `
    <div style="background:var(--bg-deep);border:1px solid var(--line);max-width:620px;width:100%;max-height:90vh;overflow-y:auto;padding:32px;position:relative;box-shadow:0 10px 40px rgba(0,0,0,0.6);">
      <button id="close-modal-btn" style="position:absolute;top:16px;right:20px;background:none;border:none;color:var(--paper-dim);font-size:24px;cursor:pointer;">✕</button>

      <div style="margin-bottom:20px;border-bottom:1px solid var(--line);padding-bottom:14px;">
        <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--amber);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">${esc(title)}</p>
        <h2 style="font-size:24px;color:var(--paper);margin:0;">${esc(item.teamName || item.filmTitle || 'Details')}</h2>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;font-family:'IBM Plex Mono',monospace;font-size:13px;line-height:1.6;">
        ${item.registrationId || item.teamRegistrationId ? `
          <div><strong style="color:var(--paper-dim);">Team Registration ID:</strong> <span class="sub-id-box">${esc(item.registrationId || item.teamRegistrationId)}</span></div>
        ` : ''}

        ${item.id ? `
          <div><strong style="color:var(--paper-dim);">Record ID:</strong> <span style="color:var(--paper);">${esc(item.id)}</span></div>
        ` : ''}

        <div><strong style="color:var(--paper-dim);">Team Name:</strong> <span style="color:var(--paper);font-weight:600;">${esc(item.teamName || '—')}</span></div>
        <div><strong style="color:var(--paper-dim);">Director / Team Leader:</strong> <span style="color:var(--paper);">${esc(item.directorName || '—')}</span></div>

        ${item.directorRegistrationNumber ? `
          <div><strong style="color:var(--paper-dim);">Leader Registration No.:</strong> <span style="color:var(--amber);">${esc(item.directorRegistrationNumber)}</span></div>
        ` : ''}

        <div><strong style="color:var(--paper-dim);">Contact Email:</strong> <a href="mailto:${esc(item.contactEmail)}" style="color:var(--amber);">${esc(item.contactEmail || '—')}</a></div>

        <div><strong style="color:var(--paper-dim);">WhatsApp Number:</strong> ${item.whatsappNumber ? `<a href="https://wa.me/${esc(item.whatsappNumber.replace(/\D/g, ''))}" target="_blank" rel="noopener" style="color:#25D366;">💬 ${esc(item.whatsappNumber)} ↗</a>` : '—'}</div>

        ${item.teamMembers ? `
          <div style="background:var(--bg-alt);padding:14px;border:1px solid var(--line);margin-top:6px;">
            <strong style="color:var(--paper-dim);display:block;margin-bottom:6px;">Team Members:</strong>
            <pre style="margin:0;font-family:inherit;white-space:pre-wrap;color:var(--paper);font-size:12px;">${esc(item.teamMembers)}</pre>
          </div>
        ` : ''}

        ${type === 'submission' ? `
          <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:8px;">
            <strong style="color:var(--amber);display:block;margin-bottom:6px;">Film Details:</strong>
            <div style="margin-bottom:6px;"><strong style="color:var(--paper-dim);">Film Title:</strong> <span style="color:var(--paper);font-size:15px;font-weight:700;">"${esc(item.filmTitle)}"</span></div>
            <div style="margin-bottom:6px;"><strong style="color:var(--paper-dim);">Film Link:</strong> <a href="${esc(item.filmLink)}" target="_blank" rel="noopener" style="color:var(--amber);">View Film Link ↗</a></div>
            <div><strong style="color:var(--paper-dim);">Synopsis:</strong></div>
            <p style="background:var(--bg-alt);padding:12px;border:1px solid var(--line);color:var(--paper);font-size:12px;margin-top:4px;line-height:1.5;">${esc(item.synopsis || item.logline || '—')}</p>
          </div>
        ` : ''}

        <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
          <div><strong style="color:var(--paper-dim);">Status:</strong> <span class="status-badge status-${item.status||'registered'}">${item.status||'registered'}</span></div>
          <div><strong style="color:var(--paper-dim);">Timestamp:</strong> <span style="color:var(--amber);">${formatDateTime(item.createdAt)}</span></div>
        </div>
      </div>

      <div style="margin-top:24px;text-align:right;">
        <button class="btn" id="modal-close-bottom-btn">Close</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const closeFn = () => overlay.remove()
  document.getElementById('close-modal-btn')?.addEventListener('click', closeFn)
  document.getElementById('modal-close-bottom-btn')?.addEventListener('click', closeFn)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn() })
}

/* ================================================================
   FINALISTS TAB
================================================================ */
async function renderFinalistsTab(main) {
  main.innerHTML = `
    <div class="admin-header"><h2>Finalists</h2><p>Manage the public finalists list.</p></div>
    <div class="loader-wrap"><div class="loader"></div></div>
  `
  try {
    const snap = await getDocs(query(collection(db, 'finalists'), orderBy('votes', 'desc')))
    const finalists = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const loader = main.querySelector('.loader-wrap')

    if (finalists.length === 0) {
      loader.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <p class="empty-title">No Finalists Yet</p>
          <p class="empty-sub">Promote submissions from the Submissions tab.</p>
        </div>`
      return
    }

    loader.innerHTML = `
      <div style="overflow-x:auto;width:100%;">
        <table class="data-table">
          <thead>
            <tr><th>Film</th><th>Director</th><th>Genre</th><th>Votes</th><th>Link</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${finalists.map(f => `
              <tr>
                <td><strong>${esc(f.filmTitle)}</strong></td>
                <td>${esc(f.directorName)}</td>
                <td>${esc(f.genre)}</td>
                <td style="color:var(--amber);font-family:'IBM Plex Mono',monospace;font-weight:600;">${f.votes||0}</td>
                <td><a href="${esc(f.filmLink)}" target="_blank" rel="noopener"
                  style="font-family:'IBM Plex Mono',monospace;font-size:11px;">View ↗</a></td>
                <td>
                  <button class="btn btn-sm btn-danger" data-fin-id="${f.id}" data-fin-title="${esc(f.filmTitle)}">Remove</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`

    loader.querySelectorAll('[data-fin-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remove "${btn.dataset.finTitle}" from finalists?`)) return
        try {
          await deleteDoc(doc(db, 'finalists', btn.dataset.finId))
          showToast('Removed.'); renderFinalistsTab(main)
        } catch (err) { showToast('Error: ' + err.message, 'error') }
      })
    })
  } catch (err) {
    main.querySelector('.loader-wrap').innerHTML =
      `<p style="color:var(--red);font-family:'IBM Plex Mono',monospace;">Error: ${err.message}</p>`
  }
}

/* ================================================================
   VOTES TAB
================================================================ */
async function renderVotesTab(main) {
  main.innerHTML = `
    <div class="admin-header"><h2>Votes</h2><p>Live audience vote tally.</p></div>
    <div class="loader-wrap"><div class="loader"></div></div>
  `
  try {
    const [finSnap, voteSnap] = await Promise.all([
      getDocs(query(collection(db, 'finalists'), orderBy('votes', 'desc'))),
      getDocs(collection(db, 'votes'))
    ])
    const totalVotes = voteSnap.size
    const finalists = finSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    main.querySelector('.loader-wrap').innerHTML = `
      <div class="stat-box" style="display:inline-block;min-width:160px;margin-bottom:28px;">
        <div class="stat-label">Total Votes Cast</div>
        <div class="stat-value">${totalVotes}</div>
      </div>
      ${finalists.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🗳️</div>
          <p class="empty-title">No Votes Yet</p>
          <p class="empty-sub">Votes appear once finalists are announced.</p>
        </div>` :
        `<div style="display:flex;flex-direction:column;gap:14px;max-width:640px;">
          ${finalists.map((f, i) => {
            const pct = totalVotes > 0 ? Math.round(((f.votes||0)/totalVotes)*100) : 0
            return `
              <div style="background:var(--bg-alt);border:1px solid var(--line);padding:18px 20px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                  <div>
                    <strong style="font-size:14px;">${esc(f.filmTitle)}</strong>
                    <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--grey);margin-left:10px;">${esc(f.directorName)}</span>
                  </div>
                  <span style="font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--amber);font-weight:600;">
                    ${f.votes||0} · ${pct}%
                  </span>
                </div>
                <div style="height:6px;background:var(--line);border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${i===0?'var(--amber)':'var(--red)'};border-radius:3px;"></div>
                </div>
              </div>`
          }).join('')}
        </div>`
      }
      <div style="margin-top:24px;">
        <button class="btn btn-outline btn-sm" id="refresh-votes">↺ Refresh</button>
      </div>
    `
    document.getElementById('refresh-votes')?.addEventListener('click', () => renderVotesTab(main))
  } catch (err) {
    main.querySelector('.loader-wrap').innerHTML =
      `<p style="color:var(--red);font-family:'IBM Plex Mono',monospace;">Error: ${err.message}</p>`
  }
}

/* ── Helpers ─────────────────────────────────────────────────── */
function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
function setText(id, val) { const el=document.getElementById(id); if(el) el.textContent = val ?? '—' }
function toDateInput(val) {
  if (!val) return ''
  let d = val?.toDate?.() ?? new Date(val)
  return isNaN(d) ? '' : d.toISOString().slice(0,10)
}

function toIsoDateTime(val) {
  if (!val) return ''
  const d = val?.toDate?.() ?? new Date(val)
  return isNaN(d) ? '' : d.toISOString()
}

function csvCell(value) {
  const str = String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

function downloadSubmissionsCsv(submissions) {
  const headers = [
    'submissionId',
    'teamRegistrationId',
    'teamName',
    'filmTitle',
    'directorName',
    'directorRegistrationNumber',
    'contactEmail',
    'whatsappNumber',
    'teamMembers',
    'synopsis',
    'filmLink',
    'status',
    'votes',
    'createdAt',
  ]

  const lines = [headers.map(csvCell).join(',')]
  submissions.forEach((s) => {
    const row = [
      s.id,
      s.teamRegistrationId || '',
      s.teamName || '',
      s.filmTitle || '',
      s.directorName || '',
      s.directorRegistrationNumber || '',
      s.contactEmail || '',
      s.whatsappNumber || '',
      s.teamMembers || '',
      s.synopsis || s.logline || '',
      s.filmLink || '',
      s.status || 'pending',
      s.votes ?? 0,
      toIsoDateTime(s.createdAt),
    ]
    lines.push(row.map(csvCell).join(','))
  })

  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.href = url
  link.download = `submissions-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  showToast(`Downloaded ${submissions.length} submissions as CSV.`, 'success')
}

function downloadTeamsCsv(registrations) {
  const headers = [
    'registrationId',
    'teamName',
    'directorName',
    'directorRegistrationNumber',
    'contactEmail',
    'whatsappNumber',
    'teamMembers',
    'status',
    'createdAt',
  ]

  const lines = [headers.map(csvCell).join(',')]
  registrations.forEach((r) => {
    const row = [
      r.registrationId || r.id,
      r.teamName || '',
      r.directorName || '',
      r.directorRegistrationNumber || '',
      r.contactEmail || '',
      r.whatsappNumber || '',
      r.teamMembers || '',
      r.status || 'registered',
      toIsoDateTime(r.createdAt),
    ]
    lines.push(row.map(csvCell).join(','))
  })

  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.href = url
  link.download = `team-registrations-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  showToast(`Downloaded ${registrations.length} team registrations as CSV.`, 'success')
}
