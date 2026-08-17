import { db, ADMIN_PIN } from '../firebase.js'
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, addDoc, serverTimestamp, getCountFromServer
} from 'firebase/firestore'
import { showToast, formatDate, skeletonRows, debounce } from '../utils.js'
import { renderNav } from '../components/nav.js'

const SESSION_KEY = '3mfc_admin_ok'
let currentAdminTab = 'submissions'
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
              <button type="button" id="toggle-admin-pin" aria-label="Toggle password visibility" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--paper-dim);cursor:pointer;font-size:12px;padding:4px;">Toggle</button>
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
    toggleBtn.textContent = isPassword ? 'Hide' : 'Show'
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
        <button class="admin-nav-item ${currentAdminTab==='submissions'?'active':''}" data-tab="submissions">
          Submissions
          <span id="sub-badge" style="margin-left:auto;font-size:10px;background:var(--amber-glow);color:var(--amber);padding:2px 7px;border-radius:20px;"></span>
        </button>
        <button class="admin-nav-item ${currentAdminTab==='team-registrations'?'active':''}" data-tab="team-registrations">
          Team Registrations
          <span id="teams-badge" style="margin-left:auto;font-size:10px;background:var(--amber-glow);color:var(--amber);padding:2px 7px;border-radius:20px;"></span>
        </button>
        <button class="admin-nav-item ${currentAdminTab==='bin'?'active':''}" data-tab="bin">
          Bin
          <span id="bin-badge" style="margin-left:auto;font-size:10px;background:rgba(194,59,34,0.25);color:var(--red);padding:2px 7px;border-radius:20px;"></span>
        </button>
        <button class="admin-nav-item ${currentAdminTab==='finalists'?'active':''}" data-tab="finalists">
          Finalists
        </button>
        <button class="admin-nav-item ${currentAdminTab==='votes'?'active':''}" data-tab="votes">
          Votes
        </button>
        <div style="border-top:1px solid var(--line);margin-top:24px;padding-top:16px;">
          <button class="admin-nav-item" id="lock-btn" style="color:var(--grey);">
            Lock
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
  switchTab(currentAdminTab)
}

function switchTab(tab) {
  currentAdminTab = tab
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab)
  })
  const main = document.getElementById('admin-main')
  if (!main) return
  if (tab === 'submissions') renderSubmissionsTab(main)
  else if (tab === 'team-registrations') renderTeamRegistrationsTab(main)
  else if (tab === 'finalists')   renderFinalistsTab(main)
  else if (tab === 'votes')       renderVotesTab(main)
  else if (tab === 'bin')         renderBinTab(main)
  else renderSubmissionsTab(main)
}

async function loadSubmissionCount() {
  try {
    const snap = await getCountFromServer(collection(db, 'submissions'))
    const badge = document.getElementById('sub-badge')
    if (badge) badge.textContent = snap.data().count
  } catch (_) {}
  try {
    const snap = await getCountFromServer(collection(db, 'teamRegistrations'))
    const badge = document.getElementById('teams-badge')
    if (badge) badge.textContent = snap.data().count
  } catch (_) {}
}



