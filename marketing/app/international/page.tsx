import type { Metadata } from 'next';
import SeoPage from '../components/SeoPage';
import styles from '../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'International GCSE & International A-Level | Global UK Qualifications | FL4SH',
  description:
    'Revision support for students studying UK qualifications worldwide, including International GCSE (iGCSE) and International A-Level.',
  alternates: { canonical: 'https://fl4shcards.com/international' },
};

export default function InternationalHubPage() {
  return (
    <SeoPage
      kicker="International"
      title="International GCSE & International A‑Level"
      subtitle="Built for British and international schools worldwide — revise with structured topics and spaced repetition."
    >
      <section className={styles.card}>
        <h2>International pathways</h2>
        <ul className={styles.list}>
          <li>International GCSE (iGCSE)</li>
          <li>International A‑Level</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/international/igcse">
          International GCSE →
        </a>
        <a className={styles.linkAlt} href="/international/international-a-level">
          International A‑Level →
        </a>
        <a className={styles.link} href="/">
          Back to home
        </a>
      </div>
    </SeoPage>
  );
}

