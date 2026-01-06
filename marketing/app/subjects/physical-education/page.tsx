import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'Physical Education Flashcards | GCSE & A-Level PE Revision | FL4SH',
  description:
    'Study Physical Education (PE) with exam-board aligned flashcards and spaced repetition. GCSE and A-Level PE revision built from UK specifications.',
  alternates: { canonical: 'https://fl4shcards.com/subjects/physical-education' },
};

export default function PhysicalEducationPage() {
  return (
    <SeoPage
      kicker="Subject"
      title="Physical Education (PE) Flashcards"
      subtitle="GCSE & A‑Level PE revision with specification-driven topics, spaced repetition, and exam-focused practice."
    >
      <section className={styles.card}>
        <h2>What you can revise</h2>
        <ul className={styles.list}>
          <li>Applied anatomy & physiology, movement analysis, training methods, sports psychology</li>
          <li>Socio-cultural influences, health/fitness, and performance analysis</li>
          <li>Short-answer and extended-response exam technique</li>
        </ul>
      </section>

      <section className={styles.card}>
        <h2>Why FL4SH works for PE</h2>
        <ul className={styles.list}>
          <li>Content mapped to your course structure (no generic decks)</li>
          <li>Leitner spaced repetition so you retain key definitions and evaluation points</li>
          <li>Build confident exam responses with targeted practice</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/contact">
          Schools & bulk pricing →
        </a>
        <a className={styles.link} href="/">
          Back to home
        </a>
      </div>

      <p className={styles.note}>
        Tip: if your exam board uses different terminology, FL4SH still keeps your revision aligned to the specification
        structure so you don’t miss syllabus points.
      </p>
    </SeoPage>
  );
}

