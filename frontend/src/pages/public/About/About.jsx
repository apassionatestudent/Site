import './About.css';
import { useEffect, useRef, useState } from 'react';

// => Auto-calculated years 
// Instead of hardcoding years, we calculate dynamically so the number
// automatically updates every year without any code changes.
const currentYear = new Date().getFullYear();
const yearsExperience = currentYear - 2009; // base year = year Ana Liza started in the industry

// => useCountUp hook
// Custom hook that animates a number from 0 to `target` over `duration` ms.
// Only starts counting when `isVisible` becomes true (triggered by scroll).
function useCountUp(target, duration = 2000, isVisible) {
  const [count, setCount] = useState(0);       // current displayed number
  const hasRun = useRef(false);                // prevents re-running on re-render or scroll-back

  useEffect(() => {
    // Do nothing if not yet visible, or if animation already played
    if (!isVisible || hasRun.current) return;
    hasRun.current = true; // lock it => animation will only ever run once

    // If target is not a number (e.g. "TESDA"), just display it immediately
    const isNumeric = !isNaN(target);
    if (!isNumeric) {
      setCount(target);
      return;
    }

    let start = 0;
    const end = parseInt(target);

    // Calculate how much to add per tick to finish within `duration` ms
    // 16ms per tick => 60fps
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;

      if (start >= end) {
        // Reached the target => snap to exact value and stop the interval
        setCount(end);
        clearInterval(timer);
      } else {
        // Still counting =>  update the displayed number each tick
        setCount(Math.floor(start));
      }
    }, 16); // runs every 16ms (=>60 frames per second)

    // Cleanup: clear interval if component unmounts mid-animation
    return () => clearInterval(timer);
  }, [isVisible, target, duration]); // re-evaluates if any of these change

  return count; // the current animated value to display
}

