import type { Metadata } from 'next';
import SeoPage from '../components/SeoPage';
import styles from '../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'Vocational Qualifications | Cambridge Nationals & BTEC Nationals | FL4SH',
  description:
    'Revision support for vocational qualifications including Cambridge Nationals and BTEC Nationals. Specification-driven topics and spaced repetition.',
  alternates: { canonical: 'https://fl4shcards.com/vocational' },
};

export default function VocationalHubPage() {
  return (
    <SeoPage
      kicker="Qualifications"
      title="Vocational Awards & Qualifications"
      subtitle="Built for students taking vocational pathways — with structured topics, focused practice, and exam technique."
    >
      <section className={styles.card}>
        <h2>Included pathways</h2>
        <ul className={styles.list}>
          <li>Cambridge Nationals (OCR)</li>
          <li>BTEC Nationals (Pearson)</li>
        </ul>
      </section>

      <section className={styles.card}>
        <h2>How FL4SH helps</h2>
        <ul className={styles.list}>
          <li>Specification-driven topic structure (so you cover exactly what’s assessed)</li>
          <li>Spaced repetition for key terms, processes, and evaluation points</li>
          <li>Useful for school-based PC study sessions and independent revision</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/vocational/cambridge-nationals">
          Cambridge Nationals →
        </a>
        <a className={styles.linkAlt} href="/vocational/btec-nationals">
          BTEC Nationals →
        </a>
        <a className={styles.link} href="/">
          Back to home
        </a>
      </div>
    </SeoPage>
  );
}

