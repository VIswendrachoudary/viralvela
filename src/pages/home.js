import { db } from '../firebase.js'
import { doc, getDoc } from 'firebase/firestore'
import { formatDate } from '../utils.js'
import { renderNav } from '../components/nav.js'

const DEFAULT_CONFIG = {
  schoolName: 'Your School',
  department: 'Film Club',
  theme: 'Starting Over',
  contactEmail: 'films@yourschool.edu',
  website: 'yourschool.edu/filmchallenge',
  openDate: '', deadlineDate: '', finalistsDate: '', screeningDate: '',
  prizeBestPicture: '$500 + Trophy',
  prizeBestDirector: '$250',
  prizeAudience: '$150',
}

export async function renderHome() {
  renderNav('home')
  const page = document.getElementById('page')

  page.innerHTML = `

    <!-- ══ HERO ════════════════════════════════════════════════════ -->
    <section class="fp-hero" id="hero">
      <div class="fp-hero-bg"></div>

      <div class="fp-hero-inner">
        <div class="hero-stamp-wrap" data-reveal="up" data-delay="0" style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:10px;">
          <img src="/Untitled (1080 x 1080 px) (1920 x 1080 px).png" alt="VIRAL VELA Logo" style="height:120px; width:auto; filter:drop-shadow(0 2px 12px rgba(232,163,61,0.2));" />
          <span class="stamp">Entries Now Open</span>
        </div>

        <h1 class="fp-headline" data-reveal="up" data-delay="1">
          VIRAL <em style="color:var(--amber);">VELA</em>
        </h1>

        <p class="fp-subhead" data-reveal="up" data-delay="2">
          Short Video Competition for Creators & Filmmakers
        </p>

        <div class="countdown fp-countdown" aria-hidden="true" data-reveal="scale" data-delay="3">
          <div class="countdown-ring"></div>
          <div class="countdown-ticks">
            ${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('')}
          </div>
          <div class="countdown-face">
            <span class="countdown-num" id="cd-num">—</span>
            <span class="countdown-label" id="cd-label">DAYS LEFT</span>
          </div>
        </div>
        <p class="countdown-deadline" id="cd-deadline">Submission Deadline: 26TH AUG 2026 - 11:59 PM</p>
      </div>
    </section>

    <!-- ══ PITCH ═══════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <section class="fp-section fp-pitch-section">
      <div class="fp-section-inner" style="max-width:800px; text-align:center;">
        <p class="eyebrow" data-reveal="up">About The Event</p>
        <p class="fp-pitch-text" data-reveal="up" data-delay="1" style="font-size: clamp(16px, 2.2vw, 22px); line-height: 1.7;">
          <strong style="color:var(--amber);">Viral Vela</strong> is a short video competition that gives students a platform to showcase their creativity, storytelling, and filmmaking skills. Participants can create original 1–3 minute videos across any genre or theme. The event encourages innovative ideas, teamwork, and meaningful visual storytelling while providing aspiring filmmakers an opportunity to showcase their talent.
        </p>
        <button class="btn fp-pitch-btn" data-reveal="up" data-delay="2" id="pitch-cta">
          Submit Your Video →
        </button>
      </div>
    </section>

    <!-- ══ RULES ════════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <section class="fp-section fp-rules-section">
      <div class="fp-section-inner">
        <p class="eyebrow" data-reveal="up">Guidelines</p>
        <h2 class="fp-section-title" data-reveal="up" data-delay="1">Three Rules To Know</h2>

        <div class="fp-frames-grid">
          <div class="frame fp-frame" data-reveal="up" data-delay="1">
            <span class="frame-tag">Frame 01</span>
            <span class="frame-key">Format & Aspect Ratio</span>
            <span class="frame-value">Any Aspect Ratio (Only MP4) <em>Preferably 16:9</em></span>
          </div>
          <div class="frame fp-frame" data-reveal="up" data-delay="2">
            <span class="frame-tag">Frame 02</span>
            <span class="frame-key">Team Size</span>
            <span class="frame-value">At least 1 <em>(Solo or Team)</em></span>
          </div>
          <div class="frame fp-frame" data-reveal="up" data-delay="3">
            <span class="frame-tag">Frame 03</span>
            <span class="frame-key">Content & Category</span>
            <span class="frame-value fp-theme">Any Content <em>Dance, Singing, Short Film, Cover Songs & More</em></span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ DATES ════════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <section class="fp-section fp-dates-section">
      <div class="fp-section-inner" style="max-width:680px;">
        <p class="eyebrow" data-reveal="left">Key Dates</p>
        <h2 class="fp-section-title" data-reveal="left" data-delay="1">Event Timeline</h2>

        <div class="fp-timeline">
          <div class="fp-timeline-line"></div>

          <div class="fp-tl-item" data-reveal="left" data-delay="1">
            <div class="fp-tl-dot"></div>
            <div class="fp-tl-label">Entries Open</div>
            <div class="fp-tl-date" id="date-open">15 Aug 2026</div>
          </div>
          <div class="fp-tl-item" data-reveal="left" data-delay="2">
            <div class="fp-tl-dot fp-tl-dot-red"></div>
            <div class="fp-tl-label">Submission Deadline <span style="color:var(--grey);font-size:11px;">11:59 PM</span></div>
            <div class="fp-tl-date" id="date-deadline">26th Aug 2026</div>
          </div>
          <div class="fp-tl-item" data-reveal="left" data-delay="3">
            <div class="fp-tl-dot fp-tl-dot-amber"></div>
            <div class="fp-tl-label">Finalist Submission Screening 🎬</div>
            <div class="fp-tl-date" id="date-screening">29th Aug 2026</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ PRIZES ═══════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <section class="fp-section fp-prizes-section">
      <div class="fp-section-inner">
        <p class="eyebrow" style="text-align:center;" data-reveal="up">Awards & Recognition</p>
        <h2 class="fp-section-title" style="text-align:center;" data-reveal="up" data-delay="1">Prizes & Certificates</h2>

        <div class="fp-prize-grid" style="margin-bottom:28px;">
          <div class="fp-prize-card" data-reveal="up" data-delay="1">
            <div class="fp-prize-rank">01</div>
            <div class="fp-prize-icon">🥇</div>
            <div class="fp-prize-name">1st Place</div>
            <div class="fp-prize-value">Winner Award + Certificate</div>
          </div>
          <div class="fp-prize-card fp-prize-center" data-reveal="up" data-delay="2">
            <div class="fp-prize-rank">02</div>
            <div class="fp-prize-icon">🥈</div>
            <div class="fp-prize-name">2nd Place</div>
            <div class="fp-prize-value">Runner Up + Certificate</div>
          </div>
          <div class="fp-prize-card" data-reveal="up" data-delay="3">
            <div class="fp-prize-rank">03</div>
            <div class="fp-prize-icon">🥉</div>
            <div class="fp-prize-name">3rd Place</div>
            <div class="fp-prize-value">3rd Award + Certificate</div>
          </div>
        </div>
        <p style="text-align:center; font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--paper-dim); letter-spacing:1px;" data-reveal="up" data-delay="4">
          📜 <strong>All Remaining Participants:</strong> Official participation certificates will be awarded to everyone with a valid video submission.
        </p>
      </div>
    </section>

    <!-- ══ STEPS ════════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <section class="fp-section fp-steps-section">
      <div class="fp-section-inner" style="max-width:680px;">
        <p class="eyebrow" data-reveal="right">How To Enter</p>
        <h2 class="fp-section-title" data-reveal="right" data-delay="1">Four Steps To Submit</h2>

        <div class="fp-steps">
          <div class="fp-step" data-reveal="right" data-delay="1">
            <div class="fp-step-num">01</div>
            <div class="fp-step-body">
              <b>SCRIPTING / SHOOT / EDIT</b>
              <span>Create an original 1–3 minute video on any topic (short film, dance, cover song, singing, etc.).</span>
            </div>
          </div>
          <div class="fp-step" data-reveal="right" data-delay="2">
            <div class="fp-step-num">02</div>
            <div class="fp-step-body">
              <b>EXPORT IN MP4</b>
              <span>Upload your MP4 video file to Google Drive or YouTube.</span>
            </div>
          </div>
          <div class="fp-step" data-reveal="right" data-delay="3">
            <div class="fp-step-num">03</div>
            <div class="fp-step-body">
              <b>SUBMIT FORM</b>
              <span>Fill in the submission form with your video link before 26 August 2026.</span>
            </div>
          </div>
          <div class="fp-step" data-reveal="right" data-delay="4">
            <div class="fp-step-num">04</div>
            <div class="fp-step-body">
              <b>FINALIST SUBMISSION SCREENING</b>
              <span>Selected finalists will be featured during the official screening session.</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ CTA ══════════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <section class="fp-section fp-cta-section">
      <div class="fp-cta-bg"></div>
      <div class="fp-section-inner" style="text-align:center; position:relative; z-index:2;">
        <h2 class="fp-cta-headline" data-reveal="up">Ready?</h2>
        <p class="fp-cta-sub" data-reveal="up" data-delay="1">
          180 seconds to change everything.
        </p>
        <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-bottom:24px;">
          <button class="btn fp-cta-btn" id="main-cta" data-reveal="scale" data-delay="2" style="margin-bottom:0;">
            Submit Your Video →
          </button>
          <a href="https://chat.whatsapp.com/HngH8S6svckILPF7uvLDFd?s=cl&p=i&ilr=4" target="_blank" rel="noopener noreferrer" class="btn" data-reveal="scale" data-delay="3" style="background:#25D366; color:#000000; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
            <span>💬</span> Join WhatsApp Group
          </a>
        </div>
        <p class="contact" data-reveal="up" data-delay="4">
          Questions or Queries? <a href="#contact" onclick="window.navigate('contact')">Contact Event Organizers →</a>
        </p>
      </div>
    </section>

    <!-- ══ FOOTER ═══════════════════════════════════════════════════ -->
    <div class="sprocket"></div>
    <footer class="fp-footer">
      <span id="footer-main">Film Club · Presented by Film Dept · filmchallenge.edu</span>
      <span
        id="admin-egg"
        style="display:inline-block;margin-left:14px;opacity:0.12;cursor:default;user-select:none;font-size:10px;"
        aria-hidden="true">◉</span>
    </footer>

  `

  // Wire up CTAs
  document.getElementById('pitch-cta').addEventListener('click', () => window.navigate('submit'))
  document.getElementById('main-cta').addEventListener('click', () => window.navigate('submit'))

  // Hidden admin easter egg — 5 clicks on ◉
  let eggClicks = 0, eggTimer
  document.getElementById('admin-egg')?.addEventListener('click', () => {
    eggClicks++
    clearTimeout(eggTimer)
    eggTimer = setTimeout(() => { eggClicks = 0 }, 2000)
    if (eggClicks >= 5) { eggClicks = 0; showAdminPinModal() }
  })

  // Activate scroll reveal
  requestAnimationFrame(() => {
    window.observeRevealElements?.()
    // Hero items reveal immediately
    setTimeout(() => {
      document.querySelectorAll('#hero [data-reveal]').forEach(el => {
        el.classList.add('is-revealed')
      })
    }, 100)
  })

  // Load from Firestore
  try {
    const snap = await getDoc(doc(db, 'config', 'contest'))
    const cfg = snap.exists() ? { ...DEFAULT_CONFIG, ...snap.data() } : DEFAULT_CONFIG
    applyConfig(cfg)
  } catch (err) {
    console.warn('Firestore config load failed, using defaults.', err)
    applyConfig(DEFAULT_CONFIG)
  }

  startDeadlineCountdown()
}

