import React, { useState } from 'react';

const IconShowcase = () => {
  const [activeTab, setActiveTab] = useState('system');

  // Inline style fallbacks so this file can be previewed without Tailwind.
  // (The original `className` strings are left in place for when Tailwind exists.)
  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#000',
      padding: 32,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      fontSize: 30,
      fontWeight: 800,
      textAlign: 'center',
      marginBottom: 8,
      backgroundImage: 'linear-gradient(90deg, #2dd4bf, #ec4899)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    },
    subheading: { color: '#6b7280', textAlign: 'center', marginBottom: 32 },
    tabs: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 },
    tab: {
      padding: '12px 20px',
      borderRadius: 12,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid #374151',
      background: '#111827',
      color: '#9ca3af',
    },
    tabActiveSystem: {
      border: '1px solid transparent',
      backgroundImage: 'linear-gradient(90deg, #14b8a6, #0d9488)',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(20,184,166,0.18)',
    },
    tabActivePower: {
      border: '1px solid transparent',
      backgroundImage: 'linear-gradient(90deg, #ec4899, #db2777)',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(236,72,153,0.18)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 16,
      maxWidth: 900,
      margin: '0 auto',
    },
    card: {
      background: '#111827',
      borderRadius: 16,
      padding: 20,
      border: '1px solid #1f2937',
      transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
    },
    cardInner: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    iconWrap: { marginBottom: 12, transform: 'translateZ(0)' },
    level: { fontSize: 12, color: '#4b5563', marginBottom: 6 },
    name: { fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 },
    points: { color: '#2dd4bf', fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', marginBottom: 10 },
    tagline: { color: '#6b7280', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
    palette: { marginTop: 40, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
    swatchRow: { display: 'flex', alignItems: 'center', gap: 10 },
    swatch: { width: 14, height: 14, borderRadius: 6, border: '1px solid #374151' },
    swatchLabel: { color: '#6b7280', fontSize: 13 },
  };

  // System Status Icons (Concept 1)
  const SystemIcons = {
    Standby: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#0d9488" strokeWidth="2" opacity="0.3"/>
        <text x="50" y="58" textAnchor="middle" fill="#14b8a6" fontSize="28" fontFamily="Arial" filter="url(#glow1)">Z</text>
        <text x="62" y="48" textAnchor="middle" fill="#14b8a6" fontSize="22" fontFamily="Arial" filter="url(#glow1)" opacity="0.7">z</text>
        <text x="72" y="40" textAnchor="middle" fill="#14b8a6" fontSize="16" fontFamily="Arial" filter="url(#glow1)" opacity="0.5">z</text>
      </svg>
    ),
    Booting: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
        <rect x="15" y="40" width="70" height="20" rx="4" fill="none" stroke="#0d9488" strokeWidth="2"/>
        <rect x="18" y="43" width="40" height="14" rx="2" fill="url(#loadGrad)" filter="url(#glow2)"/>
        <text x="50" y="75" textAnchor="middle" fill="#14b8a6" fontSize="10" fontFamily="monospace">57%</text>
      </svg>
    ),
    Online: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glow3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="powerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ec4899"/>
            <stop offset="100%" stopColor="#14b8a6"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="35" fill="none" stroke="url(#powerGrad)" strokeWidth="4" filter="url(#glow3)"/>
        <path d="M50 25 L50 50" stroke="#ec4899" strokeWidth="6" strokeLinecap="round" filter="url(#glow3)"/>
        <circle cx="50" cy="50" r="20" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.5"/>
      </svg>
    ),
    Overclocked: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glow4" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="30" width="50" height="40" rx="4" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glow4)"/>
        <rect x="35" y="38" width="30" height="24" fill="#0d9488" opacity="0.3"/>
        <line x1="30" y1="20" x2="30" y2="30" stroke="#14b8a6" strokeWidth="2"/>
        <line x1="50" y1="20" x2="50" y2="30" stroke="#14b8a6" strokeWidth="2"/>
        <line x1="70" y1="20" x2="70" y2="30" stroke="#14b8a6" strokeWidth="2"/>
        <line x1="30" y1="70" x2="30" y2="80" stroke="#14b8a6" strokeWidth="2"/>
        <line x1="50" y1="70" x2="50" y2="80" stroke="#14b8a6" strokeWidth="2"/>
        <line x1="70" y1="70" x2="70" y2="80" stroke="#14b8a6" strokeWidth="2"/>
        {/* Flames */}
        <path d="M35 35 Q38 28 40 35 Q42 25 45 35" fill="none" stroke="#ec4899" strokeWidth="2" filter="url(#glow4)"/>
        <path d="M55 35 Q58 25 60 35 Q62 28 65 35" fill="none" stroke="#ec4899" strokeWidth="2" filter="url(#glow4)"/>
      </svg>
    ),
    NeuralNet: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glow5" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Brain outline */}
        <ellipse cx="50" cy="50" rx="30" ry="28" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glow5)"/>
        {/* Neural connections */}
        <circle cx="35" cy="40" r="4" fill="#ec4899" filter="url(#glow5)"/>
        <circle cx="50" cy="35" r="4" fill="#ec4899" filter="url(#glow5)"/>
        <circle cx="65" cy="45" r="4" fill="#ec4899" filter="url(#glow5)"/>
        <circle cx="40" cy="55" r="4" fill="#ec4899" filter="url(#glow5)"/>
        <circle cx="55" cy="60" r="4" fill="#ec4899" filter="url(#glow5)"/>
        <circle cx="60" cy="50" r="3" fill="#14b8a6" filter="url(#glow5)"/>
        {/* Connection lines */}
        <line x1="35" y1="40" x2="50" y2="35" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
        <line x1="50" y1="35" x2="65" y2="45" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
        <line x1="35" y1="40" x2="40" y2="55" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
        <line x1="40" y1="55" x2="55" y2="60" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
        <line x1="65" y1="45" x2="60" y2="50" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
        <line x1="60" y1="50" x2="55" y2="60" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
        <line x1="50" y1="35" x2="60" y2="50" stroke="#14b8a6" strokeWidth="1" opacity="0.7"/>
      </svg>
    ),
    Singularity: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glow6" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="holeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000"/>
            <stop offset="60%" stopColor="#0d9488"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </radialGradient>
        </defs>
        {/* Accretion disk */}
        <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="#ec4899" strokeWidth="2" filter="url(#glow6)"/>
        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.7" filter="url(#glow6)"/>
        <ellipse cx="50" cy="50" rx="30" ry="9" fill="none" stroke="#ec4899" strokeWidth="1" opacity="0.5" filter="url(#glow6)"/>
        {/* Black hole center */}
        <circle cx="50" cy="50" r="12" fill="url(#holeGrad)" filter="url(#glow6)"/>
        <circle cx="50" cy="50" r="6" fill="#000"/>
      </svg>
    )
  };

  // Power Cell Icons (Concept 4)
  const PowerIcons = {
    LowPower: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glowP1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="30" width="45" height="40" rx="4" fill="none" stroke="#ec4899" strokeWidth="2" filter="url(#glowP1)"/>
        <rect x="70" y="42" width="8" height="16" rx="2" fill="#ec4899" filter="url(#glowP1)"/>
        <rect x="30" y="55" width="10" height="10" fill="#ec4899" filter="url(#glowP1)"/>
        <line x1="50" y1="45" x2="50" y2="55" stroke="#ec4899" strokeWidth="2"/>
        <line x1="45" y1="50" x2="55" y2="50" stroke="#ec4899" strokeWidth="2"/>
      </svg>
    ),
    Charging: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glowP2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="chargeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6"/>
            <stop offset="100%" stopColor="#eab308"/>
          </linearGradient>
        </defs>
        <rect x="25" y="30" width="45" height="40" rx="4" fill="none" stroke="#eab308" strokeWidth="2" filter="url(#glowP2)"/>
        <rect x="70" y="42" width="8" height="16" rx="2" fill="#eab308" filter="url(#glowP2)"/>
        <rect x="30" y="45" width="35" height="20" fill="url(#chargeGrad)" opacity="0.7" filter="url(#glowP2)"/>
        {/* Lightning bolt */}
        <path d="M50 35 L45 48 L52 48 L48 65 L55 48 L48 48 L53 35" fill="#eab308" filter="url(#glowP2)"/>
      </svg>
    ),
    FullCell: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glowP3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="30" width="45" height="40" rx="4" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glowP3)"/>
        <rect x="70" y="42" width="8" height="16" rx="2" fill="#14b8a6" filter="url(#glowP3)"/>
        <rect x="30" y="35" width="35" height="30" fill="#14b8a6" opacity="0.6" filter="url(#glowP3)"/>
        <text x="47" y="55" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="monospace">100</text>
      </svg>
    ),
    Overcharged: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glowP4" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="30" width="45" height="40" rx="4" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glowP4)"/>
        <rect x="70" y="42" width="8" height="16" rx="2" fill="#14b8a6" filter="url(#glowP4)"/>
        <rect x="30" y="35" width="35" height="30" fill="#14b8a6" opacity="0.6" filter="url(#glowP4)"/>
        {/* Sparks */}
        <path d="M20 25 L25 30 L22 32" stroke="#ec4899" strokeWidth="2" fill="none" filter="url(#glowP4)"/>
        <path d="M75 25 L70 28 L73 32" stroke="#ec4899" strokeWidth="2" fill="none" filter="url(#glowP4)"/>
        <path d="M18 50 L23 50" stroke="#ec4899" strokeWidth="2" filter="url(#glowP4)"/>
        <path d="M82 55 L78 52 L82 48" stroke="#ec4899" strokeWidth="2" fill="none" filter="url(#glowP4)"/>
        <path d="M22 70 L27 67" stroke="#ec4899" strokeWidth="2" filter="url(#glowP4)"/>
        <path d="M73 72 L68 68" stroke="#ec4899" strokeWidth="2" filter="url(#glowP4)"/>
      </svg>
    ),
    Nuclear: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glowP5" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glowP5)"/>
        <circle cx="50" cy="50" r="8" fill="#ec4899" filter="url(#glowP5)"/>
        {/* Radioactive segments */}
        <path d="M50 42 Q65 30 70 50 Q65 45 58 45 Q55 42 50 42" fill="#ec4899" filter="url(#glowP5)"/>
        <path d="M50 42 Q35 30 30 50 Q35 45 42 45 Q45 42 50 42" fill="#ec4899" filter="url(#glowP5)"/>
        <path d="M42 58 Q30 65 35 80 Q40 70 45 65 Q42 62 42 58" fill="#ec4899" filter="url(#glowP5)"/>
        <path d="M58 58 Q70 65 65 80 Q60 70 55 65 Q58 62 58 58" fill="#ec4899" filter="url(#glowP5)"/>
      </svg>
    ),
    UnlimitedPower: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20" style={{ width: 80, height: 80 }}>
        <defs>
          <filter id="glowP6" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="plasmaGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff"/>
            <stop offset="30%" stopColor="#ec4899"/>
            <stop offset="70%" stopColor="#14b8a6"/>
            <stop offset="100%" stopColor="#0d9488"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="25" fill="url(#plasmaGrad)" filter="url(#glowP6)"/>
        {/* Lightning bolts radiating out */}
        <path d="M50 20 L48 30 L52 30 L50 25" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M50 80 L52 70 L48 70 L50 75" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M20 50 L30 48 L30 52 L25 50" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M80 50 L70 52 L70 48 L75 50" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M28 28 L35 33 L33 35 L30 30" fill="#ec4899" filter="url(#glowP6)"/>
        <path d="M72 28 L65 33 L67 35 L70 30" fill="#ec4899" filter="url(#glowP6)"/>
        <path d="M28 72 L35 67 L33 65 L30 70" fill="#ec4899" filter="url(#glowP6)"/>
        <path d="M72 72 L65 67 L67 65 L70 70" fill="#ec4899" filter="url(#glowP6)"/>
      </svg>
    )
  };

  const systemData = [
    { name: 'Standby', points: '250', tagline: '"Conserving energy. Strategically."', Icon: SystemIcons.Standby },
    { name: 'Booting', points: '1,000', tagline: '"Knowledge loading... please wait."', Icon: SystemIcons.Booting },
    { name: 'Online', points: '5,000', tagline: '"Fully operational. Slightly dangerous."', Icon: SystemIcons.Online },
    { name: 'Overclocked', points: '20,000', tagline: '"Running hot. Can\'t be stopped."', Icon: SystemIcons.Overclocked },
    { name: 'Neural Net', points: '75,000', tagline: '"Thinking in algorithms now."', Icon: SystemIcons.NeuralNet },
    { name: 'Singularity', points: '200,000', tagline: '"You ARE the revision."', Icon: SystemIcons.Singularity },
  ];

  const powerData = [
    { name: 'Low Power', points: '250', tagline: '"Running on vibes and caffeine."', Icon: PowerIcons.LowPower },
    { name: 'Charging', points: '1,000', tagline: '"Absorbing knowledge."', Icon: PowerIcons.Charging },
    { name: 'Full Cell', points: '5,000', tagline: '"Ready for anything. Probably."', Icon: PowerIcons.FullCell },
    { name: 'Overcharged', points: '20,000', tagline: '"Warning: may cause excellence."', Icon: PowerIcons.Overcharged },
    { name: 'Nuclear', points: '75,000', tagline: '"Dangerously prepared."', Icon: PowerIcons.Nuclear },
    { name: 'Unlimited Power', points: '200,000', tagline: '"The grid can\'t contain you."', Icon: PowerIcons.UnlimitedPower },
  ];

  const activeData = activeTab === 'system' ? systemData : powerData;

  return (
    <div className="min-h-screen bg-black p-8" style={styles.page}>
      <h1
        className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-teal-400 to-pink-500 bg-clip-text text-transparent"
        style={styles.heading}
      >
        Study App Level Icons
      </h1>
      <p className="text-gray-500 text-center mb-8" style={styles.subheading}>
        Neon Cyber Theme
      </p>
      
      {/* Tab Buttons */}
      <div className="flex justify-center gap-4 mb-8" style={styles.tabs}>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'system'
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
              : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-teal-500'
          }`}
          style={{
            ...styles.tab,
            ...(activeTab === 'system' ? styles.tabActiveSystem : null),
          }}
        >
          ⚡ System Status
        </button>
        <button
          onClick={() => setActiveTab('power')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'power'
              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30'
              : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-pink-500'
          }`}
          style={{
            ...styles.tab,
            ...(activeTab === 'power' ? styles.tabActivePower : null),
          }}
        >
          🔋 Power Cell
        </button>
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto" style={styles.grid}>
        {activeData.map((item, index) => (
          <div
            key={item.name}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-teal-500 transition-all hover:shadow-lg hover:shadow-teal-500/10 group"
            style={styles.card}
          >
            <div className="flex flex-col items-center" style={styles.cardInner}>
              <div className="mb-4 transform group-hover:scale-110 transition-transform" style={styles.iconWrap}>
                <item.Icon />
              </div>
              <div className="text-xs text-gray-600 mb-1" style={styles.level}>
                Level {index + 1}
              </div>
              <h3 className="text-lg font-bold text-white mb-1" style={styles.name}>
                {item.name}
              </h3>
              <div className="text-teal-400 text-sm font-mono mb-2" style={styles.points}>
                {item.points} pts
              </div>
              <p className="text-gray-500 text-xs text-center italic" style={styles.tagline}>
                {item.tagline}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Color Palette Reference */}
      <div className="mt-12 flex justify-center gap-4" style={styles.palette}>
        <div className="flex items-center gap-2" style={styles.swatchRow}>
          <div className="w-4 h-4 rounded bg-black border border-gray-700" style={{ ...styles.swatch, background: '#000' }}></div>
          <span className="text-gray-500 text-sm" style={styles.swatchLabel}>Black</span>
        </div>
        <div className="flex items-center gap-2" style={styles.swatchRow}>
          <div className="w-4 h-4 rounded bg-teal-500" style={{ ...styles.swatch, background: '#14b8a6', borderColor: '#0d9488' }}></div>
          <span className="text-gray-500 text-sm" style={styles.swatchLabel}>Turquoise</span>
        </div>
        <div className="flex items-center gap-2" style={styles.swatchRow}>
          <div className="w-4 h-4 rounded bg-pink-500" style={{ ...styles.swatch, background: '#ec4899', borderColor: '#db2777' }}></div>
          <span className="text-gray-500 text-sm" style={styles.swatchLabel}>Neon Pink</span>
        </div>
      </div>
    </div>
  );
};

export default IconShowcase;
