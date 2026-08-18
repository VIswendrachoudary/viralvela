// Cute Film-Themed Custom Cursor & Animated Follower

export function initCustomCursor() {
  // Only enable custom cursor follower on devices with fine pointer (mouse/trackpad)
  if (!window.matchMedia('(pointer: fine)').matches) return

  const cursorDot = document.createElement('div')
  cursorDot.className = 'custom-cursor-dot'
  cursorDot.id = 'custom-cursor-dot'
  cursorDot.style.opacity = '0'
  cursorDot.style.visibility = 'hidden'

  const cursorRing = document.createElement('div')
  cursorRing.className = 'custom-cursor-ring'
  cursorRing.id = 'custom-cursor-ring'
  cursorRing.style.opacity = '0'
  cursorRing.style.visibility = 'hidden'
  cursorRing.innerHTML = `<span class="cursor-ring-sparkle">🎬</span>`

  document.body.appendChild(cursorDot)
  document.body.appendChild(cursorRing)

  let mouseX = -500
  let mouseY = -500
  let ringX = -500
  let ringY = -500
  let isHovered = false
  let initialized = false

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    
    if (!initialized) {
      initialized = true
      ringX = mouseX
      ringY = mouseY
      cursorDot.style.opacity = '1'
      cursorDot.style.visibility = 'visible'
      cursorRing.style.opacity = '1'
      cursorRing.style.visibility = 'visible'
    }

    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
  }, { passive: true })

  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0'
    cursorRing.style.opacity = '0'
  })

  document.addEventListener('mouseenter', () => {
    if (initialized) {
      cursorDot.style.opacity = '1'
      cursorRing.style.opacity = '1'
    }
  })

  // Smooth lerp loop for outer ring
  function render() {
    if (initialized) {
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