function applyConfig(cfg) {
  if (cfg.openDate) setText('date-open', formatDate(cfg.openDate))
  if (cfg.deadlineDate) setText('date-deadline', formatDate(cfg.deadlineDate))
  if (cfg.screeningDate) setText('date-screening', formatDate(cfg.screeningDate))
  setText('footer-main', `VIRAL VELA · Presented by Sahiti & Team`)
  window._contestDeadline = cfg.deadlineDate
}

function setText(id, val) {
  const el = document.getElementById(id)
  if (el) el.textContent = val || '—'
}

function startDeadlineCountdown() {
  const cdNum = document.getElementById('cd-num')
  const cdLabel = document.getElementById('cd-label')
  const cdDeadline = document.getElementById('cd-deadline')

  function update() {
    // Exact deadline: 26TH AUG 2026 - 11:59:59 PM
    const targetDate = new Date('2026-08-26T23:59:59')
    const now = new Date()
    const diff = targetDate - now

    if (diff <= 0) {
      if (cdNum) cdNum.textContent = '0'
      if (cdLabel) cdLabel.textContent = 'TIME EXPIRED'
      if (cdDeadline) cdDeadline.textContent = 'Submissions Closed'
      return
    }

    const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hrs   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const secs  = Math.floor((diff % (1000 * 60)) / 1000)

    if (days > 0) {
      if (cdNum) cdNum.textContent = days
      if (cdLabel) cdLabel.textContent = days === 1 ? `DAY LEFT (${hrs}h ${mins}m)` : `DAYS LEFT (${hrs}h ${mins}m)`
      if (cdDeadline) cdDeadline.textContent = 'Submission Deadline: 26TH AUG 2026 - 11:59 PM'
    } else if (hrs > 0) {
      if (cdNum) cdNum.textContent = hrs
      if (cdLabel) cdLabel.textContent = `HOURS LEFT (${mins}m ${secs}s)`
      if (cdDeadline) cdDeadline.textContent = 'Submissions Close Tonight at 11:59 PM!'
    } else if (mins > 0) {
      if (cdNum) cdNum.textContent = mins
      if (cdLabel) cdLabel.textContent = `MINUTES LEFT (${secs}s)`
      if (cdDeadline) cdDeadline.textContent = 'Closing Very Soon!'
    } else {
      if (cdNum) cdNum.textContent = secs
      if (cdLabel) cdLabel.textContent = 'SECONDS LEFT!'
      if (cdDeadline) cdDeadline.textContent = 'Hurry! Submissions Closing!'
    }
  }

  update()
  const iv = setInterval(() => {
    if (!document.getElementById('cd-num')) { clearInterval(iv); return }
    update()
  }, 1000)
}

