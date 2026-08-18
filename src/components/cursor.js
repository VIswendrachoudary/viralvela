// Cute Film-Themed Custom Cursor

export function initCustomCursor() {
  // Remove any leftover cursor elements if present in DOM
  document.getElementById('custom-cursor-dot')?.remove()
  document.getElementById('custom-cursor-ring')?.remove()

  if (!window.matchMedia('(pointer: fine)').matches) return

  // Cute click sparkle burst effect on desktop
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
