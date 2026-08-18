import { db } from '../firebase.js'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { showToast } from '../utils.js'
import { renderNav } from '../components/nav.js'

let verifiedTeam = null
let fetchedTeam = null

export async function renderSubmitEntry() {
  renderNav('submit')
  const page = document.getElementById('page')
  verifiedTeam = null
  fetchedTeam = null

  let cfg = {}
  try {
    const snap = await getDoc(doc(db, 'config', 'contest'))
    if (snap.exists()) cfg = snap.data()
  } catch (err) {
    console.error('Failed to load contest config:', err)
  }

  const isPastDeadline = cfg.deadlineDate
    ? new Date(cfg.deadlineDate?.toDate?.() ?? cfg.deadlineDate) < new Date()
    : false

  page.innerHTML = `
    <div class="form-card fade-up">
      <div class="form-header">
        <p class="eyebrow">Step 2</p>
        <h1 class="section-title" style="font-size:32px;margin-bottom:10px;">Verify & Submit Video</h1>
      </div>

      ${isPastDeadline ? `
        <div style="padding:18px 20px;background:var(--red-dim);border-left:3px solid var(--red);">
          <p style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--paper);letter-spacing:.5px;">
            Submissions are now closed. The deadline has passed.
          </p>
        </div>
      ` : `
        <form id="verify-team-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="registration-id">Team Registration ID <span class="req">*</span></label>
            <input class="form-input upper-input" type="text" id="registration-id" name="registrationId" maxlength="8" required />
          </div>
          <p class="form-error" id="err-verify" style="margin-top:-6px;margin-bottom:14px;">Team ID not found.</p>
          <button type="submit" class="btn btn-outline" id="verify-team-btn">Get Team Details</button>
        </form>

        <div id="team-verified-box" class="team-summary" style="display:none;"></div>

        <form id="final-submit-form" novalidate>
          <div class="form-section-label" style="margin-top:18px;">Video Details</div>
          <div class="form-group">
            <label class="form-label" for="film-title">Video Title <span class="req">*</span></label>
            <input class="form-input" type="text" id="film-title" name="filmTitle" maxlength="80" required />
            <p class="form-error" id="err-title">Please enter your video title.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="synopsis">Short Synopsis / Description <span class="req">*</span></label>
            <textarea class="form-textarea" id="synopsis" name="synopsis" maxlength="250" rows="4" required></textarea>
            <p class="form-hint char-count"><span id="synopsis-count">0</span>/250</p>
            <p class="form-error" id="err-synopsis">Please write a short description (10–250 characters).</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="film-link">YouTube or Google Drive URL (MP4 Format) <span class="req">*</span></label>
            <input class="form-input" type="url" id="film-link" name="filmLink" required />
            <p class="form-hint">Only MP4 links accepted. Ensure shared link is public.</p>
            <p class="form-error" id="err-link">Please enter a valid YouTube or Google Drive URL.</p>
            <div id="link-preview" style="display:none; margin-top:14px; padding:14px;background:var(--bg-alt); border:1px solid var(--line);align-items:center; gap:12px;">
              <div id="preview-thumb" style="width:80px;height:45px;background:var(--bg-deep);flex-shrink:0;overflow:hidden;">
                <img id="preview-img" src="" alt="" style="width:100%;height:100%;object-fit:cover;display:none;" />
                <div id="preview-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--grey);">LINK</div>
              </div>
              <div>
                <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--amber);letter-spacing:1px;margin-bottom:2px;">LINK DETECTED</p>
                <p id="preview-type" style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--paper-dim);"></p>
              </div>
            </div>
          </div>
          <div class="form-check-row">
            <input type="checkbox" id="agree" name="agree" style="accent-color:var(--amber);width:16px;height:16px;flex-shrink:0;margin-top:3px;" required />
            <label for="agree" style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--paper-dim);line-height:1.7;cursor:pointer;">
              I confirm this film is original, under 3 minutes, and all team members have consented to submission. <span class="req">*</span>
            </label>
          </div>
          <p class="form-error" id="err-agree">You must agree to the terms to submit.</p>
          <div class="submit-row">
            <button type="submit" class="btn btn-submit" id="submit-btn"><span id="submit-label">Submit Verified Entry</span></button>
          </div>
        </form>
      `}
    </div>
  `

  if (isPastDeadline) return

  const prefillId = sessionStorage.getItem('teamRegistrationId')
  if (prefillId) document.getElementById('registration-id').value = prefillId

  const synopsisEl = document.getElementById('synopsis')
  const synopsisCount = document.getElementById('synopsis-count')
  synopsisEl?.addEventListener('input', () => {
    const len = synopsisEl.value.length
    synopsisCount.textContent = len
    synopsisCount.style.color = len > 220 ? 'var(--amber)' : ''
  })

  const filmLinkEl = document.getElementById('film-link')
  filmLinkEl?.addEventListener('input', debounce(() => updateLinkPreview(filmLinkEl.value.trim()), 500))

  document.getElementById('verify-team-form')?.addEventListener('submit', handleTeamLookup)
  document.getElementById('final-submit-form')?.addEventListener('submit', handleFinalSubmit)
  setFinalSubmissionLocked(true)
}