/* ── Admin PIN Modal ─────────────────────────────────────────────── */
function showAdminPinModal() {
  document.getElementById('admin-pin-overlay')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'admin-pin-overlay'
  overlay.className = 'modal-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')

  overlay.innerHTML = `
    <div class="admin-pin-modal" id="admin-pin-box">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:38px;margin-bottom:14px;">🎬</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:3px;
           color:var(--red);text-transform:uppercase;margin-bottom:8px;">Admin Portal</p>
        <h2 style="font-family:'Anton',sans-serif;font-size:24px;text-transform:uppercase;
           color:var(--paper);margin:0;">Enter PIN</h2>
      </div>
      <div class="pin-boxes" id="pin-boxes">
        ${Array.from({length:8},(_,i)=>`<div class="pin-box" data-idx="${i}"></div>`).join('')}
      </div>
      <input id="pin-real-input" type="password" inputmode="text"
        maxlength="8" autocomplete="off"
        style="position:absolute;opacity:0;width:1px;height:1px;pointer-events:none;"
        aria-label="PIN input" />
      <p class="pin-error" id="pin-error" style="display:none;">✕ &nbsp;Incorrect PIN</p>
      <button class="pin-cancel" id="pin-cancel">Cancel</button>
    </div>
  `
  document.body.appendChild(overlay)

  const input = document.getElementById('pin-real-input')
  const boxes = document.querySelectorAll('.pin-box')
  const errorEl = document.getElementById('pin-error')
  const pinBox = document.getElementById('admin-pin-box')

  requestAnimationFrame(() => input.focus())
  pinBox.addEventListener('click', () => input.focus())
  boxes[0]?.classList.add('active')

  function updateBoxes(val) {
    boxes.forEach((box, i) => {
      if (i < val.length) {
        box.textContent = '●'; box.classList.add('filled')
        box.classList.toggle('active', i === val.length - 1)
      } else {
        box.textContent = ''; box.classList.remove('filled','active')
        if (i === val.length) box.classList.add('active')
      }
    })
  }

  input.addEventListener('input', () => {
    errorEl.style.display = 'none'
    updateBoxes(input.value)
    if (input.value.length >= 8) setTimeout(checkPin, 100)
  })
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPin()
    if (e.key === 'Escape') closeModal()
  })

  function checkPin() {
    import('/src/firebase.js').then(({ ADMIN_PIN }) => {
      if (input.value === ADMIN_PIN) {
        pinBox.style.boxShadow = '0 0 0 2px #52d68a'
        boxes.forEach(b => { b.style.borderColor='#52d68a'; b.style.color='#52d68a' })
        setTimeout(() => {
          overlay.remove()
          sessionStorage.setItem('3mfc_admin_ok', 'true')
          window.navigate('admin')
        }, 380)
      } else {
        errorEl.style.display = 'block'
        pinBox.style.animation = 'none'
        requestAnimationFrame(() => { pinBox.style.animation = 'shake .35s ease' })
        boxes.forEach(b => { b.style.borderColor='var(--red)'; b.style.color='var(--red)' })
        setTimeout(() => {
          input.value = ''; updateBoxes('')
          boxes.forEach(b => { b.style.borderColor=''; b.style.color='' })
          input.focus()
        }, 600)
      }
    }).catch(() => { overlay.remove(); window.navigate('admin') })
  }

  function closeModal() { overlay.remove() }
  document.getElementById('pin-cancel').addEventListener('click', closeModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal() })
}
