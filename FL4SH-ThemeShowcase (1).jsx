import React, { useState } from 'react';

const ThemeShowcase = () => {
  const [activeTheme, setActiveTheme] = useState('cyber');
  const [colorScheme, setColorScheme] = useState('dark');

  const themes = {
    cyber: {
      name: 'Cyber',
      unlockXP: 0,
      tagline: 'System initialised. Welcome to the grid.',
      description: 'Digital precision. Neon cyan and pink on deep blue-black.',
      dark: {
        primary: '#00F5FF',
        secondary: '#FF006E',
        tertiary: '#7C4DFF',
        background: '#0A0F1E',
        backgroundAlt: '#0D1425',
        surface: 'rgba(13, 20, 37, 0.8)',
        text: '#FFFFFF',
        textSecondary: '#94A3B8',
        border: 'rgba(0, 245, 255, 0.3)',
        glow: 'rgba(0, 245, 255, 0.5)',
        glowSecondary: 'rgba(255, 0, 110, 0.5)',
        gradient: 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(20, 30, 55, 0.9) 0%, rgba(13, 20, 37, 0.95) 100%)',
      },
      light: {
        primary: '#00B4D8',
        secondary: '#E5006A',
        tertiary: '#6C3FD1',
        background: '#F0F4F8',
        backgroundAlt: '#E2E8F0',
        surface: 'rgba(255, 255, 255, 0.9)',
        text: '#0F172A',
        textSecondary: '#475569',
        border: 'rgba(0, 180, 216, 0.4)',
        glow: 'rgba(0, 180, 216, 0.3)',
        glowSecondary: 'rgba(229, 0, 106, 0.3)',
        gradient: 'linear-gradient(135deg, #00B4D8 0%, #0891B2 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)',
      },
      effects: { borderRadius: 8, shadow: '0 0 20px', special: 'Scanlines, glitch effects, hard neon glows' }
    },
    pulse: {
      name: 'Pulse',
      unlockXP: 1000,
      tagline: 'First heartbeat detected. System alive.',
      description: 'Organic warmth. Orange embers on warm darkness.',
      dark: {
        primary: '#FF6B35',
        secondary: '#FF006E',
        tertiary: '#FBBF24',
        background: '#120A08',
        backgroundAlt: '#1A0F0C',
        surface: 'rgba(26, 15, 12, 0.85)',
        text: '#FFF7ED',
        textSecondary: '#D6BCAB',
        border: 'rgba(255, 107, 53, 0.35)',
        glow: 'rgba(255, 107, 53, 0.5)',
        glowSecondary: 'rgba(255, 0, 110, 0.4)',
        gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8F5C 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(40, 22, 18, 0.9) 0%, rgba(26, 15, 12, 0.95) 100%)',
      },
      light: {
        primary: '#E55A2B',
        secondary: '#D10058',
        tertiary: '#D97706',
        background: '#FFF8F5',
        backgroundAlt: '#FFF0EB',
        surface: 'rgba(255, 255, 255, 0.9)',
        text: '#2D1810',
        textSecondary: '#6B4B3E',
        border: 'rgba(229, 90, 43, 0.35)',
        glow: 'rgba(229, 90, 43, 0.3)',
        glowSecondary: 'rgba(209, 0, 88, 0.25)',
        gradient: 'linear-gradient(135deg, #E55A2B 0%, #F97316 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 245, 0.9) 100%)',
      },
      effects: { borderRadius: 20, shadow: '0 0 25px', special: 'Breathing UI, heartbeat glow, ripple effects' }
    },
    aurora: {
      name: 'Aurora',
      unlockXP: 20000,
      tagline: "You've transcended the grid. Welcome to the sky.",
      description: 'Ethereal flow. Northern lights dance across your interface.',
      dark: {
        primary: '#22D3EE',
        secondary: '#A855F7',
        tertiary: '#34D399',
        background: '#050A14',
        backgroundAlt: '#0A1020',
        surface: 'rgba(10, 16, 32, 0.75)',
        text: '#F0FDFA',
        textSecondary: '#A5B4C6',
        border: 'rgba(34, 211, 238, 0.3)',
        glow: 'rgba(34, 211, 238, 0.4)',
        glowSecondary: 'rgba(168, 85, 247, 0.4)',
        gradient: 'linear-gradient(135deg, #22D3EE 0%, #A855F7 50%, #34D399 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(15, 25, 50, 0.85) 0%, rgba(10, 16, 32, 0.9) 100%)',
      },
      light: {
        primary: '#0891B2',
        secondary: '#9333EA',
        tertiary: '#059669',
        background: '#F0FDFA',
        backgroundAlt: '#E0F7F5',
        surface: 'rgba(255, 255, 255, 0.85)',
        text: '#0F172A',
        textSecondary: '#475569',
        border: 'rgba(8, 145, 178, 0.3)',
        glow: 'rgba(8, 145, 178, 0.2)',
        glowSecondary: 'rgba(147, 51, 234, 0.2)',
        gradient: 'linear-gradient(135deg, #0891B2 0%, #9333EA 50%, #059669 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 253, 250, 0.88) 100%)',
      },
      effects: { borderRadius: 26, shadow: '0 0 30px', special: 'Multi-color gradients, particle fields, glass morphism' }
    },
    singularity: {
      name: 'Singularity',
      unlockXP: 200000,
      tagline: 'You ARE the revision. Reality bends to your will.',
      description: 'Cosmic transcendence. Gold and void. The ultimate achievement.',
      dark: {
        primary: '#FBBF24',
        secondary: '#F472B6',
        tertiary: '#FFFFFF',
        background: '#000000',
        backgroundAlt: '#030206',
        surface: 'rgba(5, 3, 10, 0.85)',
        text: '#FFFBEB',
        textSecondary: '#D4AF37',
        border: 'rgba(251, 191, 36, 0.4)',
        glow: 'rgba(251, 191, 36, 0.6)',
        glowSecondary: 'rgba(244, 114, 182, 0.5)',
        gradient: 'linear-gradient(135deg, #FBBF24 0%, #FFFFFF 50%, #FBBF24 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(10, 6, 18, 0.9) 0%, rgba(5, 3, 10, 0.95) 100%)',
      },
      light: {
        primary: '#D97706',
        secondary: '#DB2777',
        tertiary: '#000000',
        background: '#FFFBEB',
        backgroundAlt: '#FEF3C7',
        surface: 'rgba(255, 255, 255, 0.9)',
        text: '#1C1917',
        textSecondary: '#78716C',
        border: 'rgba(217, 119, 6, 0.4)',
        glow: 'rgba(217, 119, 6, 0.3)',
        glowSecondary: 'rgba(219, 39, 119, 0.25)',
        gradient: 'linear-gradient(135deg, #D97706 0%, #FBBF24 50%, #D97706 100%)',
        cardGradient: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 251, 235, 0.9) 100%)',
      },
      effects: { borderRadius: 22, shadow: '0 0 40px', special: 'Starfield, gravitational warp, gold shimmer, event horizon' }
    }
  };

  const t = themes[activeTheme];
  const c = t[colorScheme];

  const keyframes = `
    @keyframes cyber-pulse {
      0%, 100% { box-shadow: 0 0 10px ${c.glow}, 0 0 20px ${c.glow}; }
      50% { box-shadow: 0 0 15px ${c.glow}, 0 0 30px ${c.glow}, 0 0 45px ${c.glow}; }
    }
    @keyframes pulse-breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.015); }
    }
    @keyframes aurora-wave {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes singularity-pulse {
      0%, 100% { box-shadow: 0 0 30px ${c.glow}, 0 0 60px ${c.glow}; transform: scale(1); }
      50% { box-shadow: 0 0 50px ${c.glow}, 0 0 100px ${c.glow}, 0 0 150px ${c.glowSecondary}; transform: scale(1.01); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes vortex {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;

  // Starfield component for Singularity
  const Starfield = () => (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[...Array(60)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: Math.random() > 0.8 ? '3px' : '2px',
          height: Math.random() > 0.8 ? '3px' : '2px',
          borderRadius: '50%',
          backgroundColor: Math.random() > 0.6 ? c.primary : (Math.random() > 0.5 ? c.secondary : '#FFF'),
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.7 + 0.3,
          animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }} />
      ))}
    </div>
  );

  // Aurora background effect
  const AuroraBackground = () => (
    <div style={{
      position: 'absolute',
      inset: '-50%',
      background: `
        radial-gradient(ellipse at 20% 30%, ${c.glow} 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, ${c.glowSecondary} 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(52, 211, 153, 0.25) 0%, transparent 60%)
      `,
      backgroundSize: '200% 200%',
      animation: 'aurora-wave 12s ease-in-out infinite',
      filter: 'blur(50px)',
      pointerEvents: 'none',
    }} />
  );

  // Flashcard preview
  const FlashcardPreview = () => (
    <div style={{
      width: '300px',
      padding: '24px',
      background: c.cardGradient,
      borderRadius: t.effects.borderRadius,
      border: `1px solid ${c.border}`,
      boxShadow: `${t.effects.shadow} ${c.glow}`,
      animation: activeTheme === 'pulse' ? 'pulse-breathe 3s ease-in-out infinite' : 
                 activeTheme === 'singularity' ? 'singularity-pulse 3s ease-in-out infinite' : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {activeTheme === 'singularity' && (
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
          opacity: 0.15,
          pointerEvents: 'none',
        }} />
      )}
      <div style={{ fontSize: '10px', color: c.textSecondary, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Biology • Card 1 of 24
      </div>
      <div style={{ fontSize: '18px', color: c.text, fontWeight: 600, marginBottom: '16px', lineHeight: 1.4 }}>
        What is the powerhouse of the cell?
      </div>
      <div style={{
        padding: '12px 16px',
        background: `${c.primary}15`,
        borderRadius: t.effects.borderRadius / 2,
        border: `1px solid ${c.border}`,
        color: c.primary,
        fontSize: '14px',
        fontWeight: 500,
      }}>
        Tap to reveal answer
      </div>
    </div>
  );

  // Button preview
  const ButtonPreview = () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <button style={{
        padding: '12px 24px',
        background: c.gradient,
        backgroundSize: '200% 100%',
        border: 'none',
        borderRadius: activeTheme === 'pulse' ? 999 : t.effects.borderRadius,
        color: colorScheme === 'dark' ? '#000' : '#FFF',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: `${t.effects.shadow} ${c.glow}`,
        animation: activeTheme === 'singularity' ? 'shimmer 3s linear infinite' : 'none',
      }}>
        Primary Action
      </button>
      <button style={{
        padding: '12px 24px',
        background: 'transparent',
        border: `2px solid ${c.primary}`,
        borderRadius: activeTheme === 'pulse' ? 999 : t.effects.borderRadius,
        color: c.primary,
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
      }}>
        Secondary
      </button>
    </div>
  );

  // Progress bar preview
  const ProgressPreview = () => (
    <div style={{ width: '100%', maxWidth: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: c.textSecondary, fontSize: '12px' }}>Daily Progress</span>
        <span style={{ color: c.primary, fontSize: '12px', fontWeight: 600 }}>72%</span>
      </div>
      <div style={{
        height: '8px',
        background: `${c.primary}20`,
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          width: '72%',
          height: '100%',
          background: c.gradient,
          backgroundSize: '200% 100%',
          borderRadius: 999,
          boxShadow: `0 0 10px ${c.glow}`,
          animation: activeTheme === 'singularity' ? 'shimmer 2s linear infinite' : 'none',
        }} />
      </div>
    </div>
  );

  // XP Badge
  const XPBadge = () => (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: c.cardGradient,
      borderRadius: 999,
      border: `1px solid ${c.border}`,
      boxShadow: `0 0 15px ${c.glow}`,
    }}>
      <span style={{ fontSize: '20px' }}>⚡</span>
      <span style={{ 
        color: c.primary, 
        fontWeight: 700, 
        fontSize: '16px',
        ...(activeTheme === 'singularity' ? {
          background: `linear-gradient(90deg, ${c.primary} 0%, #FFF 50%, ${c.primary} 100%)`,
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

  // Color swatch
  const ColorSwatch = ({ color, label }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: color,
        boxShadow: `0 0 15px ${color}40`,
        margin: '0 auto 8px',
      }} />
      <div style={{ fontSize: '10px', color: c.textSecondary }}>{label}</div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: c.background,
      padding: '32px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{keyframes}</style>
      
      {/* Background effects */}
      {activeTheme === 'aurora' && <AuroraBackground />}
      {activeTheme === 'singularity' && colorScheme === 'dark' && <Starfield />}
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 900,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
            ...(activeTheme === 'singularity' ? {
              background: `linear-gradient(90deg, ${c.primary} 0%, #FFF 25%, ${c.primary} 50%, ${c.secondary} 75%, ${c.primary} 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
              filter: `drop-shadow(0 0 20px ${c.glow})`,
            } : activeTheme === 'aurora' ? {
              background: c.gradient,
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'aurora-wave 6s ease-in-out infinite',
            } : {
              color: c.primary,
              textShadow: `0 0 30px ${c.glow}`,
            })
          }}>
            FL4SH Themes
          </h1>
          <p style={{ color: c.textSecondary, fontSize: '18px' }}>
            Progressive theme unlocks • Light & Dark modes
          </p>
        </div>

        {/* Theme selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}>
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              style={{
                padding: '12px 24px',
                background: activeTheme === key ? c.gradient : 'transparent',
                border: `2px solid ${activeTheme === key ? 'transparent' : c.border}`,
                borderRadius: 999,
                color: activeTheme === key ? (colorScheme === 'dark' ? '#000' : '#FFF') : c.text,
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeTheme === key ? `0 0 20px ${c.glow}` : 'none',
              }}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* Color scheme toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            background: c.surface,
            borderRadius: 999,
            padding: '4px',
            border: `1px solid ${c.border}`,
          }}>
            {['dark', 'light'].map((scheme) => (
              <button
                key={scheme}
                onClick={() => setColorScheme(scheme)}
                style={{
                  padding: '8px 20px',
                  background: colorScheme === scheme ? c.primary : 'transparent',
                  border: 'none',
                  borderRadius: 999,
                  color: colorScheme === scheme ? (scheme === 'dark' ? '#000' : '#FFF') : c.textSecondary,
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {scheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
        </div>

        {/* Theme info card */}
        <div style={{
          background: c.cardGradient,
          borderRadius: t.effects.borderRadius * 2,
          border: `1px solid ${c.border}`,
          padding: '32px',
          marginBottom: '48px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `${t.effects.shadow} ${c.glow}`,
        }}>
          {activeTheme === 'singularity' && colorScheme === 'dark' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '400px',
              height: '400px',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
              opacity: 0.2,
              pointerEvents: 'none',
            }} />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <h2 style={{ 
                fontSize: '32px', 
                fontWeight: 800, 
                color: c.text,
                margin: 0,
              }}>
                {t.name}
              </h2>
              <XPBadge />
            </div>
            <p style={{ 
              color: c.primary, 
              fontSize: '18px', 
              fontStyle: 'italic', 
              marginBottom: '8px',
              textShadow: activeTheme === 'singularity' ? `0 0 10px ${c.glow}` : 'none',
            }}>
              "{t.tagline}"
            </p>
            <p style={{ color: c.textSecondary, fontSize: '16px', marginBottom: '24px' }}>
              {t.description}
            </p>
            
            {/* Color palette */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <ColorSwatch color={c.primary} label="Primary" />
              <ColorSwatch color={c.secondary} label="Secondary" />
              <ColorSwatch color={c.tertiary} label="Tertiary" />
              <ColorSwatch color={c.background} label="Background" />
              <ColorSwatch color={c.surface} label="Surface" />
            </div>
          </div>
        </div>

        {/* Component previews */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Flashcard */}
          <div>
            <h3 style={{ color: c.text, fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>
              Flashcard
            </h3>
            <FlashcardPreview />
          </div>

          {/* Buttons & Progress */}
          <div>
            <h3 style={{ color: c.text, fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>
              Buttons
            </h3>
            <ButtonPreview />
            
            <h3 style={{ color: c.text, fontSize: '16px', marginBottom: '16px', marginTop: '32px', fontWeight: 600 }}>
              Progress
            </h3>
            <ProgressPreview />
          </div>
        </div>

        {/* Special effects description */}
        <div style={{
          marginTop: '48px',
          padding: '24px',
          background: c.surface,
          borderRadius: t.effects.borderRadius,
          border: `1px solid ${c.border}`,
        }}>
          <h3 style={{ color: c.primary, fontSize: '14px', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
            ✨ SPECIAL EFFECTS
          </h3>
          <p style={{ color: c.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            {t.effects.special}
          </p>
        </div>

        {/* Progression ladder */}
        <div style={{ marginTop: '48px' }}>
          <h3 style={{ color: c.text, fontSize: '20px', marginBottom: '24px', fontWeight: 700, textAlign: 'center' }}>
            Theme Progression
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(themes).map(([key, theme], index) => (
              <React.Fragment key={key}>
                <div style={{
                  padding: '12px 20px',
                  background: key === activeTheme ? c.gradient : c.surface,
                  borderRadius: 12,
                  border: `1px solid ${key === activeTheme ? 'transparent' : c.border}`,
                  textAlign: 'center',
                  boxShadow: key === activeTheme ? `0 0 20px ${c.glow}` : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ 
                    color: key === activeTheme ? (colorScheme === 'dark' ? '#000' : '#FFF') : c.text, 
                    fontWeight: 700, 
                    fontSize: '14px' 
                  }}>
                    {theme.name}
                  </div>
                  <div style={{ 
                    color: key === activeTheme ? (colorScheme === 'dark' ? '#000' : '#FFF') : c.textSecondary, 
                    fontSize: '11px',
                    opacity: key === activeTheme ? 0.8 : 1,
                  }}>
                    {theme.unlockXP === 0 ? 'Default' : `${theme.unlockXP.toLocaleString()} XP`}
                  </div>
                </div>
                {index < Object.keys(themes).length - 1 && (
                  <div style={{ color: c.textSecondary, fontSize: '20px' }}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcase;
