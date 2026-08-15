import { db } from '../firebase.js'
import { doc, getDoc } from 'firebase/firestore'
import { renderNav } from '../components/nav.js'

export async function renderSubmit() {
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
    <div class="form-card fade-up submit-card-wide">
      <div class="form-header">
        <p class="eyebrow">Open Call</p>
        <h1 class="section-title" style="font-size:36px;margin-bottom:10px;">Submit Your Video</h1>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--paper-dim);letter-spacing:.5px;line-height:1.7;">
          STEPS TO REGISTER
          <br/>1) Team Registration
          <br/>2) Verify Team ID + names and submit video
        </p>
      </div>

      ${isPastDeadline ? `
        <div style="margin-top:20px;padding:18px 20px;background:var(--red-dim);border-left:3px solid var(--red);">
          <p style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--paper);letter-spacing:.5px;">
            ⛔ Submissions are now closed. The deadline has passed.
          </p>
        </div>
      ` : `
        <div class="submit-route-grid">
          <div class="submit-route-card">
            <div class="form-section-label">Step 1</div>
            <h3 class="section-title" style="font-size:22px;margin-bottom:14px;">Team Registration</h3>
            <p class="form-hint" style="margin:0 0 22px;">
              Register your team first and get a Team Registration ID.
            </p>
            <button class="btn" id="go-team-registration">Go to Team Registration →</button>
          </div>
          <div class="submit-route-card">
            <div class="form-section-label">Step 2</div>
            <h3 class="section-title" style="font-size:22px;margin-bottom:14px;">Verify & Submit Video</h3>
            <p class="form-hint" style="margin:0 0 22px;">
              Enter Team ID, view your registered names from Firebase, confirm it's your team, then submit your video.
            </p>
            <button class="btn btn-outline" id="go-submit-entry">Go to Verify & Submit →</button>
          </div>
        </div>
      `}
    </div>
  `

  if (!isPastDeadline) {
    document.getElementById('go-team-registration')?.addEventListener('click', () => window.navigate('team-registration'))
    document.getElementById('go-submit-entry')?.addEventListener('click', () => window.navigate('submit-entry'))
  }
}
