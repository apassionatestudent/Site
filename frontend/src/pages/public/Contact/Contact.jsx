
import SupportTicketForm from '../../../components/public/SupportTicketForm/SupportTicketForm.jsx';

export default function Contact() {
  const styles = {
    contact: { 
      color: '#fff', 
      minHeight: '100vh' },
      
    contactHero: { padding: '5rem 2rem 3rem', textAlign: 'center', background: 'linear-gradient(180deg, #1a0305 0%, #000 100%)' },
    contactTag: { display: 'inline-block', background: 'rgba(102, 9, 17, 0.4)', border: '1px solid #660911', color: '#ff6b7a', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.3rem 1rem', borderRadius: '2rem', marginBottom: '1.5rem' },
    heroH1: { fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', marginBottom: '1rem' },
    heroP: { color: '#aaa', maxWidth: '500px', margin: '0 auto', lineHeight: '1.7' },
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

      <SupportTicketForm />
    </main>
  );
}