'use client'

import { useState } from 'react'
import Countdown from './Countdown'
import styles from './LaunchBanner.module.css'

export default function LaunchBanner() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setEmail('')
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setError('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className={styles.banner}>
        <div className={styles.container}>
          <p className={styles.success}>
            🎉 <strong>You're on the list!</strong> Check your email for early access details.
            {' '}<span className={styles.highlight}>First 20 get Pro FREE for 1 year!</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.banner}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.message}>
            <span className={styles.badge}>🚀 FEB 1ST 2025</span>
            <Countdown />
            <p>
              Get <strong className={styles.highlight}>Pro FREE for 1 YEAR</strong> - 
              First 20 early access users only!
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              placeholder="Enter your email for early access"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              disabled={loading}
            />
            <button 
              type="submit" 
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Get Early Access →'}
            </button>
          </form>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  )
}