function setFinalSubmissionLocked(locked) {
  const form = document.getElementById('final-submit-form')
  if (!form) return
  form.classList.toggle('final-form-locked', locked)
  Array.from(form.elements).forEach((el) => { el.disabled = locked })
}

async function handleTeamLookup(e) {
  e.preventDefault()
  const form = e.target
  const registrationId = form.registrationId.value.trim().toUpperCase()
  showError('err-verify', false)
  setFinalSubmissionLocked(true)
  verifiedTeam = null
  fetchedTeam = null

  if (!registrationId) {
    showError('err-verify', true)
    return
  }

  try {
    const snap = await getDoc(doc(db, 'teamRegistrations', registrationId))
    if (!snap.exists()) {
      showError('err-verify', true)
      showToast('Team ID not found.', 'error', 2000)
      return
    }

    const team = snap.data()
    fetchedTeam = {
      registrationId,
      teamName: team.teamName,
      directorName: team.directorName,
      directorRegistrationNumber: team.directorRegistrationNumber || '',
      contactEmail: team.contactEmail,
      whatsappNumber: team.whatsappNumber || '',
      teamMembers: team.teamMembers || '',
      teamMemberDetails: team.teamMemberDetails || [],
    }

    const info = document.getElementById('team-verified-box')
    info.style.display = 'block'
    info.innerHTML = `
      <p><strong>Team Found</strong></p>
      <p><b>Team:</b> ${escapeHtml(fetchedTeam.teamName)}</p>
      <p><b>Leader:</b> ${escapeHtml(fetchedTeam.directorName)}</p>
      ${fetchedTeam.directorRegistrationNumber ? `<p><b>Leader Registration No.:</b> ${escapeHtml(fetchedTeam.directorRegistrationNumber)}</p>` : ''}
      <p><b>Email:</b> ${escapeHtml(fetchedTeam.contactEmail)}</p>
      ${fetchedTeam.whatsappNumber ? `<p><b>WhatsApp:</b> ${escapeHtml(fetchedTeam.whatsappNumber)}</p>` : ''}
      ${fetchedTeam.teamMembers ? `<p><b>Members:</b> ${escapeHtml(fetchedTeam.teamMembers)}</p>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" class="btn btn-sm" id="confirm-team-btn">Yes, this is my team</button>
        <button type="button" class="btn btn-outline btn-sm" id="reject-team-btn">Not my team</button>
      </div>
    `

    document.getElementById('confirm-team-btn')?.addEventListener('click', confirmFetchedTeam)
    document.getElementById('reject-team-btn')?.addEventListener('click', rejectFetchedTeam)
    showToast('Team details loaded. Please confirm.', 'success', 2000)
  } catch (err) {
    console.error(err)
    showToast('Verification failed — ' + err.message, 'error', 2000)
  }
}

function confirmFetchedTeam() {
  if (!fetchedTeam) return
  verifiedTeam = fetchedTeam
  setFinalSubmissionLocked(false)
  const info = document.getElementById('team-verified-box')
  if (info) {
    info.innerHTML = `
      <p><strong>Team Verified</strong></p>
      <p><b>Team:</b> ${escapeHtml(verifiedTeam.teamName)}</p>
      <p><b>Leader:</b> ${escapeHtml(verifiedTeam.directorName)}</p>
      ${verifiedTeam.directorRegistrationNumber ? `<p><b>Leader Registration No.:</b> ${escapeHtml(verifiedTeam.directorRegistrationNumber)}</p>` : ''}
      <p><b>Email:</b> ${escapeHtml(verifiedTeam.contactEmail)}</p>
      ${verifiedTeam.whatsappNumber ? `<p><b>WhatsApp:</b> ${escapeHtml(verifiedTeam.whatsappNumber)}</p>` : ''}
      ${verifiedTeam.teamMembers ? `<p><b>Members:</b> ${escapeHtml(verifiedTeam.teamMembers)}</p>` : ''}
      <p style="margin-top:10px;color:var(--amber);font-weight:600;">Verified — you can submit now.</p>
    `
  }
  showToast('Team verified. Submit your entry now.', 'success', 2000)
}

function rejectFetchedTeam() {
  verifiedTeam = null
  fetchedTeam = null
  setFinalSubmissionLocked(true)
  const info = document.getElementById('team-verified-box')
  if (info) {
    info.style.display = 'none'
    info.innerHTML = ''
  }
  showToast('Please check Team Registration ID and try again.', 'error', 2000)
}

async function handleFinalSubmit(e) {
  e.preventDefault()
  if (!verifiedTeam) {
    showToast('Please fetch Team ID and confirm it is your team first.', 'error', 2000)
    return
  }

  const form = e.target
  const filmTitle = form.filmTitle.value.trim()
  const synopsis = form.synopsis.value.trim()
  const filmLink = form.filmLink.value.trim()
  const agree = form.agree.checked

  let valid = true
  showError('err-title', !filmTitle); if (!filmTitle) valid = false
  showError('err-synopsis', synopsis.length < 10); if (synopsis.length < 10) valid = false
  const validLink = isValidVideoUrl(filmLink)
  showError('err-link', !validLink); if (!validLink) valid = false
  showError('err-agree', !agree); if (!agree) valid = false
  if (!valid) return

  const submitBtn = document.getElementById('submit-btn')
  const submitLabel = document.getElementById('submit-label')
  submitBtn.disabled = true
  submitLabel.textContent = 'Submitting…'

  try {
    const docRef = await addDoc(collection(db, 'submissions'), {
      teamRegistrationId: verifiedTeam.registrationId,
      teamName: verifiedTeam.teamName,
      directorName: verifiedTeam.directorName,
      directorRegistrationNumber: verifiedTeam.directorRegistrationNumber,
      contactEmail: verifiedTeam.contactEmail,
      whatsappNumber: verifiedTeam.whatsappNumber || '',
      teamMembers: verifiedTeam.teamMembers,
      teamMemberDetails: verifiedTeam.teamMemberDetails,
      filmTitle,
      synopsis,
      filmLink,
      status: 'pending',
      createdAt: serverTimestamp(),
      votes: 0,
    })

    try {
      if (window.emailjs) {
        window.emailjs.send(
          'service_a16f65j',
          'template_ae3ph1e',
          {
            director_name: verifiedTeam.directorName,
            contact_email: verifiedTeam.contactEmail,
            to_email: verifiedTeam.contactEmail,
            film_title: filmTitle,
            synopsis,
            film_link: filmLink,
            submission_id: docRef.id.slice(0, 8).toUpperCase(),
          },
          'Qun-8OVTsdAWKmQjv'
        )
      }
    } catch (emailErr) {
      console.warn('EmailJS auto-reply send error:', emailErr)
    }

    const page = document.getElementById('page')
    page.innerHTML = `
      <div class="submission-success-wrapper">
        <div class="projector-beam-effect"></div>
        <div class="form-card crt-success-card" style="text-align:center;padding:60px 40px;position:relative;z-index:2;">
          <div class="clapperboard-anim">
            <div class="clapper-top"></div>
            <div class="clapper-bottom"></div>
          </div>
          <div class="success-badge-glow">SUBMISSION CONFIRMED</div>
          <h1 class="section-title success-headline">You're In!</h1>
          <p style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--paper-dim);letter-spacing:.5px;line-height:1.9;max-width:520px;margin:0 auto 32px;">
            <strong style="color:var(--paper);font-size:16px;">"${escapeHtml(filmTitle)}"</strong> has been queued for review.<br/>
            Team ID: <span class="sub-id-box">${escapeHtml(verifiedTeam.registrationId)}</span><br/>
            Confirmation sent to <a href="mailto:${escapeHtml(verifiedTeam.contactEmail)}">${escapeHtml(verifiedTeam.contactEmail)}</a><br/><br/>
            <span style="color:var(--grey);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Submission ID</span><br/>
            <span class="sub-id-box">${docRef.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
            <button class="btn" id="success-home">← Back to Home</button>
            <button class="btn btn-outline" id="success-finalists">View Finalists</button>
          </div>
        </div>
      </div>
    `
    document.getElementById('success-home').addEventListener('click', () => window.navigate('home'))
    document.getElementById('success-finalists').addEventListener('click', () => window.navigate('finalists'))
    showToast('Verified film submitted successfully.', 'success', 2000)
  } catch (err) {
    console.error(err)
    showToast('Submission failed — ' + err.message, 'error', 2000)
    submitBtn.disabled = false
    submitLabel.textContent = 'Submit Verified Entry'
  }
}

function updateLinkPreview(url) {
  const preview = document.getElementById('link-preview')
  const previewImg = document.getElementById('preview-img')
  const previewPlaceholder = document.getElementById('preview-placeholder')
  const previewType = document.getElementById('preview-type')
  if (!preview || !previewImg || !previewPlaceholder || !previewType) return

  if (!url) {
    preview.style.display = 'none'
    return
  }

  try {
    const u = new URL(url)
    const isYT = u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')
    const isDrive = u.hostname.includes('drive.google.com')
    if (!isYT && !isDrive) {
      preview.style.display = 'none'
      return
    }

    preview.style.display = 'flex'
    if (isYT) {
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
      if (ytMatch) {
        previewImg.src = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`
        previewImg.style.display = 'block'
        previewPlaceholder.style.display = 'none'
      }
      previewType.textContent = 'YouTube video detected'
    } else {
      previewImg.style.display = 'none'
      previewPlaceholder.style.display = 'flex'
      previewType.textContent = 'Google Drive link detected'
    }
  } catch {
    preview.style.display = 'none'
  }
}

function isValidVideoUrl(url) {
  try {
    const u = new URL(url)
    return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be') ||
      u.hostname.includes('drive.google.com') || u.hostname.includes('docs.google.com')
  } catch {
    return false
  }
}

function debounce(fn, delay) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

function showError(id, show) {
  const el = document.getElementById(id)
  if (el) el.style.display = show ? 'block' : 'none'
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (s) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]
  ))
}