/* ================================================================
   SUBMISSIONS TAB
================================================================ */
function renderSubmissionsTab(main) {
  if (unsubscribeSubmissions) { unsubscribeSubmissions(); unsubscribeSubmissions = null }

  main.innerHTML = `
    <div class="admin-header">
      <h2>Submissions</h2>
      <p>Review all submitted films. Promote entries to Finalists.</p>
    </div>
    <div class="stats-bar">
      <div class="stat-box"><div class="stat-label">Total</div><div class="stat-value" id="st-total">—</div></div>
      <div class="stat-box"><div class="stat-label">Pending</div><div class="stat-value" id="st-pending">—</div></div>
      <div class="stat-box"><div class="stat-label">Finalists</div><div class="stat-value" id="st-finalist">—</div></div>
      <div class="stat-box"><div class="stat-label">Rejected</div><div class="stat-value" id="st-rejected">—</div></div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
      <input class="form-input" id="search-sub" placeholder="Search title or director…"
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
            <th>Film Title</th><th>Director</th><th>Synopsis</th>
            <th>Submitted</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="sub-tbody">${skeletonRows(6)}</tbody>
      </table>
    </div>
  `

  let allSubmissions = []

  const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'))
  unsubscribeSubmissions = onSnapshot(q, snapshot => {
    allSubmissions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
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
    s.status !== 'bin' &&
    (!search || s.filmTitle?.toLowerCase().includes(search) || s.directorName?.toLowerCase().includes(search)) &&
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
          style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--grey);letter-spacing:.5px;">
          View Film ↗
        </a>
      </td>
      <td>${esc(s.directorName)}<br/><span style="font-size:11px;color:var(--grey);">${esc(s.contactEmail)}</span></td>
      <td style="max-width:200px;">
        <span style="font-size:12px;color:var(--paper-dim);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${esc(s.synopsis || s.logline || '—')}
        </span>
      </td>
      <td style="white-space:nowrap;">${formatDate(s.createdAt)}</td>
      <td><span class="status-badge status-${s.status||'pending'}">${s.status||'pending'}</span></td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${s.status !== 'finalist' ? `<button class="btn btn-sm" data-action="promote" data-id="${s.id}" data-title="${esc(s.filmTitle)}">Promote</button>` : ''}
          ${s.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" data-action="reject" data-id="${s.id}">Reject</button>`
            : `<button class="btn btn-sm btn-outline" data-action="restore" data-id="${s.id}">Restore</button>`}
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${s.id}" data-title="${esc(s.filmTitle)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleSubAction(btn.dataset.action, btn.dataset.id, btn.dataset.title))
  })
}

