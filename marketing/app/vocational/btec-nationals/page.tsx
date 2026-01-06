import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'BTEC Nationals Revision | Vocational Study | FL4SH',
  description:
    'BTEC Nationals revision support with structured topics and spaced repetition. Built to help students cover the assessed content efficiently.',
  alternates: { canonical: 'https://fl4shcards.com/vocational/btec-nationals' },
};

export default function BtecNationalsPage() {
  return (
    <SeoPage
      kicker="Vocational"
      title="BTEC Nationals (Pearson)"
      subtitle="Revise vocational course content with a structured topic map and consistent spaced repetition."
    >
      <section className={styles.card}>
        <h2>What you’ll get</h2>
        <ul className={styles.list}>
          <li>Specification-aligned revision structure</li>
          <li>Retention-focused spaced repetition (Leitner system)</li>
          <li>Clear, bite-sized review for regular study sessions</li>
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

