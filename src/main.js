import './style.css'
import { renderNav } from './components/nav.js'
import { renderHome } from './pages/home.js'
import { renderSubmit } from './pages/submit.js'
import { renderTeamRegistration } from './pages/teamRegistration.js'
import { renderSubmitEntry } from './pages/submitEntry.js'
import { renderFinalists } from './pages/finalists.js'
import { renderAdmin } from './pages/admin.js'
import { renderContact } from './pages/contact.js'

// ── App shell with glowing dynamic side film strips & ticker marquee ────
document.getElementById('app').innerHTML = `
  <nav id="nav" role="banner"></nav>
  <div id="top-marquee-bar" class="crt-marquee-bar" role="region" aria-label="Ticker Announcements">
    <div class="marquee-track">
      <div class="marquee-group">
        <span>🚨 SCROLL DOWN FOR SUBMISSION LINK &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🗓️ FINAL DATE: 26-AUG &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🎬 3-MINUTE FILM CHALLENGE OPEN CALL &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</span>
        <span>🚨 SCROLL DOWN FOR SUBMISSION LINK &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🗓️ FINAL DATE: 26-AUG &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🎬 3-MINUTE FILM CHALLENGE OPEN CALL &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</span>
      </div>
      <div class="marquee-group" aria-hidden="true">
        <span>🚨 SCROLL DOWN FOR SUBMISSION LINK &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🗓️ FINAL DATE: 26-AUG &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🎬 3-MINUTE FILM CHALLENGE OPEN CALL &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</span>
        <span>🚨 SCROLL DOWN FOR SUBMISSION LINK &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🗓️ FINAL DATE: 26-AUG &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🎬 3-MINUTE FILM CHALLENGE OPEN CALL &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</span>
      </div>
    </div>
  </div>
  
  <!-- Left Side Film Strip with glowing level indicators -->
  <div class="film-strip film-strip-left" id="film-strip-left" aria-hidden="true">
    <div class="strip-level-indicator" id="strip-indicator-left"></div>
    <div class="strip-sprockets" id="sprockets-left"></div>
  </div>

  <!-- Right Side Film Strip with glowing level indicators -->
  <div class="film-strip film-strip-right" id="film-strip-right" aria-hidden="true">
    <div class="strip-level-indicator" id="strip-indicator-right"></div>
    <div class="strip-sprockets" id="sprockets-right"></div>
  </div>

  <div id="page" role="main"></div>
  <div id="toast-container"></div>
`

// Generate glowing sprocket dots for side strips & attach scroll listener
;(function initSideStrips() {
  const leftSprockets = document.getElementById('sprockets-left')
  const rightSprockets = document.getElementById('sprockets-right')
  const leftIndicator = document.getElementById('strip-indicator-left')
  const rightIndicator = document.getElementById('strip-indicator-right')
  
  if (!leftSprockets || !rightSprockets) return

  const numDots = Math.ceil(window.innerHeight / 32)
  let html = ''
  for (let i = 0; i < numDots; i++) {
    html += `<div class="sprocket-hole" data-dot-idx="${i}"></div>`
  }
  leftSprockets.innerHTML = html
  rightSprockets.innerHTML = html

  function updateScrollLevel() {
    const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const scrollPercent = Math.min(1, Math.max(0, window.scrollY / scrollMax))
    const indicatorHeight = scrollPercent * 100

    if (leftIndicator) leftIndicator.style.height = `${indicatorHeight}%`
    if (rightIndicator) rightIndicator.style.height = `${indicatorHeight}%`

    const activeIdx = Math.floor(scrollPercent * numDots)
    document.querySelectorAll('.sprocket-hole').forEach((hole, idx) => {
      if (idx <= activeIdx) {
        hole.classList.add('glow-active')
      } else {
        hole.classList.remove('glow-active')
      }
    })
  }

  window.addEventListener('scroll', updateScrollLevel, { passive: true })
  window.addEventListener('resize', () => {
    const newNum = Math.ceil(window.innerHeight / 32)
    let newHtml = ''
    for (let i = 0; i < newNum; i++) {
      newHtml += `<div class="sprocket-hole" data-dot-idx="${i}"></div>`
    }
    leftSprockets.innerHTML = newHtml
    rightSprockets.innerHTML = newHtml
    updateScrollLevel()
  })
  updateScrollLevel()
})()

