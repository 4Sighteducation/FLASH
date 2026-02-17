import React, { useState, useEffect } from 'react';

const COLORS = {
  cyan: '#00F5FF',
  cyanMuted: '#00C4CC',
  cyanDark: '#0D9488',
  pink: '#FF006E',
  pinkMuted: '#EC4899',
  white: '#FFFFFF',
  gray: '#64748B',
  grayDark: '#374151',
  black: '#000000',
  gold: '#FBBF24',
};

// Glow wrapper simulating RN shadows
const GlowWrapper = ({ children, glowColor, intensity = 'medium', size, animated = false, animationClass = '' }) => {
  const shadowSize = intensity === 'high' ? 25 : intensity === 'medium' ? 15 : 8;
  const shadowOpacity = intensity === 'high' ? 0.8 : intensity === 'medium' ? 0.6 : 0.4;
  
  return (
    <div 
      className={animated ? animationClass : ''}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: `drop-shadow(0 0 ${shadowSize}px ${glowColor})`,
        opacity: 1,
      }}
    >
      {children}
    </div>
  );
};

// LEVEL 1: STANDBY
const StandbyIcon = ({ size = 80, animated = false }) => (
  <GlowWrapper glowColor={COLORS.pink} intensity="low" size={size}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke={COLORS.pinkMuted} strokeWidth="2" opacity="0.3" />
      <text x="30" y="40" fill={COLORS.pink} fontSize="18" fontWeight="bold" opacity="0.5" className={animated ? 'pulse-opacity' : ''}>Z</text>
      <text x="42" y="55" fill={COLORS.pink} fontSize="22" fontWeight="bold" opacity="0.7" className={animated ? 'pulse-opacity' : ''}>Z</text>
      <text x="55" y="72" fill={COLORS.pink} fontSize="26" fontWeight="bold" opacity="0.9" className={animated ? 'pulse-opacity' : ''}>Z</text>
    </svg>
  </GlowWrapper>
);

// LEVEL 2: WAKING UP
const WakingUpIcon = ({ size = 80, animated = false }) => (
  <GlowWrapper glowColor={COLORS.cyan} intensity="low" size={size}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="15" y="20" width="70" height="60" rx="6" fill="none" stroke={COLORS.cyanDark} strokeWidth="2" />
      <rect x="15" y="20" width="70" height="12" rx="6" fill={COLORS.cyanDark} opacity="0.3" />
      <circle cx="25" cy="26" r="2" fill={COLORS.pink} opacity="0.7" />
      <circle cx="33" cy="26" r="2" fill={COLORS.cyan} opacity="0.5" />
      <text x="22" y="52" fill={COLORS.cyan} fontSize="12" fontFamily="monospace" opacity="0.7">&gt;_</text>
      <rect x="45" y="42" width="8" height="14" fill={COLORS.cyan} className={animated ? 'blink' : ''} />
    </svg>
  </GlowWrapper>
);

// LEVEL 3: BOOTING
const BootingIcon = ({ size = 80, animated = false }) => {
  const [progress, setProgress] = useState(35);
  
  useEffect(() => {
    if (!animated) {
      setProgress(57);
      return;
    }
    
    let increasing = true;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) increasing = false;
        if (prev <= 35) increasing = true;
        return increasing ? prev + 2 : prev - 1.5;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [animated]);
  
  return (
    <GlowWrapper glowColor={COLORS.cyan} intensity="medium" size={size}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="loadingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={COLORS.cyan} />
            <stop offset="100%" stopColor={COLORS.pink} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.cyanDark} strokeWidth="2" opacity="0.4" />
        <rect x="20" y="42" width="60" height="16" rx="8" fill={COLORS.cyanDark} opacity="0.3" />
        <rect x="22" y="44" width={progress * 0.56} height="12" rx="6" fill="url(#loadingGrad)" style={{ transition: 'width 0.05s linear' }} />
        <rect x="22" y="44" width={progress * 0.56} height="4" rx="2" fill={COLORS.white} opacity="0.2" style={{ transition: 'width 0.05s linear' }} />
        <text x="50" y="72" textAnchor="middle" fill={COLORS.cyan} fontSize="11" fontFamily="monospace">{Math.round(progress)}%</text>
      </svg>
    </GlowWrapper>
  );
};

