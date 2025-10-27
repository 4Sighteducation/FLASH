import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FL4SH Flashcards | GCSE & A-Level Revision Cards | AI-Powered Study',
  description: 'Master GCSE & A-Levels with FL4SH flashcards. AI-powered revision cards for all UK exam boards (AQA, Edexcel, OCR). 10,000+ topics, past papers included. Free to start.',
  keywords: 'flashcards, GCSE flashcards, A-Level flashcards, revision cards, flash cards, GCSE revision, A-Level revision, AQA flashcards, Edexcel flashcards, OCR flashcards, WJEC flashcards, spaced repetition, Leitner system, UK exam boards, AI study tools, exam revision, study cards, digital flashcards, online flashcards',
  authors: [{ name: '4Sight Education Ltd' }],
  creator: '4Sight Education Ltd',
  publisher: '4Sight Education Ltd',
  alternates: {
    canonical: 'https://www.fl4sh.cards',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'FL4SH Flashcards - AI-Powered Revision for GCSE & A-Level',
    description: 'Ace your GCSEs & A-Levels with FL4SH flashcards. AI-generated revision cards, intelligent spaced repetition, and 10,000+ curriculum-aligned topics.',
    url: 'https://www.fl4sh.cards',
    siteName: 'FL4SH Flashcards',
    images: [
      {
        url: 'https://www.fl4sh.cards/flash_assets/flash-logo-512.png',
        width: 512,
        height: 512,
        alt: 'FL4SH - AI-Powered Flashcards for GCSE & A-Level',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FL4SH Flashcards - AI-Powered Revision for GCSE & A-Level',
    description: 'Ace your GCSEs & A-Levels with FL4SH flashcards. AI-generated revision cards and intelligent spaced repetition.',
    images: ['https://www.fl4sh.cards/flash_assets/flash-logo-512.png'],
  },
  verification: {
    google: 'add-your-google-search-console-code-here',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="/flash_assets/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/flash_assets/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/flash_assets/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/flash_assets/favicon-48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/flash_assets/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A1F" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}

