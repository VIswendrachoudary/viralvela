import { db } from '../firebase.js'
import {
  collection, getDocs, doc, addDoc, updateDoc,
  query, orderBy, onSnapshot, where, serverTimestamp, getDoc
} from 'firebase/firestore'
import { showToast, getVideoThumb, getEmbedUrl, truncate } from '../utils.js'
import { renderNav } from '../components/nav.js'

// Helper function to get or generate a unique persistent device ID
function getDeviceId() {
  const DEVICE_KEY = 'vv_device_fingerprint_id'
  let deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) deviceId = sessionStorage.getItem(DEVICE_KEY)
  if (!deviceId) {
    const match = document.cookie.match(new RegExp('(^| )' + DEVICE_KEY + '=([^;]+)'))
    if (match) deviceId = match[2]
  }
  if (!deviceId) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.fillText('VIRAL_VELA_DEVICE_FP', 2, 2)
    const fpStr = canvas.toDataURL() + navigator.userAgent + screen.width + 'x' + screen.height + (navigator.hardwareConcurrency || 4)
    let hash = 0
    for (let i = 0; i < fpStr.length; i++) {
      hash = ((hash << 5) - hash) + fpStr.charCodeAt(i)
      hash |= 0
    }
    deviceId = 'DEV_' + Math.abs(hash).toString(36) + '_' + Math.random().toString(36).substring(2, 9)
  }
  try { localStorage.setItem(DEVICE_KEY, deviceId) } catch (_) {}
  try { sessionStorage.setItem(DEVICE_KEY, deviceId) } catch (_) {}
  document.cookie = `${DEVICE_KEY}=${deviceId}; path=/; max-age=31536000; SameSite=Lax`
  return deviceId
}

function hasDeviceVoted() {
  const VOTE_KEY = 'vv_voted_film_id'
  return localStorage.getItem(VOTE_KEY) || sessionStorage.getItem(VOTE_KEY) || getCookie(VOTE_KEY)
}