// LEVEL 4: ONLINE
const OnlineIcon = ({ size = 80, animated = false }) => (
  <GlowWrapper glowColor={COLORS.pink} intensity="high" size={size} animated={animated} animationClass="pulse">
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="powerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.pink} />
          <stop offset="100%" stopColor={COLORS.cyan} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.pink} strokeWidth="1" opacity="0.2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={COLORS.pink} strokeWidth="2" opacity="0.3" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="url(#powerRingGrad)" strokeWidth="4" />
      <circle cx="50" cy="50" r="28" fill="none" stroke={COLORS.cyan} strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="22" x2="50" y2="45" stroke={COLORS.pink} strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="22" x2="50" y2="45" stroke={COLORS.white} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <circle cx="50" cy="50" r="4" fill={COLORS.pink} />
      <circle cx="50" cy="50" r="2" fill={COLORS.white} />
      <line x1="15" y1="50" x2="22" y2="50" stroke={COLORS.cyan} strokeWidth="2" opacity="0.6" />
      <line x1="78" y1="50" x2="85" y2="50" stroke={COLORS.cyan} strokeWidth="2" opacity="0.6" />
    </svg>
  </GlowWrapper>
);

// LEVEL 5: OVERCLOCKED
const OverclockedIcon = ({ size = 80, animated = false }) => (
  <GlowWrapper glowColor={COLORS.pink} intensity="high" size={size} animated={animated} animationClass="pulse">
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="cpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.cyan} />
          <stop offset="100%" stopColor={COLORS.cyanDark} />
        </linearGradient>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={COLORS.pink} />
          <stop offset="50%" stopColor={COLORS.pinkMuted} />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
      <rect x="28" y="35" width="44" height="40" rx="4" fill="url(#cpuGrad)" />
      <rect x="35" y="42" width="30" height="26" rx="2" fill={COLORS.cyanDark} />
      <rect x="40" y="47" width="20" height="16" rx="1" fill={COLORS.cyan} opacity="0.3" />
      <line x1="35" y1="35" x2="35" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="45" y1="35" x2="45" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="55" y1="35" x2="55" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="65" y1="35" x2="65" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="28" y1="45" x2="21" y2="45" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="28" y1="55" x2="21" y2="55" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="28" y1="65" x2="21" y2="65" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="72" y1="45" x2="79" y2="45" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="72" y1="55" x2="79" y2="55" stroke={COLORS.cyan} strokeWidth="2" />
      <line x1="72" y1="65" x2="79" y2="65" stroke={COLORS.cyan} strokeWidth="2" />
      <path d="M38 35 Q40 20 45 28 Q43 15 50 22 Q52 10 55 22 Q60 15 57 28 Q62 20 62 35" fill="url(#flameGrad)" className={animated ? 'flicker' : ''} />
      <path d="M45 32 Q48 22 50 28 Q52 22 55 32" fill={COLORS.white} opacity="0.4" />
    </svg>
  </GlowWrapper>
);

// LEVEL 6: NEURAL NET
const NeuralNetIcon = ({ size = 80, animated = false }) => (
  <GlowWrapper glowColor={COLORS.cyan} intensity="high" size={size} animated={animated} animationClass="pulse">
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.cyan} />
          <stop offset="100%" stopColor={COLORS.pink} />
        </linearGradient>
      </defs>
      <path d="M50 15 Q70 15 78 30 Q85 45 80 60 Q75 75 60 82 Q50 88 40 82 Q25 75 20 60 Q15 45 22 30 Q30 15 50 15" fill="none" stroke="url(#brainGrad)" strokeWidth="3" />
      <path d="M50 20 Q48 50 50 80" fill="none" stroke={COLORS.cyanDark} strokeWidth="1" opacity="0.5" />
      <circle cx="32" cy="35" r="4" fill={COLORS.cyan} />
      <circle cx="28" cy="55" r="3" fill={COLORS.cyan} />
      <circle cx="35" cy="68" r="4" fill={COLORS.cyan} />
      <circle cx="42" cy="45" r="3" fill={COLORS.cyan} />
      <path d="M32 35 L42 45 L28 55 L35 68" fill="none" stroke={COLORS.cyan} strokeWidth="1.5" />
      <path d="M32 35 L28 55" fill="none" stroke={COLORS.cyan} strokeWidth="1" opacity="0.5" />
      <circle cx="68" cy="35" r="4" fill={COLORS.pink} />
      <circle cx="72" cy="55" r="3" fill={COLORS.pink} />
      <circle cx="65" cy="68" r="4" fill={COLORS.pink} />
      <circle cx="58" cy="45" r="3" fill={COLORS.pink} />
      <path d="M68 35 L58 45 L72 55 L65 68" fill="none" stroke={COLORS.pink} strokeWidth="1.5" />
      <path d="M68 35 L72 55" fill="none" stroke={COLORS.pink} strokeWidth="1" opacity="0.5" />
      <path d="M42 45 L58 45" fill="none" stroke={COLORS.white} strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="50" r="6" fill={COLORS.cyanDark} />
      <circle cx="50" cy="50" r="4" fill={COLORS.cyan} />
      <circle cx="50" cy="50" r="2" fill={COLORS.white} />
    </svg>
  </GlowWrapper>
);

