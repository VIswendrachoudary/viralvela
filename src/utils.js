// Toast notification component
export function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => {
    toast.style.animation = 'slide-in .25s ease-out reverse'
    toast.addEventListener('animationend', () => toast.remove())
  }, duration)
}

// Format a Firestore Timestamp or ISO string as a readable date
export function formatDate(val) {
  if (!val) return '—'
  let d
  if (val && typeof val.toDate === 'function') d = val.toDate()
  else d = new Date(val)
  if (isNaN(d)) return val
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Debounce
export function debounce(fn, delay) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

// Get YouTube/Drive thumbnail
export function getVideoThumb(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
  return null
}

// Get embeddable URL
export function getEmbedUrl(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
  
  // Google Drive conversion
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`

  return url
}

// Truncate string
export function truncate(str, len = 80) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len).trimEnd() + '…' : str
}

// Render loading skeleton rows
export function skeletonRows(n = 5) {
  return Array.from({ length: n }, (_, i) => `
    <tr>
      <td><div class="skeleton skeleton-text" style="width:${60 + i * 10}%; opacity:.6"></div></td>
      <td><div class="skeleton skeleton-text" style="width:50%; opacity:.6"></div></td>
      <td><div class="skeleton skeleton-text" style="width:40%; opacity:.6"></div></td>
      <td><div class="skeleton skeleton-text" style="width:60%; opacity:.6"></div></td>
      <td><div class="skeleton skeleton-text" style="width:50%; opacity:.6"></div></td>
    </tr>
  `).join('')
}
