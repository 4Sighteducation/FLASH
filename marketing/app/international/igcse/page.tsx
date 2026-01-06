import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'International GCSE (iGCSE) Revision | Flashcards | FL4SH',
  description:
    'International GCSE (iGCSE) revision support with structured topics and spaced repetition to help you retain key content.',
  alternates: { canonical: 'https://fl4shcards.com/international/igcse' },
};

export default function IgcsePage() {
  return (
    <SeoPage
      kicker="International"
      title="International GCSE (iGCSE)"
      subtitle="UK qualifications taught worldwide — revise with a clear topic structure and consistent spaced repetition."
    >
      <section className={styles.card}>
        <h2>Why it works for iGCSE</h2>
        <ul className={styles.list}>
          <li>Structured revision that matches how courses are taught</li>
          <li>Spaced repetition to reduce cramming and improve retention</li>
          <li>Great for independent study on school PCs</li>
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

