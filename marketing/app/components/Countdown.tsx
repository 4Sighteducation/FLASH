'use client'

import { useState, useEffect } from 'react'
import styles from './Countdown.module.css'

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const launchDate = new Date('2025-02-01T00:00:00').getTime()

    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = launchDate - now

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.countdown}>
      <div className={styles.timeUnit}>
        <span className={styles.number}>{timeLeft.days}</span>
        <span className={styles.label}>Days</span>
      </div>
      <span className={styles.separator}>:</span>
      <div className={styles.timeUnit}>
        <span className={styles.number}>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className={styles.label}>Hours</span>
      </div>
      <span className={styles.separator}>:</span>
      <div className={styles.timeUnit}>
        <span className={styles.number}>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className={styles.label}>Mins</span>
      </div>
      <span className={styles.separator}>:</span>
      <div className={styles.timeUnit}>
        <span className={styles.number}>{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className={styles.label}>Secs</span>
      </div>
    </div>
  )
}

