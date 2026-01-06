import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'Cambridge Nationals Revision | Vocational Study | FL4SH',
  description:
    'Cambridge Nationals revision support with structured topics and spaced repetition. Built to help students cover the assessed content efficiently.',
  alternates: { canonical: 'https://fl4shcards.com/vocational/cambridge-nationals' },
};

export default function CambridgeNationalsPage() {
  return (
    <SeoPage
      kicker="Vocational"
      title="Cambridge Nationals (OCR)"
      subtitle="A vocational pathway used widely in schools — revise with structured topics and focused practice."
    >
      <section className={styles.card}>
        <h2>Designed for vocational learning</h2>
        <ul className={styles.list}>
          <li>Clear topic structure to support classroom teaching and homework</li>
          <li>Spaced repetition to retain definitions, processes, and key evaluation points</li>
          <li>Great for students revising on school PCs</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/contact">
          Schools & bulk pricing →
        </a>
        <a className={styles.link} href="/vocational">
          Back to vocational hub
        </a>
      </div>
    </SeoPage>
  );
}

