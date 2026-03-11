import React, { useState } from 'react';

const FL4SHThemePreview = () => {
  const [activeTheme, setActiveTheme] = useState('cyber');
  const [colorScheme, setColorScheme] = useState('dark');

  const themes = {
    cyber: {
      name: 'Cyber',
      tagline: 'System initialised. Welcome to the grid.',
      unlockXP: 0,
      dark: {
        primary: '#00F5FF',
        secondary: '#FF006E',
        tertiary: '#7C4DFF',
        background: '#0A0F1E',
        backgroundAlt: '#0D1425',
        surface: '#141E37',
        surfaceElevated: '#1A2744',
        text: '#FFFFFF',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        border: '#1E3A5F',
        glow: '#00F5FF',
      },
      light: {
        primary: '#00B4D8',
        secondary: '#E5006A',
        tertiary: '#6C3FD1',
        background: '#F0F4F8',
        backgroundAlt: '#E2E8F0',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        text: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#94A3B8',
        border: '#CBD5E1',
        glow: '#00B4D8',
      },
      radius: 8,
      animationNote: 'Subtle pulse, fast timing (150-250ms)',
    },
    pulse: {
      name: 'Pulse',
      tagline: 'First heartbeat detected. System alive.',
      unlockXP: 1000,
      dark: {
        primary: '#FF6B35',
        secondary: '#FF006E',
        tertiary: '#FBBF24',
        background: '#120A08',
        backgroundAlt: '#1A0F0C',
        surface: '#281612',
        surfaceElevated: '#321C16',
        text: '#FFF7ED',
        textSecondary: '#D6BCAB',
        textMuted: '#A8968A',
        border: '#4A2E24',
        glow: '#FF6B35',
      },
      light: {
        primary: '#E55A2B',
        secondary: '#D10058',
        tertiary: '#D97706',
        background: '#FFF8F5',
        backgroundAlt: '#FFF0EB',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        text: '#2D1810',
        textSecondary: '#6B4B3E',
        textMuted: '#9C8479',
        border: '#E8D5CC',
        glow: '#E55A2B',
      },
      radius: 20,
      animationNote: 'Breathing scale, heartbeat glow (200-350ms)',
    },
    aurora: {
      name: 'Aurora',
      tagline: "You've transcended the grid. Welcome to the sky.",
      unlockXP: 20000,
      dark: {
        primary: '#22D3EE',
        secondary: '#A855F7',
        tertiary: '#34D399',
        background: '#050A14',
        backgroundAlt: '#0A1020',
        surface: '#0F1932',
        surfaceElevated: '#152242',
        text: '#F0FDFA',
        textSecondary: '#A5B4C6',
        textMuted: '#6B7A8E',
        border: '#1E3A5F',
        glow: '#22D3EE',
      },
      light: {
        primary: '#0891B2',
        secondary: '#9333EA',
        tertiary: '#059669',
        background: '#F0FDFA',
        backgroundAlt: '#E0F7F5',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        text: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#94A3B8',
        border: '#A7F3D0',
        glow: '#0891B2',
      },
      radius: 26,
      animationNote: 'Floating, ethereal timing (250-450ms)',
    },
    singularity: {
      name: 'Singularity',
      tagline: 'You ARE the revision. Reality bends to your will.',
      unlockXP: 200000,
      dark: {
        primary: '#FBBF24',
        secondary: '#F472B6',
        tertiary: '#FFFFFF',
        background: '#000000',
        backgroundAlt: '#030206',
        surface: '#0A0612',
        surfaceElevated: '#120B1A',
        text: '#FFFBEB',
        textSecondary: '#D4AF37',
        textMuted: '#A08630',
        border: '#3D2F14',
        glow: '#FBBF24',
      },
      light: {
        primary: '#D97706',
        secondary: '#DB2777',
        tertiary: '#000000',
        background: '#FFFBEB',
        backgroundAlt: '#FEF3C7',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        text: '#1C1917',
        textSecondary: '#78716C',
        textMuted: '#A8A29E',
        border: '#FDE68A',
        glow: '#D97706',
      },
      radius: 22,
      animationNote: 'Intense glow, dramatic timing (200-700ms)',
    },
  };

  const t = themes[activeTheme];
  const c = t[colorScheme];

  // CSS for animations
  const styles = `
    @keyframes pulse-breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 15px ${c.glow}40, 0 0 30px ${c.glow}20; }
      50% { box-shadow: 0 0 25px ${c.glow}60, 0 0 50px ${c.glow}30; }
    }
    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      14% { transform: scale(1.04); }
      28% { transform: scale(1); }
      42% { transform: scale(1.025); }
      56% { transform: scale(1); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .animate-pulse { animation: pulse-breathe 2s ease-in-out infinite; }
    .animate-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }
    .animate-float { animation: float 4s ease-in-out infinite; }
    .animate-glow { animation: pulse-glow 2s ease-in-out infinite; }
  `;

  const getAnimation = () => {
    switch (activeTheme) {
      case 'pulse': return 'animate-heartbeat';
      case 'aurora': return 'animate-float';
      case 'singularity': return 'animate-glow animate-pulse';
      default: return 'animate-pulse';
    }
  };

  // Color swatch component
  const Swatch = ({ color, label }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: color,
        margin: '0 auto 6px',
        boxShadow: `0 0 12px ${color}50`,
        border: `1px solid ${c.border}`,
      }} />
      <div style={{ fontSize: 9, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );

  // Flashcard preview
  const Flashcard = () => (
    <div 
      className={getAnimation()}
      style={{
        background: c.surface,
        borderRadius: t.radius,
        border: `1px solid ${c.border}`,
        padding: 20,
        boxShadow: `0 4px 20px ${c.glow}25`,
        maxWidth: 280,
      }}
    >
      <div style={{ fontSize: 9, color: c.textMuted, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Biology • Card 1 of 24
      </div>
      <div style={{ fontSize: 16, color: c.text, fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}>
        What is the powerhouse of the cell?
      </div>
      <div style={{
        padding: '10px 14px',
        background: `${c.primary}18`,
        borderRadius: t.radius / 2,
        border: `1px solid ${c.border}`,
        textAlign: 'center',
      }}>
        <span style={{ color: c.primary, fontSize: 13, fontWeight: 500 }}>Tap to reveal</span>
      </div>
    </div>
  );

  // Button preview
  const ButtonPreview = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button style={{
        padding: '10px 20px',
        background: c.primary,
        border: 'none',
        borderRadius: activeTheme === 'pulse' ? 999 : t.radius,
        color: colorScheme === 'dark' ? '#000' : '#FFF',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        boxShadow: `0 0 15px ${c.glow}40`,
      }}>
        Primary
      </button>
      <button style={{
        padding: '10px 20px',
        background: 'transparent',
        border: `2px solid ${c.primary}`,
        borderRadius: activeTheme === 'pulse' ? 999 : t.radius,
        color: c.primary,
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
      }}>
        Secondary
      </button>
      <button style={{
        padding: '10px 20px',
        background: c.secondary,
        border: 'none',
        borderRadius: activeTheme === 'pulse' ? 999 : t.radius,
        color: '#FFF',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        boxShadow: `0 0 15px ${c.secondary}40`,
      }}>
        Accent
      </button>
    </div>
  );

  // Progress bar
  const ProgressBar = () => (
    <div style={{ width: '100%', maxWidth: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: c.textSecondary, fontSize: 11 }}>Daily Progress</span>
        <span style={{ color: c.primary, fontSize: 11, fontWeight: 600 }}>72%</span>
      </div>
      <div style={{
        height: 6,
        background: `${c.primary}20`,
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          width: '72%',
          height: '100%',
          background: c.primary,
          borderRadius: 999,
          boxShadow: `0 0 8px ${c.glow}60`,
        }} />
      </div>
    </div>
  );

  // XP Badge
  const XPBadge = () => (
    <div 
      className={activeTheme === 'pulse' ? 'animate-heartbeat' : activeTheme === 'singularity' ? 'animate-glow' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: c.surface,
        borderRadius: 999,
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 12px ${c.glow}30`,
      }}
    >
      <span style={{ fontSize: 16 }}>⚡</span>
      <span style={{ 
        color: c.primary, 
        fontWeight: 700, 
        fontSize: 14,
        ...(activeTheme === 'singularity' && colorScheme === 'dark' ? {
          background: `linear-gradient(90deg, ${c.primary}, #FFF, ${c.primary})`,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer 2s linear infinite',
        } : {})
      }}>
        {t.unlockXP.toLocaleString()} XP
      </span>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: c.background,
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{styles}</style>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 4,
          color: c.primary,
          textShadow: `0 0 30px ${c.glow}60`,
          letterSpacing: '-0.02em',
        }}>
          FL4SH Themes
        </h1>
        <p style={{ color: c.textSecondary, fontSize: 14 }}>
          React Native Compatible • Light & Dark Modes
        </p>
      </div>

      {/* Theme selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => setActiveTheme(key)}
            style={{
              padding: '10px 18px',
              background: activeTheme === key ? c.primary : 'transparent',
              border: `2px solid ${activeTheme === key ? 'transparent' : c.border}`,
              borderRadius: 999,
              color: activeTheme === key ? (colorScheme === 'dark' ? '#000' : '#FFF') : c.text,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTheme === key ? `0 0 15px ${c.glow}50` : 'none',
            }}
          >
            {theme.name}
          </button>
        ))}
      </div>

      {/* Color scheme toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'flex',
          background: c.surface,
          borderRadius: 999,
          padding: 3,
          border: `1px solid ${c.border}`,
        }}>
          {['dark', 'light'].map((scheme) => (
            <button
              key={scheme}
              onClick={() => setColorScheme(scheme)}
              style={{
                padding: '6px 16px',
                background: colorScheme === scheme ? c.primary : 'transparent',
                border: 'none',
                borderRadius: 999,
                color: colorScheme === scheme ? (scheme === 'dark' ? '#000' : '#FFF') : c.textSecondary,
                fontWeight: 500,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {scheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
      </div>

      {/* Theme info */}
      <div style={{
        background: c.surface,
        borderRadius: t.radius * 1.5,
        border: `1px solid ${c.border}`,
        padding: 24,
        marginBottom: 32,
        boxShadow: `0 4px 20px ${c.glow}15`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: 0 }}>{t.name}</h2>
          <XPBadge />
        </div>
        <p style={{ color: c.primary, fontSize: 15, fontStyle: 'italic', marginBottom: 6 }}>
          "{t.tagline}"
        </p>
        <p style={{ color: c.textMuted, fontSize: 12, marginBottom: 20 }}>
          Animation: {t.animationNote}
        </p>
        
        {/* Palette */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Swatch color={c.primary} label="Primary" />
          <Swatch color={c.secondary} label="Secondary" />
          <Swatch color={c.tertiary} label="Tertiary" />
          <Swatch color={c.background} label="Background" />
          <Swatch color={c.surface} label="Surface" />
          <Swatch color={c.text} label="Text" />
        </div>
      </div>

      {/* Components grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {/* Flashcard */}
        <div>
          <h3 style={{ color: c.text, fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Flashcard</h3>
          <Flashcard />
        </div>

        {/* Buttons & Progress */}
        <div>
          <h3 style={{ color: c.text, fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Buttons</h3>
          <ButtonPreview />
          
          <h3 style={{ color: c.text, fontSize: 14, marginBottom: 12, marginTop: 24, fontWeight: 600 }}>Progress</h3>
          <ProgressBar />
        </div>
      </div>

      {/* Theme progression */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: c.text, fontSize: 14, marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>
          Progression Path
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(themes).map(([key, theme], index) => (
            <React.Fragment key={key}>
              <div style={{
                padding: '10px 16px',
                background: key === activeTheme ? c.primary : c.surface,
                borderRadius: 10,
                border: `1px solid ${key === activeTheme ? 'transparent' : c.border}`,
                textAlign: 'center',
                boxShadow: key === activeTheme ? `0 0 15px ${c.glow}40` : 'none',
              }}>
                <div style={{ 
                  color: key === activeTheme ? (colorScheme === 'dark' ? '#000' : '#FFF') : c.text, 
                  fontWeight: 600, 
                  fontSize: 12 
                }}>
                  {theme.name}
                </div>
                <div style={{ 
                  color: key === activeTheme ? (colorScheme === 'dark' ? '#000' : '#FFF') : c.textMuted, 
                  fontSize: 10,
                  opacity: key === activeTheme ? 0.7 : 1,
                }}>
                  {theme.unlockXP === 0 ? 'Default' : `${theme.unlockXP.toLocaleString()} XP`}
                </div>
              </div>
              {index < Object.keys(themes).length - 1 && (
                <span style={{ color: c.textMuted, fontSize: 16 }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Note */}
      <div style={{
        marginTop: 32,
        padding: 16,
        background: `${c.primary}10`,
        borderRadius: t.radius,
        border: `1px solid ${c.border}`,
        textAlign: 'center',
      }}>
        <p style={{ color: c.textSecondary, fontSize: 12, margin: 0 }}>
          ✓ All colors and animations shown here work in React Native via the Animated API
        </p>
      </div>
    </div>
  );
};

export default FL4SHThemePreview;
