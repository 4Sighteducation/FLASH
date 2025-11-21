'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Countdown from './Countdown'
import styles from './ComingSoonButton.module.css'

interface Props {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function ComingSoonButton({ children, variant = 'primary', className = '' }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      // Lock body scroll and maintain scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [showModal])

  const modalContent = showModal ? (
    <div className={styles.modal} onClick={() => setShowModal(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
        
        <div className={styles.emoji}>⏰</div>
        <h2 className={styles.title}>Patience, Young Padawan! 🧘‍♂️</h2>
        <p className={styles.subtitle}>
          FL4SH is launching soon and it's going to be <span className={styles.highlight}>epic</span>!
        </p>
        
        <div className={styles.countdownContainer}>
          <p className={styles.launchText}>Launching in:</p>
          <Countdown />
        </div>
        
        <div className={styles.launchDate}>
          <strong>Saturday, February 1st, 2025</strong>
        </div>
        
        <p className={styles.offer}>
          🎁 First 20 signups get <strong className={styles.highlight}>Pro FREE for 1 YEAR</strong>
        </p>
        
        <div className={styles.actions}>
          <button onClick={() => {
            setShowModal(false)
            const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
            emailInput?.focus()
          }} className={styles.joinBtn}>
            Join Waitlist Now →
          </button>
          <button onClick={() => setShowModal(false)} className={styles.okBtn}>
            Got It!
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className={`${className} ${styles.btn} ${variant === 'primary' ? styles.btnPrimary : styles.btnSecondary}`}
      >
        {children}
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}