// LEVEL 7: SINGULARITY
const SingularityIcon = ({ size = 80, animated = false }) => (
  <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* Rotating outer rings */}
    <div className={animated ? 'spin-slow' : ''} style={{ position: 'absolute', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke={COLORS.pink} strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.cyan} strokeWidth="1" opacity="0.4" />
        <circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.pink} strokeWidth="2" opacity="0.5" />
      </svg>
    </div>
    
    {/* Main singularity */}
    <GlowWrapper glowColor={COLORS.gold} intensity="high" size={size * 0.8} animated={animated} animationClass="pulse">
      <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
        <defs>
          <radialGradient id="singularityGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.black} />
            <stop offset="60%" stopColor={COLORS.black} />
            <stop offset="80%" stopColor={COLORS.gold} />
            <stop offset="100%" stopColor={COLORS.pink} />
          </radialGradient>
          <radialGradient id="eventHorizonGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.white} />
            <stop offset="40%" stopColor={COLORS.gold} />
            <stop offset="100%" stopColor={COLORS.pink} />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="35" fill="none" stroke={COLORS.gold} strokeWidth="3" />
        <circle cx="50" cy="50" r="30" fill="none" stroke={COLORS.pink} strokeWidth="6" opacity="0.4" />
        <circle cx="50" cy="50" r="22" fill="url(#singularityGrad)" />
        <circle cx="50" cy="50" r="18" fill="none" stroke={COLORS.gold} strokeWidth="2" opacity="0.8" />
        <circle cx="50" cy="50" r="8" fill="url(#eventHorizonGrad)" />
        <circle cx="50" cy="50" r="4" fill={COLORS.white} />
        <path d="M50 5 L48 18 L50 15 L52 18 Z" fill={COLORS.gold} />
        <path d="M50 95 L52 82 L50 85 L48 82 Z" fill={COLORS.gold} />
      </svg>
    </GlowWrapper>
  </div>
);

const LEVEL_DATA = [
  { id: 'standby', name: 'Standby', points: 0, tagline: 'Currently in sleep mode.', Icon: StandbyIcon },
  { id: 'wakingUp', name: 'Waking Up', points: 250, tagline: 'Cursor blinking. Brain loading.', Icon: WakingUpIcon },
  { id: 'booting', name: 'Booting', points: 1000, tagline: 'Knowledge loading... please wait.', Icon: BootingIcon },
  { id: 'online', name: 'Online', points: 5000, tagline: 'Fully operational. Slightly dangerous.', Icon: OnlineIcon },
  { id: 'overclocked', name: 'Overclocked', points: 20000, tagline: "Running hot. Can't be stopped.", Icon: OverclockedIcon },
  { id: 'neuralNet', name: 'Neural Net', points: 75000, tagline: 'Thinking in algorithms now.', Icon: NeuralNetIcon },
  { id: 'singularity', name: 'Singularity', points: 200000, tagline: 'You ARE the revision.', Icon: SingularityIcon },
];

