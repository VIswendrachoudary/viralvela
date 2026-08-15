import { db } from '../firebase.js'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { showToast } from '../utils.js'
import { renderNav } from '../components/nav.js'

export async function renderTeamRegistration() {
  renderNav('submit')
  const page = document.getElementById('page')

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
        <p class="eyebrow">Step 1</p>
        <h1 class="section-title" style="font-size:32px;margin-bottom:10px;">Team Registration</h1>
      </div>

      ${isPastDeadline ? `
        <div style="padding:18px 20px;background:var(--red-dim);border-left:3px solid var(--red);">
          <p style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--paper);letter-spacing:.5px;">
            ⛔ Submissions are now closed. The deadline has passed.
          </p>
        </div>
      ` : `
        <form id="team-registration-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="team-name">Team Name <span class="req">*</span></label>
            <input class="form-input" type="text" id="team-name" name="teamName" maxlength="80" required />
            <p class="form-error" id="err-team-name">Please enter team name.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="director-name">Team Leader / Director Name <span class="req">*</span></label>
            <input class="form-input" type="text" id="director-name" name="directorName" maxlength="80" required />
            <p class="form-error" id="err-director">Please enter team leader name.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="director-registration-number">Team Leader Registration Number <span class="req">*</span></label>
            <input class="form-input upper-input" type="text" id="director-registration-number" name="directorRegistrationNumber" maxlength="11" required />
            <p class="form-hint">Format: 2 digits + 3–4 letters + 4–5 digits (example: 23BCT0233).</p>
            <p class="form-error" id="err-director-registration">Enter a valid registration number.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="contact-email">Contact Email <span class="req">*</span></label>
            <input class="form-input" type="email" id="contact-email" name="contactEmail" required />
            <p class="form-error" id="err-email">Please enter a valid email address.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="team-members">Other Team Members & Registration Numbers</label>
            <textarea class="form-textarea" id="team-members" name="teamMembers" maxlength="600" placeholder="One member per line&#10;NAME - REG NO"></textarea>
            <p class="form-hint">Add each member’s name and registration number, separated by a dash.</p>
            <p class="form-error" id="err-team-members">Use one member per line: Name — Registration Number.</p>
          </div>
          <div class="submit-row">
            <button type="submit" class="btn btn-submit" id="register-team-btn">
              <span id="register-team-label">Register Team</span>
            </button>
          </div>
        </form>

        <div id="registration-result" class="verify-status" style="display:none;"></div>
      `}
    </div>
  `

  if (isPastDeadline) return
  document.getElementById('team-registration-form')?.addEventListener('submit', handleTeamRegistration)
}

async function handleTeamRegistration(e) {
  e.preventDefault()
  const form = e.target
  const teamName = form.teamName.value.trim()
  const directorName = form.directorName.value.trim()
  const directorRegistrationNumber = form.directorRegistrationNumber.value.trim().toUpperCase()
  const contactEmail = form.contactEmail.value.trim()
  const teamMembers = form.teamMembers?.value.trim() || ''
  const registrationNumberPattern = /^\d{2}[A-Z]{3,4}\d{4,5}$/

  let valid = true
  showError('err-team-name', !teamName); if (!teamName) valid = false
  showError('err-director', !directorName); if (!directorName) valid = false
  const directorRegistrationOk = registrationNumberPattern.test(directorRegistrationNumber)
  showError('err-director-registration', !directorRegistrationOk); if (!directorRegistrationOk) valid = false
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
  showError('err-email', !emailOk); if (!emailOk) valid = false
  const memberDetails = parseTeamMembers(teamMembers, registrationNumberPattern)
  const membersOk = memberDetails !== null
  showError('err-team-members', !membersOk); if (!membersOk) valid = false
  if (!valid) return

  const registerBtn = document.getElementById('register-team-btn')
  const registerLabel = document.getElementById('register-team-label')
  registerBtn.disabled = true
  registerLabel.textContent = 'Registering…'

  try {
    const registrationId = await generateUniqueRegistrationId()

    await setDoc(doc(db, 'teamRegistrations', registrationId), {
      registrationId,
      teamName,
      directorName,
      directorRegistrationNumber,
      contactEmail,
      teamMembers,
      teamMemberDetails: memberDetails || [],
      status: 'registered',
      createdAt: serverTimestamp(),
    })

    sessionStorage.setItem('teamRegistrationId', registrationId)

    const result = document.getElementById('registration-result')
    result.style.display = 'block'
    result.innerHTML = `
      <p><strong>Team Registered ✓</strong></p>
      <p>ID: <span class="sub-id-box">${registrationId}</span></p>
      <div style="margin-top:14px;">
        <button class="btn btn-outline" id="go-submit-entry" type="button">Continue to Verify & Submit →</button>
      </div>
    `

    document.getElementById('go-submit-entry')?.addEventListener('click', () => window.navigate('submit-entry'))
    showToast('Team registered. Continue to verification page.', 'success')
  } catch (err) {
    console.error(err)
    showToast('Team registration failed — ' + err.message, 'error')
  } finally {
    registerBtn.disabled = false
    registerLabel.textContent = 'Register Team'
  }
}

function parseTeamMembers(value, registrationNumberPattern) {
  if (!value) return []

  const members = value.split('\n').map(line => line.trim()).filter(Boolean)
  const parsed = members.map(line => {
    const match = line.match(/^(.+?)\s*[-–—]\s*([A-Za-z0-9]+)$/)
    if (!match) return null
    const name = match[1].trim()
    const registrationNumber = match[2].trim().toUpperCase()
    if (!name || !registrationNumberPattern.test(registrationNumber)) return null
    return { name, registrationNumber }
  })

  return parsed.some(member => member === null) ? null : parsed
}

async function generateUniqueRegistrationId() {
  for (let i = 0; i < 8; i++) {
    const id = randomId(8)
    const snap = await getDoc(doc(db, 'teamRegistrations', id))
    if (!snap.exists()) return id
  }
  throw new Error('Unable to create unique registration ID. Please try again.')
}

function randomId(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function showError(id, show) {
  const el = document.getElementById(id)
  if (el) el.style.display = show ? 'block' : 'none'
}