/* ================================================================
   TEAM REGISTRATIONS TAB
================================================================ */
function renderTeamRegistrationsTab(main) {
  if (unsubscribeSubmissions) { unsubscribeSubmissions(); unsubscribeSubmissions = null }
  if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }

  main.innerHTML = `
    <div class="admin-header">
      <h2>Team Registrations</h2>
      <p>View and manage all registered teams.</p>
    </div>
    <div class="stats-bar">
      <div class="stat-box"><div class="stat-label">Total Teams</div><div class="stat-value" id="st-teams-total">—</div></div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
      <input class="form-input" id="search-team" placeholder="Search team name, leader, ID or email…"
        style="max-width:320px;padding:9px 14px;font-size:13px;" />
      <button class="btn btn-outline btn-sm" id="download-teams-csv" type="button">
        Download CSV
      </button>
    </div>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Team ID</th><th>Team Name</th><th>Leader / Reg No</th><th>Email</th><th>Members</th><th>Registered</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="team-tbody">${skeletonRows(6)}</tbody>
      </table>
    </div>
  `

  let allTeams = []
  const q = query(collection(db, 'teamRegistrations'), orderBy('createdAt', 'desc'))
  unsubscribeTeams = onSnapshot(q, snapshot => {
    allTeams = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    setText('st-teams-total', allTeams.length)
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
  return all.filter(t =>
    t.status !== 'bin' &&
    (!search ||
      t.registrationId?.toLowerCase().includes(search) ||
      t.teamName?.toLowerCase().includes(search) ||
      t.directorName?.toLowerCase().includes(search) ||
      t.contactEmail?.toLowerCase().includes(search) ||
      t.directorRegistrationNumber?.toLowerCase().includes(search))
  )
}

function renderTeamRows(teams) {
  const tbody = document.getElementById('team-tbody')
  if (!tbody) return
  if (teams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--grey);font-family:'IBM Plex Mono',monospace;font-size:12px;">No team registrations found.</td></tr>`
    return
  }
  tbody.innerHTML = teams.map(t => `
    <tr>
      <td><span class="sub-id-box" style="font-size:11px;">${esc(t.registrationId || t.id)}</span></td>
      <td><strong>${esc(t.teamName)}</strong></td>
      <td>${esc(t.directorName)}<br/><span style="font-size:11px;color:var(--grey);">${esc(t.directorRegistrationNumber || '')}</span></td>
      <td><a href="mailto:${esc(t.contactEmail)}" style="font-size:12px;color:var(--amber);">${esc(t.contactEmail)}</a></td>
      <td style="max-width:200px;">
        <span style="font-size:11px;color:var(--paper-dim);line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">
          ${esc(t.teamMembers || 'N/A')}
        </span>
      </td>
      <td style="white-space:nowrap;">${formatDate(t.createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-danger" data-team-id="${t.id}" data-team-name="${esc(t.teamName)}">Delete</button>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-team-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.teamId
      const name = btn.dataset.teamName
      if (!confirm(`Move registration for team "${name}" (${id}) to Bin?`)) return
      try {
        await updateDoc(doc(db, 'teamRegistrations', id), { status: 'bin', deletedAt: serverTimestamp() })
        showToast(`Team "${name}" moved to Bin.`, 'success')
      } catch (err) {
        showToast('Error: ' + err.message, 'error')
      }
    })
  })
}

function downloadTeamsCsv(teams) {
  const headers = [
    'registrationId',
    'teamName',
    'directorName',
    'directorRegistrationNumber',
    'contactEmail',
    'teamMembers',
    'status',
    'createdAt',
  ]
  const lines = [headers.map(csvCell).join(',')]
  teams.forEach(t => {
    const row = [
      t.registrationId || t.id,
      t.teamName || '',
      t.directorName || '',
      t.directorRegistrationNumber || '',
      t.contactEmail || '',
      t.teamMembers || '',
      t.status || 'registered',
      toIsoDateTime(t.createdAt),
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
  showToast(`Downloaded ${teams.length} team registrations as CSV.`, 'success')
}

async function handleSubAction(action, id, filmTitle) {
  const subRef = doc(db, 'submissions', id)

  if (action === 'promote') {
    if (!confirm(`Promote "${filmTitle}" to Finalists?`)) return
    try {
      const snap = await getDoc(subRef)
      if (!snap.exists()) { showToast('Not found.', 'error'); return }
      const d = snap.data()
      // Copy synopsis too
      await addDoc(collection(db, 'finalists'), {
        filmTitle: d.filmTitle, directorName: d.directorName,
        synopsis: d.synopsis || d.logline || '',
        filmLink: d.filmLink, teamMembers: d.teamMembers || '',
        contactEmail: d.contactEmail, submissionId: id,
        votes: 0, addedAt: serverTimestamp(),
      })
      await updateDoc(subRef, { status: 'finalist' })
      showToast(`"${filmTitle}" promoted!`, 'success')
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
  else if (action === 'delete') {
    if (!confirm(`Move "${filmTitle}" to Bin?`)) return
    try { await updateDoc(subRef, { status: 'bin', deletedAt: serverTimestamp() }); showToast(`Moved "${filmTitle}" to Bin.`, 'success') }
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
      <p>Deleted submissions and team registrations. Restore or permanently delete them.</p>
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
  }, err => showToast('Error loading bin submissions: ' + err.message, 'error'))

  const qTeams = query(collection(db, 'teamRegistrations'), orderBy('createdAt', 'desc'))
  unsubscribeBinTeams = onSnapshot(qTeams, snapshot => {
    const deletedTeams = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status === 'bin')
    renderBinTeamRows(deletedTeams)
  }, err => showToast('Error loading bin teams: ' + err.message, 'error'))
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
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm btn-outline" data-restore-sub="${s.id}">Restore</button>
          <button class="btn btn-sm btn-danger" data-perm-del-sub="${s.id}" data-title="${esc(s.filmTitle)}">Delete Permanently</button>
        </div>
      </td>
    </tr>
  `).join('')

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
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm btn-outline" data-restore-team="${t.id}">Restore</button>
          <button class="btn btn-sm btn-danger" data-perm-del-team="${t.id}" data-name="${esc(t.teamName)}">Delete Permanently</button>
        </div>
      </td>
    </tr>
  `).join('')

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
        <button class="btn btn-outline btn-sm" id="refresh-votes">Refresh</button>
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
    'contactEmail',
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
      s.contactEmail || '',
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
