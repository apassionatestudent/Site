import './About.css';

export default function About() {
  return (
    <main className="about">
      <section className="about-hero">
        <span className="about-tag">About Us</span>
        <h1>Who We Are</h1>
        <p>3A Prime Hospitality Training and Assessment Center Inc. is committed to developing highly skilled hospitality professionals ready for the global stage.</p>
      </section>

      <section className="about-body">
        <div className="about-block">
          <h2>Our Mission</h2>
          <p>To provide accessible, high-quality hospitality training that prepares students for meaningful careers through practical skills, professional values, and industry-recognized certifications.</p>
        </div>
        <div className="about-block">
          <h2>Our Vision</h2>
          <p>To be the leading hospitality training institution in the region, recognized for excellence in education, integrity in assessment, and impact in the communities we serve.</p>
        </div>
        <div className="about-block">
          <h2>Our Values</h2>
          <ul className="about-values">
            <li>Excellence in every program</li>
            <li>Integrity in assessment</li>
            <li>Respect for every learner</li>
            <li>Commitment to industry standards</li>
          </ul>
        </div>
      </section>

    </main>
  );
}
