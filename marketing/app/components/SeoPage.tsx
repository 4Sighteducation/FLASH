import React from 'react';
import styles from './SeoPage.module.css';

type Props = {
  kicker: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function SeoPage({ kicker, title, subtitle, children }: Props) {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.kicker}>{kicker}</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

