import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'International A‑Level Revision | Flashcards | FL4SH',
  description:
    'International A‑Level revision support with structured topics and spaced repetition to help you retain key content and build exam confidence.',
  alternates: { canonical: 'https://fl4shcards.com/international/international-a-level' },
};

export default function InternationalALevelPage() {
  return (
    <SeoPage
      kicker="International"
      title="International A‑Level"
      subtitle="For students studying A‑Levels worldwide — revise consistently with structured topics and spaced repetition."
    >
      <section className={styles.card}>
        <h2>Designed for deep understanding</h2>
        <ul className={styles.list}>
          <li>Organised topic coverage to reduce gaps</li>
          <li>Spaced repetition to retain key definitions and evaluation points</li>
          <li>Support for school-based independent study</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/contact">
          Schools & bulk pricing →
        </a>
        <a className={styles.link} href="/international">
          Back to international hub
        </a>
      </div>
    </SeoPage>
  );
}

