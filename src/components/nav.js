// Navigation — Admin is hidden from nav, accessible via footer
export function renderNav(currentPage) {
  const nav = document.getElementById('nav')
  nav.innerHTML = `
    <div class="nav-logo" id="nav-home" role="button" tabindex="0" aria-label="Go to homepage">
      <img src="/Untitled (1080 x 1080 px) (1920 x 1080 px).png" alt="VIRAL VELA Logo" class="nav-logo-img" style="height:48px; width:auto; border-radius:4px; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.6));" />
      <span>VIRAL <span class="logo-accent">VELA</span></span>
    </div>
    <button
      class="nav-menu-toggle"
      id="nav-menu-toggle"
      type="button"
      aria-label="Toggle navigation menu"
      aria-expanded="false"
      aria-controls="nav-links"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
    <nav class="nav-links" id="nav-links" role="navigation" aria-label="Main navigation">
      <button class="nav-link ${currentPage === 'home' ? 'active' : ''}" data-page="home" id="nav-btn-home">Home</button>
      <button class="nav-link ${currentPage === 'finalists' ? 'active' : ''}" data-page="finalists" id="nav-btn-finalists">Finalists</button>
      <button class="nav-link ${currentPage === 'contact' ? 'active' : ''}" data-page="contact" id="nav-btn-contact">Contact</button>
      <button class="nav-cta ${currentPage === 'team-registration' || currentPage === 'submit' ? 'nav-cta-active' : ''}" data-page="team-registration" id="nav-btn-register" aria-label="Register Now">
        <span class="cta-dot"></span> REGISTER NOW
      </button>
    </nav>
  `

  const menuToggle = document.getElementById('nav-menu-toggle')
  const closeMenu = () => {
    nav.classList.remove('nav-open')
    menuToggle?.setAttribute('aria-expanded', 'false')
  }

  menuToggle?.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open')
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
  })

  nav.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      closeMenu()
      window.navigate(el.dataset.page)
    })
  })
  document.getElementById('nav-home').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      closeMenu()
      window.navigate('home')
    }
  })
  document.getElementById('nav-home').addEventListener('click', () => {
    closeMenu()
    window.navigate('home')
  })

  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu()
  })
}
