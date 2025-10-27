// Google Analytics Component
// Add your GA4 Measurement ID when ready

export default function Analytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';
  
  if (!GA_MEASUREMENT_ID) {
    return null; // Don't render if no ID set
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

// TO USE:
// 1. Get GA4 Measurement ID from https://analytics.google.com
// 2. Add to .env.local: NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
// 3. Import in layout.tsx: import Analytics from './components/Analytics'
// 4. Add in <head>: <Analytics />

