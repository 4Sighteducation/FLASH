'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './Navigation.module.css'

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.navContent}>
          <a href="/" className={styles.logo}>
            <Image 
              src="/flash_assets/flash-logo-transparent.png" 
              alt="FL4SH" 
              width={50} 
              height={50}
              className={styles.logoImg}
            />
            <span className={styles.logoText}>FL<span className={styles.accent}>4</span>SH</span>
          </a>
          
          {/* Desktop Nav Links */}
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#subjects">Subjects</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
          </div>
          
          {/* Desktop CTA */}
          <div className={styles.navCta}>
            <a href="/contact" className={styles.btnPrimary}>
              Schools & Bulk Pricing →
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button 
            className={styles.hamburger} 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className={mobileMenuOpen ? styles.open : ''}></span>
            <span className={mobileMenuOpen ? styles.open : ''}></span>
            <span className={mobileMenuOpen ? styles.open : ''}></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#subjects" onClick={closeMenu}>Subjects</a>
            <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
            <a href="#pricing" onClick={closeMenu}>Pricing</a>
            <a href="/contact" className={styles.mobileCta} onClick={closeMenu}>
              Schools & Bulk Pricing →
            </a>
          </div>
        )}
      </div>
    </nav>
  )
}