// => StatItem 
// Renders a single stat (e.g. "2018 => Year Founded").
// Uses IntersectionObserver to detect when the element enters the viewport,
// then triggers the useCountUp animation at that moment.
function StatItem({ number, suffix = '', label, duration }) {
  const ref = useRef(null);                    // reference to the DOM element to observe
  const [isVisible, setIsVisible] = useState(false); // becomes true when scrolled into view

  useEffect(() => {
    // IntersectionObserver watches the stat element.
    // When 30% of it is visible on screen, it sets isVisible = true.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true); // tripwire => fires once
      },
      { threshold: 0.3 } // 0.3 = 30% of the element must be visible to trigger
    );

    if (ref.current) observer.observe(ref.current); // start watching the element

    // Cleanup: stop observing when component unmounts
    return () => observer.disconnect();
  }, []); // empty dependency array = runs once on mount only

  // Pass isVisible to useCountUp => animation starts the moment the stat is seen
  const count = useCountUp(number, duration, isVisible);
  const isNumeric = !isNaN(number); // determines whether to show animated count or raw text

  return (
    <div className="story-stat" ref={ref}> {/* ref lets IntersectionObserver track this element */}
      <span className="stat-number">
        {/* Show animated count for numbers, raw value for text like "TESDA" */}
        {isNumeric ? count : number}{suffix}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// => VALUES 
// PRIME acronym => each letter maps to a core institutional value.
// Rendered as a styled list inside the Our Values card.
const VALUES = [
  { letter: 'P', word: 'PROFESSIONALISM',   desc: 'in the workplace' },
  { letter: 'R', word: 'RESILIENCY',        desc: 'in the midst of opportunities' },
  { letter: 'I', word: 'INDUSTRY ORIENTED', desc: 'for better customer experience' },
  { letter: 'M', word: 'MOTIVATED',         desc: 'to go the extra mile' },
  { letter: 'E', word: 'ENTHUSIASM',        desc: 'and positive work attitude' },
];

// => About Page 
// Main About page component. Structured into four sections:
// 1. Hero       => tagline and motto
// 2. MVV        => Mission, Vision, Values cards
// 3. Divider    => decorative section separator
// 4. Story      => animated stats + company background text
export default function About() {
  return (
    <main className="about">

      {/* => 1. HERO 
           Full-width header with the school tagline and motto.
           The watermark "ABOUT" text is added via CSS ::before pseudo-element. */}
      <section className="page-hero" data-watermark="ABOUT">
        <div className="page-hero-inner">
          <span className="page-hero-tag">About Us</span>
          <h1>Who We Are</h1>
          <p className="page-hero-sub page-hero-sub--italic">
            <span className="motto-quote">"</span>
            Learn, Passionately Embrace and Express Hospitality at Its Finest!
            <span className="motto-quote">"</span>
          </p>
        </div>
        <div className="page-hero-rule" />
      </section>

      {/* => 2. MISSION / VISION / VALUES 
           Three cards in a responsive grid.
           Each card has a numbered label (01, 02, 03) and a top accent border via CSS ::after. */}
      <section className="about-mvv">

        <div className="about-card mission-card">
          <div className="about-card-label">01</div>
          <h2>Our Mission</h2>
          <p>We focus in preparing hospitality professionals through dynamic skills training and diverse educational opportunities that emphasize critical thinking, creativity, and the development of attitudes suitable for progressive employment in the global hospitality, travel, and related industry.</p>
        </div>

        <div className="about-card vision-card">
          <div className="about-card-label">02</div>
          <h2>Our Vision</h2>
          <p><strong>3A Prime Hospitality Training and Assessment Center Inc.</strong> endeavors to become the leading provider in hospitality education — committed to developing the full potential of all its students in a stimulating and rigorous learning environment dedicated to hospitality service at its finest.</p>
        </div>

        <div className="about-card values-card">
          <div className="about-card-label">03</div>
          <h2>Our Values</h2>
          {/* PRIME acronym rendered as styled badge + text rows */}
          <ul className="about-values">
            {VALUES.map(({ letter, word, desc }) => (
              <li key={letter} className="value-item">
                <span className="value-letter">{letter}</span>
                <span className="value-text">
                  <strong>{word}</strong> {desc}
                </span>
              </li>
            ))}
          </ul>
        </div>

      </section>

      {/* => 3. DIVIDER 
           Decorative horizontal rule with centered label.
           The lines on each side are CSS ::before and ::after pseudo-elements. */}
      <div className="about-divider">
        <span>Our Story</span>
      </div>

      {/* => 4. STORY 
           Two-column layout:
           LEFT  => sticky animated stats (year founded, experience, certification)
           RIGHT => company background paragraphs */}
      <section className="about-story">
        <div className="about-story-inner">

          {/* Stats column => each StatItem animates when scrolled into view */}
          <div className="story-stat-col">
            {/* 2018 counts up slowly to emphasize the founding year */}
            <StatItem number={2018}            suffix=""  label="Year Founded"              duration={2500} />
            {/* yearsExperience auto-calculates from 2009 so it never needs manual updating but I need to confirm with Ma'am Ana what year she really started. */}
            <StatItem number={yearsExperience} suffix="+" label="Years Industry Experience" duration={1500} />
            {/* TESDA is non-numeric => displays instantly with no animation */}
            <StatItem number="TESDA"           suffix=""  label="Nationally Certified"      duration={0}    />
          </div>

          {/* Text column => company history and background */}
          <div className="story-text-col">
            <p>We are creating bridges with local hotels, the Department of Tourism, and Employment Agencies so our graduates have real opportunities in the industry after completing their training.</p>
            <p>3A Prime is under the management of Institution Head <strong>Ana Liza M. Augusto</strong> — a Filipino National, Professional Chef, and Culinary Instructor with fifteen years in the Hospitality Industry both locally and abroad, and six years as Culinary Instructor Consultant at the University of San Carlos, Benedicto College, and Magsaysay Careers Training.</p>
            <p>Students are exposed to professional training standards for local hospitality establishments like hotels and restaurants. We also promote OJT (on-the-job training) to enhance skills and increase employment opportunities with our partner companies.</p>
            <p>Since opening in December 2018, we have proudly produced graduates as regular enrollees and scholars from government and non-government organizations including <strong>Plan International, DepEd, TESDA,</strong> and <strong>OWWA</strong>. We also cater National Certification Assessments so trainees receive a TESDA National Certificate.</p>
            {/* Closing statement => styled distinctively via .story-closing in About.css */}
            <p className="story-closing">In 3A Prime Hospitality — we express and we instill excellence.</p>
          </div>

        </div>
      </section>

    </main>
  );
}