export default function Contact() {
  const styles = {
    contact: { 
      color: '#fff', 
      minHeight: '100vh' },
      
    contactHero: { padding: '5rem 2rem 3rem', textAlign: 'center', background: 'linear-gradient(180deg, #1a0305 0%, #000 100%)' },
    contactTag: { display: 'inline-block', background: 'rgba(102, 9, 17, 0.4)', border: '1px solid #660911', color: '#ff6b7a', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.3rem 1rem', borderRadius: '2rem', marginBottom: '1.5rem' },
    heroH1: { fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', marginBottom: '1rem' },
    heroP: { color: '#aaa', maxWidth: '500px', margin: '0 auto', lineHeight: '1.7' },
    contactBody: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' },
    contactCard: { background: '#111', border: '1px solid #222', borderRadius: '1rem', padding: '2rem', textAlign: 'center' },
    contactIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
    cardH3: { fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#ff6b7a' },
    cardP: { color: '#888', fontSize: '0.9rem', lineHeight: '1.8' }
  };

  return (
    <main style={styles.contact}>
      <section className="page-hero" data-watermark="CONTACT">
          <div className="page-hero-inner">
            <span className="page-hero-tag">Contact Us</span>
            <h1>Get in Touch</h1>
            <p className="page-hero-sub">
              Whether you’re ready to enroll or just need more details, our staff is available to assist with all your training needs.
            </p>
          </div>
          <div className="page-hero-rule" />
      </section>

      <section style={styles.contactBody}>
        {[
          { icon: '📍', title: 'Address', text: '123 Hospitality Ave, Cebu City, Philippines' },
          { icon: '📞', title: 'Phone', text: ['+63 32 XXX XXXX', '+63 9XX XXX XXXX'] },
          { icon: '✉️', title: 'Email', text: ['info@3aprime.edu.ph', 'enroll@3aprime.edu.ph'] },
          { icon: '🕐', title: 'Office Hours', text: ['Monday – Friday: 8AM – 5PM', 'Saturday: 8AM – 12PM'] }
        ].map((item, i) => (
          <div key={i} style={styles.contactCard}>
            <div style={styles.contactIcon}>{item.icon}</div>
            <h3 style={styles.cardH3}>{item.title}</h3>
            {Array.isArray(item.text) 
              ? item.text.map((t, j) => <p key={j} style={styles.cardP}>{t}</p>)
              : <p style={styles.cardP}>{item.text}</p>}
          </div>
        ))}
      </section>
    </main>
  );
}