import type { Metadata } from 'next';
import SeoPage from '../../components/SeoPage';
import styles from '../../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'Scottish Highers Revision | Study Support | FL4SH',
  description:
    'Scottish Highers revision support with structured topics and spaced repetition. Designed for effective, consistent study sessions.',
  alternates: { canonical: 'https://fl4shcards.com/scotland/highers' },
};

export default function ScottishHighersPage() {
  return (
    <SeoPage
      kicker="Scotland"
      title="Scottish Highers"
      subtitle="Stay consistent with structured revision and spaced repetition for long-term retention."
    >
      <section className={styles.card}>
        <h2>How FL4SH supports Highers students</h2>
        <ul className={styles.list}>
          <li>Topic structure to keep revision organised</li>
          <li>Spaced repetition to improve retention week-by-week</li>
          <li>Great for school PC study sessions</li>
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

