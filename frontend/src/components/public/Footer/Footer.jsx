// Footer.jsx
import './Footer.css';

// ── Icon components (inline SVG, no extra dep needed) ──────────────────────
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const TwitterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
  </svg>
);

// ── Socials config ─────────────────────────────────────────────────────────
const SOCIALS = [
  { label: 'Facebook',  href: 'https://facebook.com',  Icon: FacebookIcon  },
  { label: 'Instagram', href: 'https://instagram.com', Icon: InstagramIcon },
  { label: 'LinkedIn',  href: 'https://linkedin.com',  Icon: LinkedInIcon  },
  { label: 'Twitter/X', href: 'https://x.com',         Icon: TwitterIcon   },
  { label: 'YouTube',   href: 'https://youtube.com',   Icon: YouTubeIcon   },
];

// => iframe src for Google Map embed to allow map pinpointing and direction
const MAP_EMBED_URL =
  'https://maps.app.goo.gl/anqtvKsgMLeNHWbg8https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.3293771673143!2d123.8872726750354!3d10.315503089806633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a99980ab303539%3A0xbeccee4ef3abc8f8!2s3A%20PRIME%20HOSPITALITY%20TRAINING%20AND%20ASSESSMENT%20CENTER%20INC.!5e0!3m2!1ses!2sph!4v1777973748254!5m2!1ses!2sph';

// => Footer component with Google Map and contact info, styled via Footer.css
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">

        {/* => LEFT: Google Map  */}
        <div className="footer__map-col">
          <span className="footer__map-label">Find Us</span>
          <div className="footer__map-frame">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.3293771673143!2d123.8872726750354!3d10.315503089806633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a99980ab303539%3A0xbeccee4ef3abc8f8!2s3A%20PRIME%20HOSPITALITY%20TRAINING%20AND%20ASSESSMENT%20CENTER%20INC.!5e0!3m2!1ses!2sph!4v1777973748254!5m2!1ses!2sph"
              width="600"
              height="450"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="3A Prime Location"
            />
          </div>
        </div>

        {/* => RIGHT: Info */}
        <div className="footer__info-col">

          {/* Brand */}
          <div>
            <h2 className="footer__brand-name">3A Prime Hospitality</h2>
            <p className="footer__brand-tagline">Training &amp; Assessment Center Inc.</p>
          </div>

          {/* Quick Links */}
          <div className="footer__section">
            <p className="footer__section-title">Quick Links</p>
            <ul className="footer__links">
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/faqs">FAQs</a></li>
              <li><a href="/branches">Branches</a></li>
            </ul>
          </div>

          {/* Address */}
          <div className="footer__section">
            <p className="footer__section-title">Address</p>
            <p className="footer__detail-text">
              0362 Don Mariano Cui,<br />
              Corner N Escario St,<br />
              Cebu City, 6000 Cebu Philippines
            </p>
          </div>

          {/* Business Hours */}
          <div className="footer__section">
            <p className="footer__section-title">Business Hours</p>
            <p className="footer__detail-text">
              <strong>Mon – Sat</strong>&ensp;8:00 AM – 5:00 PM<br />
              <strong>Sunday</strong>&ensp;Closed
            </p>
          </div>

          {/* Contact */}
          <div className="footer__section">
            <p className="footer__section-title">Contact Us</p>
            <div className="footer__contacts">
              <a href="tel:+6332XXXXXXX" className="footer__contact-item">
                <PhoneIcon />
                +63 32 XXX XXXX
              </a>
              <a href="tel:+639XXXXXXXXX" className="footer__contact-item">
                <PhoneIcon />
                +63 9XX XXX XXXX
              </a>
              <a href="mailto:info@3aprime.com.ph" className="footer__contact-item">
                <MailIcon />
                info@3aprime.com.ph
              </a>
              <a href="mailto:admissions@3aprime.com.ph" className="footer__contact-item">
                <MailIcon />
                admissions@3aprime.com.ph
              </a>
            </div>
          </div>

          {/* Social Media */}
          <div className="footer__section">
            <p className="footer__section-title">Follow Us</p>
            <div className="footer__socials">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="footer__social-link"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* => Bottom bar  */}
      <div className="footer__bottom">
        <span className="footer__copyright">
          © {new Date().getFullYear()} 3A Prime Hospitality Training and Assessment Center Inc. All rights reserved.
        </span>
        <ul className="footer__legal-links">
          <li><a href="/privacy-policy">Privacy Policy</a></li>
          <li><a href="/sitemap">Sitemap</a></li>
        </ul>
      </div>
    </footer>
  );
}
