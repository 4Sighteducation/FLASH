import type { Metadata } from 'next';
import SeoPage from '../components/SeoPage';
import styles from '../components/SeoPage.module.css';

export const metadata: Metadata = {
  title: 'Scottish Qualifications | Nationals & Highers Revision | FL4SH',
  description:
    'Revision support for Scottish qualifications including Nationals and Highers. Structured topics and spaced repetition for consistent progress.',
  alternates: { canonical: 'https://fl4shcards.com/scotland' },
};

export default function ScotlandHubPage() {
  return (
    <SeoPage
      kicker="Scotland"
      title="Scottish Nationals & Highers"
      subtitle="Revision support for students studying Scottish qualifications — designed for consistent practice and long-term retention."
    >
      <section className={styles.card}>
        <h2>Scottish pathways</h2>
        <ul className={styles.list}>
          <li>Scottish Nationals</li>
          <li>Scottish Highers</li>
        </ul>
      </section>

      <div className={styles.links}>
        <a className={styles.linkAlt} href="/scotland/nationals">
          Scottish Nationals →
        </a>
        <a className={styles.linkAlt} href="/scotland/highers">
          Scottish Highers →
        </a>
        <a className={styles.link} href="/">
          Back to home
        </a>
      </div>
    </SeoPage>
  );
}

