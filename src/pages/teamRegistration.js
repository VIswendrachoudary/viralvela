import { db } from '../firebase.js'
import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore'
import { showToast } from '../utils.js'
import { renderNav } from '../components/nav.js'

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/KTwgEUumT3T4AlmxeLjQ9I?s=sh&p=a&ilr=0'

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

  const registrantNames = [directorName, ...memberDetails.map(member => member.name)]
  const duplicateInTeam = findDuplicateName(registrantNames)
  if (duplicateInTeam) {
    showToast(`${duplicateInTeam} is listed more than once in this team.`, 'error')
    return
  }

  const registerBtn = document.getElementById('register-team-btn')
  const registerLabel = document.getElementById('register-team-label')
  registerBtn.disabled = true
  registerLabel.textContent = 'Registering…'

  try {
    const registrationId = await generateUniqueRegistrationId()
    await assertNamesAvailable(registrantNames)
    await saveTeamRegistration({
      registrationId,
      teamName,
      directorName,
      directorRegistrationNumber,
      contactEmail,
      teamMembers,
      memberDetails,
      registrantNames,
    })

    let confirmationEmailSent = false
    try {
      await sendRegistrationConfirmationEmail({
        teamName,
        directorName,
        directorRegistrationNumber,
        contactEmail,
        registrationId,
      })
      confirmationEmailSent = true
    } catch (emailErr) {
      console.warn('Registration confirmation email failed:', emailErr)
    }

    sessionStorage.setItem('teamRegistrationId', registrationId)

    const result = document.getElementById('registration-result')
    result.style.display = 'block'
    result.innerHTML = `
      <p><strong>Team Registered ✓</strong></p>
      <p>ID: <span class="sub-id-box">${registrationId}</span></p>
      <p style="margin-top:8px;">${confirmationEmailSent
        ? `A confirmation email has been sent to ${contactEmail}.`
        : 'Your team is registered, but the confirmation email could not be sent. Please contact an organizer if needed.'}</p>
      <div style="margin-top:14px;">
        <a class="btn" href="${WHATSAPP_GROUP_URL}" target="_blank" rel="noopener noreferrer" style="background:#25D366;color:#000000;">💬 Join WhatsApp Group →</a>
      </div>
    `

    showToast('Team registered. Join the WhatsApp group for updates.', 'success')
  } catch (err) {
    console.error(err)
    showToast('Team registration failed — ' + err.message, 'error')
  } finally {
    registerBtn.disabled = false
    registerLabel.textContent = 'Register Team'
  }
}

async function assertNamesAvailable(registrantNames) {
  const registeredTeams = await getDocs(collection(db, 'teamRegistrations'))
  const existingNames = new Set()

  registeredTeams.forEach((teamDoc) => {
    const team = teamDoc.data()
    if (team.directorName) existingNames.add(normalizeName(team.directorName))
    getStoredMemberNames(team).forEach(name => existingNames.add(normalizeName(name)))
  })

  const duplicate = registrantNames.find(name => existingNames.has(normalizeName(name)))
  if (duplicate) throw new Error(`${duplicate} has already been registered in another team.`)
}

async function saveTeamRegistration({ registrationId, teamName, directorName, directorRegistrationNumber, contactEmail, teamMembers, memberDetails, registrantNames }) {
  const registrationRef = doc(db, 'teamRegistrations', registrationId)
  const nameRefs = registrantNames.map(name => doc(db, 'registeredNames', encodeNameKey(name)))

  await runTransaction(db, async (transaction) => {
    const claimedNames = []
    for (const nameRef of nameRefs) claimedNames.push(await transaction.get(nameRef))
    if (claimedNames.some(claim => claim.exists())) {
      throw new Error('One or more team member names have already been registered.')
    }

    transaction.set(registrationRef, {
      registrationId,
      teamName,
      directorName,
      directorRegistrationNumber,
      contactEmail,
      teamMembers,
      teamMemberDetails: memberDetails,
      status: 'registered',
      createdAt: serverTimestamp(),
    })
    nameRefs.forEach((nameRef, index) => {
      transaction.set(nameRef, {
        name: registrantNames[index],
        registrationId,
        createdAt: serverTimestamp(),
      })
    })
  })
}

function findDuplicateName(names) {
  const seen = new Set()
  return names.find(name => {
    const normalized = normalizeName(name)
    if (seen.has(normalized)) return true
    seen.add(normalized)
    return false
  })
}

function getStoredMemberNames(team) {
  if (Array.isArray(team.teamMemberDetails)) return team.teamMemberDetails.map(member => member.name).filter(Boolean)
  return String(team.teamMembers || '')
    .split(/\n|,/)
    .map(entry => entry.split(/[-–—]/)[0].trim())
    .filter(Boolean)
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function encodeNameKey(name) {
  return encodeURIComponent(normalizeName(name))
}

async function sendRegistrationConfirmationEmail({ teamName, directorName, directorRegistrationNumber, contactEmail, registrationId }) {
  if (!window.emailjs) return

  await window.emailjs.send(
    'service_a16f65j',
    'template_dk3jqkk',
    {
      to_email: contactEmail,
      email: contactEmail,
      user_email: contactEmail,
      recipient_email: contactEmail,
      reply_to: contactEmail,
      contact_email: contactEmail,
      director_name: directorName,
      team_name: teamName,
      registration_id: registrationId,
      registration_number: directorRegistrationNumber,
      email_subject: 'Thank you for registering — Viral Vela',
      message: `Thank you for registering for Viral Vela. Your Team Registration ID is ${registrationId}. Please keep this ID safe; you will need it to verify your team and submit your video.`,
    },
    'Qun-8OVTsdAWKmQjv'
  )
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