const LevelIconsPreview = () => {
  const [animated, setAnimated] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const styles = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes flicker {
      0%, 100% { opacity: 1; transform: scaleY(1); }
      50% { opacity: 0.8; transform: scaleY(0.95); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse-opacity {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    .pulse { animation: pulse 2s ease-in-out infinite; }
    .blink { animation: blink 1s ease-in-out infinite; }
    .flicker { animation: flicker 0.3s ease-in-out infinite; }
    .spin-slow { animation: spin-slow 8s linear infinite; }
    .pulse-opacity { animation: pulse-opacity 2s ease-in-out infinite; }
  `;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1E',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{styles}</style>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 4,
          color: COLORS.cyan,
          textShadow: `0 0 20px ${COLORS.cyan}60`,
        }}>
          FL4SH Level Icons
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 16 }}>
          React Native Compatible • No SVG Filters
        </p>
        
        {/* Animation toggle */}
        <button
          onClick={() => setAnimated(!animated)}
          style={{
            padding: '8px 20px',
            background: animated ? COLORS.cyan : 'transparent',
            border: `2px solid ${COLORS.cyan}`,
            borderRadius: 999,
            color: animated ? '#000' : COLORS.cyan,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {animated ? '✓ Animations On' : 'Animations Off'}
        </button>
      </div>

      {/* Icon grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 24,
        maxWidth: 900,
        margin: '0 auto',
      }}>
        {LEVEL_DATA.map((level, index) => {
          const Icon = level.Icon;
          const isSelected = selectedLevel === level.id;
          
          return (
            <div
              key={level.id}
              onClick={() => setSelectedLevel(isSelected ? null : level.id)}
              style={{
                background: isSelected ? '#141E37' : '#0D1425',
                borderRadius: 16,
                padding: 20,
                textAlign: 'center',
                border: `1px solid ${isSelected ? COLORS.cyan : '#1E3A5F'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? `0 0 20px ${COLORS.cyan}30` : 'none',
              }}
            >
              {/* Level number */}
              <div style={{
                fontSize: 10,
                color: '#64748B',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}>
                LEVEL {index + 1}
              </div>
              
              {/* Icon */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Icon size={70} animated={animated} />
              </div>
              
              {/* Name */}
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.white,
                marginBottom: 4,
              }}>
                {level.name}
              </div>
              
              {/* Points */}
              <div style={{
                fontSize: 12,
                color: COLORS.cyan,
                fontFamily: 'monospace',
                marginBottom: 8,
              }}>
                {level.points.toLocaleString()} XP
              </div>
              
              {/* Tagline */}
              <div style={{
                fontSize: 11,
                color: '#64748B',
                fontStyle: 'italic',
              }}>
                "{level.tagline}"
              </div>
            </div>
          );
        })}
      </div>

      {/* Implementation note */}
      <div style={{
        maxWidth: 700,
        margin: '40px auto 0',
        padding: 20,
        background: '#141E37',
        borderRadius: 12,
        border: `1px solid #1E3A5F`,
      }}>
        <h3 style={{ color: COLORS.cyan, fontSize: 14, marginBottom: 12 }}>
          ✓ React Native Compatible Features
        </h3>
        <ul style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
          <li>Uses <code style={{ color: COLORS.pink }}>react-native-svg</code> basic shapes only</li>
          <li>Glow via iOS shadows + Android elevation/underlays</li>
          <li>Animations via <code style={{ color: COLORS.pink }}>Animated</code> API with <code style={{ color: COLORS.pink }}>useNativeDriver</code></li>
          <li>LinearGradient/RadialGradient (supported in react-native-svg)</li>
          <li>No feGaussianBlur, feMerge, or filter effects</li>
        </ul>
      </div>
      
      {/* Comparison note */}
      <div style={{
        maxWidth: 700,
        margin: '20px auto 0',
        padding: 16,
        background: `${COLORS.pink}15`,
        borderRadius: 12,
        border: `1px solid ${COLORS.pink}30`,
        textAlign: 'center',
      }}>
        <p style={{ color: '#D6BCAB', fontSize: 13, margin: 0 }}>
          💡 These won't have the same intense blur-glow as the SVG filter versions, 
          but they'll actually <strong>work</strong> on iOS and Android!
        </p>
      </div>
    </div>
  );
};

export default LevelIconsPreview;
