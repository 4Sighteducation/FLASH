import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'Scottish Nationals Revision | Study Support | FL4SH',
  description:
    'Scottish Nationals revision support with structured topics and spaced repetition. Designed for effective, consistent study sessions.',
  alternates: { canonical: 'https://fl4shcards.com/scotland/nationals' },
};

export default function ScottishNationalsPage() {
  return (
    <SeoPage
      kicker="Scotland"
      title="Scottish Nationals"
      subtitle="Build strong foundations with structured revision and spaced repetition."
    >
      <section className={styles.card}>
        <h2>Designed for steady progress</h2>
        <ul className={styles.list}>
          <li>Simple structure to support classwork and homework</li>
          <li>Spaced repetition to keep key content fresh</li>
          <li>Ideal for short daily study sessions</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/contact">
          Schools & bulk pricing →
        </a>
        <a className={styles.link} href="/scotland">
          Back to Scotland hub
        </a>
      </div>
    </SeoPage>
  );
}

