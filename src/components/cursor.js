// Cute Film-Themed Custom Cursor & Animated Follower

export function initCustomCursor() {
  // Only enable custom cursor follower on devices with fine pointer (mouse/trackpad)
  if (!window.matchMedia('(pointer: fine)').matches) return

  const cursorDot = document.createElement('div')
  cursorDot.className = 'custom-cursor-dot'
  cursorDot.id = 'custom-cursor-dot'

  const cursorRing = document.createElement('div')
  cursorRing.className = 'custom-cursor-ring'
  cursorRing.id = 'custom-cursor-ring'
  cursorRing.innerHTML = `<span class="cursor-ring-sparkle">🎬</span>`

  document.body.appendChild(cursorDot)
  document.body.appendChild(cursorRing)

  let mouseX = null
  let mouseY = null
  let ringX = null
  let ringY = null
  let isHovered = false
  let initialized = false

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    
    if (!initialized) {
      initialized = true
      ringX = mouseX
      ringY = mouseY
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
      cursorDot.classList.add('visible')
      cursorRing.classList.add('visible')
    } else {
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
    }
  }, { passive: true })

  document.addEventListener('mouseleave', () => {
    cursorDot.classList.remove('visible')
    cursorRing.classList.remove('visible')
  })

  document.addEventListener('mouseenter', (e) => {
    if (initialized) {
      mouseX = e.clientX
      mouseY = e.clientY
      ringX = mouseX
      ringY = mouseY
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
      cursorDot.classList.add('visible')
      cursorRing.classList.add('visible')
    }
  })

  // Smooth lerp loop for outer ring
  function render() {
    if (initialized && mouseX !== null && mouseY !== null) {
      ringX += (mouseX - ringX) * 0.18
      ringY += (mouseY - ringY) * 0.18
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${isHovered ? 1.5 : 1})`
    }
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)

  // Detect interactive elements to expand cursor
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a, button, input, textarea, select, .btn, [role="button"], .interactive')
    if (target) {
      isHovered = true
      cursorRing.classList.add('is-hovering')
    }
  })

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('a, button, input, textarea, select, .btn, [role="button"], .interactive')
    if (target) {
      isHovered = false
      cursorRing.classList.remove('is-hovering')
    }
  })

  // Cute burst sparkle effect on click
  window.addEventListener('click', (e) => {
    createClickBurst(e.clientX, e.clientY)
  })
}

function createClickBurst(x, y) {
  const burst = document.createElement('div')
  burst.className = 'cursor-click-burst'
  burst.style.left = `${x}px`
  burst.style.top = `${y}px`
  
  // Cute film clapper burst icon
  burst.innerHTML = `<span class="burst-icon">🎬</span>`
  document.body.appendChild(burst)

  setTimeout(() => burst.remove(), 400)
}