// ══ CRT ANIMATED GRAIN ════════════════════════════════════════════
;(function createCRTGrain() {
  const canvas = document.createElement('canvas')
  canvas.id = 'tv-grain'
  document.getElementById('crt-bezel').appendChild(canvas)
  const ctx = canvas.getContext('2d')
  let W, H, rollY = -100, rollActive = false, rollTimer = 0

  function resize() {
    W = canvas.width = window.innerWidth
    H = canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const offscreen = document.createElement('canvas')
  const offCtx = offscreen.getContext('2d')

  function drawFrame() {
    const scale = 0.45
    const sw = Math.ceil(W * scale)
    const sh = Math.ceil(H * scale)

    if (offscreen.width !== sw || offscreen.height !== sh) {
      offscreen.width = sw; offscreen.height = sh
    }
    const img = offCtx.createImageData(sw, sh)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 220) | 0
      d[i] = v; d[i+1] = v; d[i+2] = v
      d[i+3] = Math.random() < 0.38 ? ((Math.random() * 50 + 6) | 0) : 0
    }
    offCtx.putImageData(img, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offscreen, 0, 0, W, H)

    // VHS roll bar
    rollTimer++
    if (!rollActive && rollTimer > 140 + Math.random() * 320) {
      rollActive = true; rollY = -50
      rollTimer = 0
    }
    if (rollActive) {
      const speed = 9 + Math.random() * 8
      ctx.fillStyle = `rgba(255,255,255,${0.018 + Math.random() * 0.022})`
      ctx.fillRect(0, rollY, W, 16 + Math.random() * 14)
      ctx.fillStyle = `rgba(0,255,200,0.012)`
      ctx.fillRect(0, rollY - 5, W, 8)
      ctx.fillStyle = `rgba(255,100,0,0.008)`
      ctx.fillRect(0, rollY + 16, W, 4)
      rollY += speed
      if (rollY > H + 60) rollActive = false
    }
  }

  setInterval(drawFrame, 50)
})()

// ══ SCROLL REVEAL OBSERVER ════════════════════════════════════════
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-revealed')
      scrollObserver.unobserve(e.target)
    }
  })
}, { threshold: 0.10, rootMargin: '0px 0px -30px 0px' })

window.observeRevealElements = () =>
  document.querySelectorAll('[data-reveal]').forEach(el => scrollObserver.observe(el))

// ══ ROUTER WITH CRT TRANSITIONS ══════════════════════════════════
const ROUTES = {
  home: renderHome, submit: renderSubmit,
  'team-registration': renderTeamRegistration,
  'submit-entry': renderSubmitEntry,
  finalists: renderFinalists, admin: renderAdmin,
  contact: renderContact,
}
let isTransitioning = false

async function navigate(page) {
  if (isTransitioning) return
  const route = ROUTES[page] || ROUTES.home
  const pageEl = document.getElementById('page')
  isTransitioning = true

  // Clean up hero scroll listener if navigating away
  if (typeof window._heroScrollCleanup === 'function') {
    window._heroScrollCleanup()
    window._heroScrollCleanup = null
  }

  // ── PHASE 1: CRT POWER OFF ──────────────────────────────────────
  // Squish content to a horizontal line, then black
  pageEl.classList.add('crt-off')
  await sleep(300)

  // ── PHASE 2: SWITCH CONTENT ────────────────────────────────────
  pageEl.classList.remove('crt-off')
  window.location.hash = page === 'home' ? '' : page
  window.scrollTo({ top: 0, behavior: 'instant' })
  route()

  // ── PHASE 3: CRT POWER ON ──────────────────────────────────────
  // Expand from a bright line to full screen
  void pageEl.offsetWidth // force reflow so animation restarts
  pageEl.classList.add('crt-on')
  await sleep(460)
  pageEl.classList.remove('crt-on')

  isTransitioning = false
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
window.navigate = navigate

// Disable automatic browser scroll restoration on refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

function resolveRoute() {
  // Always force scroll to top on initial page load/reload
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

  const hash = window.location.hash.replace('#', '').trim()
  const page = hash && ROUTES[hash] ? hash : 'home'
  const pageEl = document.getElementById('page')
  
  // CRT TV Cold Boot / Opening Effect
  pageEl.classList.add('crt-on')
  ROUTES[page]()

  // Ensure scroll is at top after rendering content
  requestAnimationFrame(() => {
    window.scrollTo(0, 0)
  })

  // Channel flash overlay on initial boot
  const bootFlash = document.createElement('div')
  bootFlash.className = 'crt-channel-flash'
  document.body.appendChild(bootFlash)
  setTimeout(() => bootFlash.remove(), 350)

  setTimeout(() => pageEl.classList.remove('crt-on'), 460)
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '').trim()
  const page = hash && ROUTES[hash] ? hash : 'home'
  if (!isTransitioning) ROUTES[page]()
})

resolveRoute()
