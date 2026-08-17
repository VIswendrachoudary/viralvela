import { renderNav } from '../components/nav.js'

export function renderContact() {
  renderNav('contact')
  const page = document.getElementById('page')

  page.innerHTML = `
    <div class="form-card fade-up" style="max-width:680px; margin:40px auto; padding:48px 44px; text-align:center;">
      <p class="eyebrow">Get In Touch</p>
      <h1 class="section-title" style="font-size:36px; margin-bottom:12px;">Contact Us</h1>
      <p style="font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--paper-dim); line-height:1.7; margin-bottom:36px;">
        Have questions about VIRAL VELA or submission details? Reach out to our event organizers below.
      </p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; text-align:left; margin-bottom:36px;">
        <div style="background:var(--bg-alt); border:1px solid var(--line); padding:24px 20px;">
          <p style="font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:2px; color:var(--amber); text-transform:uppercase; margin-bottom:8px;">General Enquiries</p>
          <h3 style="font-family:'IBM Plex Sans',sans-serif; font-size:18px; color:var(--paper); margin-bottom:8px;">Sahiti</h3>
          <a href="mailto:sahititla.vit@gmail.com" style="font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--amber); word-break:break-all;">
            sahititla.vit@gmail.com
          </a>
        </div>

        <div style="background:var(--bg-alt); border:1px solid var(--line); padding:24px 20px;">
          <p style="font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:2px; color:var(--red); text-transform:uppercase; margin-bottom:8px;">Submission Queries</p>
          <h3 style="font-family:'IBM Plex Sans',sans-serif; font-size:18px; color:var(--paper); margin-bottom:8px;">Charan Garikapati</h3>
          <a href="mailto:charandeepgarikapati@gmail.com" style="font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--amber); word-break:break-all;">
            charandeepgarikapati@gmail.com
          </a>
          <a href="tel:+918074822651" style="display:block; margin-top:10px; font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--amber);">
            +91 8074 822 651
          </a>
        </div>
      </div>

      <div style="margin-bottom:36px; padding:24px; background:rgba(37,211,102,0.1); border:1px solid #25D366; text-align:center;">
        <p style="font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:1px; color:#25D366; text-transform:uppercase; margin-bottom:8px;">Official Participant Community</p>
        <h3 style="font-family:'IBM Plex Sans',sans-serif; font-size:20px; color:var(--paper); margin-bottom:16px;">Join VIRAL VELA WhatsApp Group</h3>
        <a href="https://chat.whatsapp.com/KTwgEUumT3T4AlmxeLjQ9I?s=sh&p=a&ilr=0" target="_blank" rel="noopener noreferrer" class="btn" style="background:#25D366; color:#000000; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
          Join WhatsApp Group →
        </a>
      </div>

      <button class="btn" id="contact-home-btn">← Back to Home</button>
    </div>
  `

  document.getElementById('contact-home-btn')?.addEventListener('click', () => window.navigate('home'))
}