function recordDeviceVote(filmId) {
  const VOTE_KEY = 'vv_voted_film_id'
  try { localStorage.setItem(VOTE_KEY, filmId) } catch (_) {}
  try { sessionStorage.setItem(VOTE_KEY, filmId) } catch (_) {}
  document.cookie = `${VOTE_KEY}=${filmId}; path=/; max-age=31536000; SameSite=Lax`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

export async function renderFinalists() {
  renderNav('finalists')
  const page = document.getElementById('page')

  page.innerHTML = `
    <div style="max-width:1100px; margin:0 auto; padding:0 20px;">

      <!-- Header banner -->
      <div class="poster fade-up" style="margin-bottom:0; max-width:100%;">
        <div class="sprocket"></div>
        <section style="text-align:center; padding:40px;">
          <p class="eyebrow">Screening Night</p>
          <h1 class="headline" style="font-size:clamp(32px,6vw,48px);">
            The <em>Finalists</em>
          </h1>
          <p class="subhead" id="screening-info">Loading screening details…</p>
        </section>
        <div class="sprocket"></div>
      </div>

      <!-- Voting notice -->
      <div id="voting-notice" style="
        font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:1px;
        color:var(--paper-dim); text-align:center;
        padding:16px 20px; border-bottom:1px solid var(--line);
        background:var(--bg-alt);
      ">
        Cast your vote for <strong style="color:var(--amber);">Audience Choice</strong> — one vote per person.
      </div>

      <!-- Films grid -->
      <div class="finalists-grid" id="finalists-grid">
        <div class="loader-wrap"><div class="loader"></div></div>
      </div>

    </div>

    <!-- Video Modal -->
    <div class="modal-overlay" id="video-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="Film preview">
      <div class="modal" style="max-width:720px; padding:0; overflow:hidden; background:#000; border:1px solid var(--amber);">
        <button class="modal-close" id="modal-close" aria-label="Close video" style="color:#fff; background:rgba(0,0,0,.7); font-size:18px; padding:6px 12px; border:1px solid rgba(255,255,255,0.2);">✕</button>
        <div id="modal-video-wrap" style="position:relative; padding-bottom:56.25%; height:0; background:#0a0a0a;">
          <iframe id="modal-iframe"
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
            allowfullscreen allow="autoplay; encrypted-media"></iframe>
        </div>
        <div id="modal-film-info" style="padding:18px 24px; background:var(--bg); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div>
            <p id="modal-title" style="font-family:'IBM Plex Sans',sans-serif; font-weight:700; font-size:18px; color:var(--paper); margin-bottom:4px;"></p>
            <p id="modal-meta" style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--grey); letter-spacing:1px;"></p>
          </div>
          <a id="modal-direct-link" href="" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="white-space:nowrap;">
            Open External Link ↗
          </a>
        </div>
      </div>
    </div>
  `

  // Load screening info
  try {
    const snap = await getDoc(doc(db, 'config', 'contest'))
    if (snap.exists()) {
      const cfg = snap.data()
      const screeningEl = document.getElementById('screening-info')
      if (cfg.screeningDate) {
        let d = cfg.screeningDate?.toDate?.() ?? new Date(cfg.screeningDate)
        const dateStr = isNaN(d) ? '' : d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
        if (screeningEl) screeningEl.textContent = `Screening Night — ${dateStr}`
      } else {
        if (screeningEl) screeningEl.textContent = 'Screening date TBA'
      }
    }
  } catch (_) {}



  // Real-time listener for finalists
  const q = collection(db, 'finalists')
  const unsubscribe = onSnapshot(q, snapshot => {
    const gridEl = document.getElementById('finalists-grid')
    if (!gridEl) { unsubscribe(); return }

    const films = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    // Sort in JS to prevent index errors
    films.sort((a, b) => (b.votes || 0) - (a.votes || 0))
    renderFilmsGrid(films)
  }, err => {
    console.error('Firestore finalists query error:', err)
    const gridEl = document.getElementById('finalists-grid')
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <p class="empty-title">No Finalists Yet</p>
          <p class="empty-sub">Finalists will be listed here once selected by the judges after 26 August 2026.</p>
        </div>
      `
    }
  })

  // Video modal
  const modal = document.getElementById('video-modal')
  const iframe = document.getElementById('modal-iframe')
  document.getElementById('modal-close').addEventListener('click', closeModal)
  modal.addEventListener('click', e => { if (e.target === modal) closeModal() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })

  function closeModal() {
    modal.style.display = 'none'
    iframe.src = ''
  }

  window._openFilmModal = function(filmLink, filmTitle, directorName, genre) {
    const embedUrl = getEmbedUrl(filmLink)
    iframe.src = embedUrl || filmLink
    document.getElementById('modal-title').textContent = filmTitle || 'Untitled Video'
    document.getElementById('modal-meta').textContent = `${directorName || 'Unknown Director'}${genre ? ' · ' + genre : ''}`
    
    const directLink = document.getElementById('modal-direct-link')
    if (directLink) directLink.href = filmLink
    
    modal.style.display = 'flex'
  }
}

function renderFilmsGrid(films) {
  const grid = document.getElementById('finalists-grid')
  if (!grid) return

  const votedFilmId = hasDeviceVoted()

  if (films.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <p class="empty-title">No Finalists Yet</p>
        <p class="empty-sub">Check back after the deadline — finalists will be announced here.</p>
        <div style="margin-top:28px;">
          <button class="btn btn-outline btn-sm" onclick="window.navigate('submit')">Submit Your Video →</button>
        </div>
      </div>
    `
    return
  }

  grid.innerHTML = films.map((film, idx) => {
    const thumb = getVideoThumb(film.filmLink)
    const isVoted = votedFilmId === film.id
    const teamStr = film.teamMembers ? ` + ${film.teamMembers.split(',').length} more` : ''

    return `
      <article class="film-card fade-up" style="animation-delay:${idx * 80}ms;" data-id="${film.id}">
        <div class="film-card-thumb"
          role="button" tabindex="0"
          aria-label="Watch ${film.filmTitle}"
          onclick="window._openFilmModal('${escStr(film.filmLink)}', '${escStr(film.filmTitle)}', '${escStr(film.directorName)}', '${escStr(film.genre)}')"
          onkeydown="if(event.key==='Enter') this.click()">
          ${thumb
            ? `<img src="${thumb}" alt="Thumbnail for ${film.filmTitle}" loading="lazy" />`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--grey);font-size:12px;">NO THUMBNAIL</div>`
          }
          <div class="film-card-play">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="white" stroke-opacity=".9" stroke-width="1.5"/>
              <path d="M20 16l14 8-14 8V16z" fill="white"/>
            </svg>
          </div>
        </div>
        <div class="film-card-body">
          <p class="film-card-meta">${film.genre || 'Short Video'} · ${film.grade || 'VIRAL VELA'}</p>
          <h2 class="film-card-title" title="${film.filmTitle}">${film.filmTitle}</h2>
          <p class="film-card-logline">${truncate(film.synopsis || film.logline, 100)}</p>
          <p style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--grey); margin-bottom:14px;">
            Dir. ${film.directorName}${teamStr}
          </p>
          <div class="vote-bar">
            <div class="vote-count">
              <strong>${film.votes || 0}</strong> vote${(film.votes || 0) === 1 ? '' : 's'}
            </div>
            <button
              class="btn-vote ${isVoted ? 'voted' : ''}"
              id="vote-btn-${film.id}"
              data-film-id="${film.id}"
              aria-label="Vote for ${film.filmTitle}"
              ${votedFilmId ? 'disabled' : ''}>
              ${isVoted ? 'Voted' : (votedFilmId ? 'Already Voted' : 'Vote')}
            </button>
          </div>
        </div>
      </article>
    `
  }).join('')

  // Wire vote buttons
  grid.querySelectorAll('.btn-vote:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const filmId = btn.dataset.filmId
      const deviceId = getDeviceId()

      // 1. Check local device cache
      if (hasDeviceVoted()) {
        showToast('Only 1 vote permitted per device!', 'error')
        return
      }

      btn.disabled = true
      btn.textContent = '…'

      try {
        // 2. Check Firestore for duplicate votes from this device ID
        const dupCheck = query(collection(db, 'votes'), where('deviceId', '==', deviceId))
        const dupSnap = await getDocs(dupCheck)
        
        if (!dupSnap.empty) {
          recordDeviceVote(dupSnap.docs[0].data().filmId || filmId)
          showToast('This device has already voted!', 'error')
          btn.textContent = 'Already Voted'
          btn.disabled = true
          return
        }

        // 3. Add vote document with unique deviceId
        await addDoc(collection(db, 'votes'), {
          filmId,
          deviceId,
          createdAt: serverTimestamp(),
        })

        // 4. Increment vote count on finalist document
        const filmRef = doc(db, 'finalists', filmId)
        const filmSnap = await getDoc(filmRef)
        if (filmSnap.exists()) {
          await updateDoc(filmRef, { votes: (filmSnap.data().votes || 0) + 1 })
        }

        recordDeviceVote(filmId)
        showToast('Vote cast! Thanks for voting.', 'success')
        
        // Disable all vote buttons on page
        grid.querySelectorAll('.btn-vote').forEach(b => {
          b.disabled = true
          if (b.dataset.filmId === filmId) {
            b.textContent = 'Voted'
            b.classList.add('voted')
          } else {
            b.textContent = 'Already Voted'
          }
        })
      } catch (err) {
        console.error(err)
        showToast('Could not cast vote. Try again.', 'error')
        btn.disabled = false
        btn.textContent = 'Vote'
      }
    })
  })
}

function escStr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')
}
