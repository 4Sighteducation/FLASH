import React, { useState } from 'react';

const ThemeShowcase = () => {
  const [activeTheme, setActiveTheme] = useState('cyber');

  const themes = {
    cyber: {
      name: 'Cyber',
      unlock: 'Default',
      xp: 0,
      tagline: '"System initialised. Welcome to the grid."',
      description: 'The original neon-tech aesthetic. Hard edges, digital precision, pure cyber energy.',
      colors: {
        bg: '#0a0a0f',
        primary: '#14b8a6',
        secondary: '#ec4899',
        accent: '#7c4dff',
        text: '#ffffff',
        muted: '#6b7280',
        card: '#0d1117',
      },
      vibe: ['Neon glows', 'Sharp edges', 'Circuit patterns', 'Digital rain accents'],
    },
    pulse: {
      name: 'Pulse',
      unlock: '1,000 XP',
      xp: 1000,
      tagline: '"First heartbeat detected. System alive."',
      description: 'Organic tech fusion. Your progress has a pulse now — warm, alive, breathing.',
      colors: {
        bg: '#0f0a0a',
        primary: '#f97316',
        secondary: '#ef4444',
        accent: '#fbbf24',
        text: '#fff7ed',
        muted: '#a8a29e',
        card: '#1c1412',
      },
      vibe: ['Heartbeat animations', 'Warm ember glows', 'Breathing UI elements', 'Organic curves'],
    },
    aurora: {
      name: 'Aurora',
      unlock: '20,000 XP',
      xp: 20000,
      tagline: '"You\'ve transcended the grid. Welcome to the sky."',
      description: 'Ethereal and flowing. Soft gradients dance like northern lights across your interface.',
      colors: {
        bg: '#050a14',
        primary: '#22d3ee',
        secondary: '#a855f7',
        accent: '#34d399',
        text: '#f0fdfa',
        muted: '#94a3b8',
        card: '#0c1222',
      },
      vibe: ['Flowing gradients', 'Shimmer effects', 'Soft particle fields', 'Dreamy transitions'],
    },
    singularity: {
      name: 'Singularity',
      unlock: '200,000 XP',
      xp: 200000,
      tagline: '"You ARE the revision. Reality bends to your will."',
      description: 'Cosmic transcendence. Gold and void. The ultimate flex — you\'ve become the singularity.',
      colors: {
        bg: '#030206',
        primary: '#fbbf24',
        secondary: '#f472b6',
        accent: '#ffffff',
        text: '#fefce8',
        muted: '#a1a1aa',
        card: '#0a0812',
      },
      vibe: ['Gravitational warping', 'Star field backgrounds', 'Golden accents', 'Reality-bending animations'],
    },
  };

  const t = themes[activeTheme];

  // Mock flashcard component styled per theme
  const FlashcardPreview = () => (
    <div 
      style={{
        background: activeTheme === 'singularity' 
          ? `radial-gradient(ellipse at center, ${t.colors.card} 0%, ${t.colors.bg} 70%)`
          : t.colors.card,
        border: `2px solid ${t.colors.primary}40`,
        borderRadius: activeTheme === 'pulse' ? '20px' : activeTheme === 'aurora' ? '24px' : '12px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 30px ${t.colors.primary}20, 0 0 60px ${t.colors.secondary}10`,
      }}
    >
      {/* Theme-specific background effects */}
      {activeTheme === 'cyber' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(135deg, ${t.colors.primary}08 0%, transparent 50%, ${t.colors.secondary}08 100%)`,
          pointerEvents: 'none',
        }} />
      )}
      {activeTheme === 'pulse' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '200px', height: '200px', borderRadius: '50%',
          background: `radial-gradient(circle, ${t.colors.primary}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}
      {activeTheme === 'aurora' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(45deg, ${t.colors.primary}10, ${t.colors.secondary}15, ${t.colors.accent}10)`,
          pointerEvents: 'none',
        }} />
      )}
      {activeTheme === 'singularity' && (
        <>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${t.colors.primary}30 0%, transparent 70%)`,
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }} />
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: '2px', height: '2px',
              borderRadius: '50%',
              background: t.colors.accent,
              boxShadow: `0 0 4px ${t.colors.accent}`,
              pointerEvents: 'none',
            }} />
          ))}
        </>
      )}
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ 
          fontSize: '12px', 
          color: t.colors.primary, 
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontWeight: 600,
        }}>
          Biology • AQA
        </div>
        <div style={{ 
          fontSize: '18px', 
          color: t.colors.text, 
          fontWeight: 700,
          marginBottom: '16px',
        }}>
          What is the function of mitochondria?
        </div>
        <div style={{
          padding: '12px 16px',
          background: `${t.colors.primary}15`,
          borderRadius: activeTheme === 'pulse' ? '12px' : '8px',
          border: `1px solid ${t.colors.primary}30`,
        }}>
          <div style={{ fontSize: '14px', color: t.colors.text, opacity: 0.9 }}>
            The mitochondria is the powerhouse of the cell, producing ATP through cellular respiration.
          </div>
        </div>
      </div>
    </div>
  );

  // Button preview
  const ButtonPreview = () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <button style={{
        padding: '12px 24px',
        background: activeTheme === 'singularity' 
          ? `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})`
          : t.colors.primary,
        color: activeTheme === 'singularity' ? '#000' : t.colors.bg,
        border: 'none',
        borderRadius: activeTheme === 'pulse' ? '999px' : activeTheme === 'aurora' ? '16px' : '8px',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: `0 0 20px ${t.colors.primary}40`,
      }}>
        Generate Fl4shcards
      </button>
      <button style={{
        padding: '12px 24px',
        background: 'transparent',
        color: t.colors.primary,
        border: `2px solid ${t.colors.primary}`,
        borderRadius: activeTheme === 'pulse' ? '999px' : activeTheme === 'aurora' ? '16px' : '8px',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
      }}>
        View Deck
      </button>
    </div>
  );

  // Progress bar preview
  const ProgressPreview = () => (
    <div style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '8px',
        fontSize: '12px',
        color: t.colors.muted,
      }}>
        <span>Level Progress</span>
        <span style={{ color: t.colors.primary }}>67%</span>
      </div>
      <div style={{
        height: '8px',
        background: `${t.colors.muted}30`,
        borderRadius: '999px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: '67%',
          height: '100%',
          background: activeTheme === 'aurora' || activeTheme === 'singularity'
            ? `linear-gradient(90deg, ${t.colors.primary}, ${t.colors.secondary}, ${t.colors.accent || t.colors.primary})`
            : `linear-gradient(90deg, ${t.colors.primary}, ${t.colors.secondary})`,
          borderRadius: '999px',
          boxShadow: `0 0 10px ${t.colors.primary}60`,
        }} />
      </div>
    </div>
  );

  // Nav item preview
  const NavPreview = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px',
      background: `${t.colors.card}`,
      borderRadius: activeTheme === 'pulse' ? '20px' : '12px',
      border: `1px solid ${t.colors.primary}20`,
    }}>
      {['Home', 'Decks', 'Stats', 'Profile'].map((item, i) => (
        <div key={item} style={{
          padding: '10px 16px',
          borderRadius: activeTheme === 'pulse' ? '12px' : '8px',
          background: i === 0 ? `${t.colors.primary}20` : 'transparent',
          color: i === 0 ? t.colors.primary : t.colors.muted,
          fontSize: '13px',
          fontWeight: i === 0 ? 600 : 400,
        }}>
          {item}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f',
      padding: '32px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 800, 
          color: '#fff',
          marginBottom: '8px',
        }}>
          FLASH Theme System
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          4 distinct themes that unlock as you progress
        </p>
      </div>

      {/* Theme selector */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '12px', 
        marginBottom: '40px',
        flexWrap: 'wrap',
      }}>
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => setActiveTheme(key)}
            style={{
              padding: '16px 24px',
              background: activeTheme === key ? theme.colors.card : '#111',
              border: `2px solid ${activeTheme === key ? theme.colors.primary : '#333'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTheme === key ? `0 0 20px ${theme.colors.primary}30` : 'none',
            }}
          >
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: theme.colors.primary,
                boxShadow: `0 0 8px ${theme.colors.primary}`,
              }} />
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: theme.colors.secondary,
                boxShadow: `0 0 8px ${theme.colors.secondary}`,
              }} />
            </div>
            <div style={{ 
              color: activeTheme === key ? theme.colors.primary : '#888',
              fontWeight: 700,
              fontSize: '14px',
            }}>
              {theme.name}
            </div>
            <div style={{ 
              color: '#666',
              fontSize: '11px',
              marginTop: '2px',
            }}>
              {theme.unlock}
            </div>
          </button>
        ))}
      </div>

      {/* Main preview area */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
      }}>
        {/* Left: Theme info */}
        <div>
          <div style={{
            background: t.colors.bg,
            borderRadius: '20px',
            padding: '32px',
            border: `1px solid ${t.colors.primary}30`,
            height: '100%',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: `${t.colors.primary}20`,
              borderRadius: '999px',
              marginBottom: '16px',
            }}>
              <span style={{ 
                color: t.colors.primary, 
                fontSize: '12px', 
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                {t.unlock === 'Default' ? '🔓 Unlocked' : `🔒 ${t.unlock}`}
              </span>
            </div>
            
            <h2 style={{ 
              fontSize: '42px', 
              fontWeight: 800, 
              color: t.colors.text,
              marginBottom: '8px',
              background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {t.name}
            </h2>
            
            <p style={{ 
              color: t.colors.muted, 
              fontSize: '14px',
              fontStyle: 'italic',
              marginBottom: '16px',
            }}>
              {t.tagline}
            </p>
            
            <p style={{ 
              color: t.colors.text, 
              fontSize: '16px',
              lineHeight: 1.6,
              marginBottom: '24px',
              opacity: 0.9,
            }}>
              {t.description}
            </p>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                color: t.colors.muted, 
                fontSize: '12px', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
              }}>
                Colour Palette
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(t.colors).slice(1, 5).map(([name, color]) => (
                  <div key={name} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '48px', height: '48px',
                      borderRadius: '12px',
                      background: color,
                      boxShadow: `0 0 15px ${color}50`,
                      marginBottom: '4px',
                    }} />
                    <div style={{ fontSize: '10px', color: t.colors.muted }}>
                      {name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ 
                color: t.colors.muted, 
                fontSize: '12px', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
              }}>
                Visual Effects
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {t.vibe.map((v) => (
                  <span key={v} style={{
                    padding: '6px 12px',
                    background: `${t.colors.primary}15`,
                    border: `1px solid ${t.colors.primary}30`,
                    borderRadius: '999px',
                    fontSize: '12px',
                    color: t.colors.text,
                  }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: UI Preview */}
        <div style={{
          background: t.colors.bg,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${t.colors.primary}30`,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div style={{ 
            color: t.colors.muted, 
            fontSize: '12px', 
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            UI Preview
          </div>
          
          <NavPreview />
          <FlashcardPreview />
          <ProgressPreview />
          <ButtonPreview />
        </div>
      </div>

      {/* Detailed theme breakdowns */}
      <div style={{
        maxWidth: '1000px',
        margin: '48px auto 0',
        background: '#111',
        borderRadius: '20px',
        padding: '32px',
      }}>
        <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
          Theme Progression Design Philosophy
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {Object.entries(themes).map(([key, theme], index) => (
            <div key={key} style={{
              padding: '20px',
              background: theme.colors.bg,
              borderRadius: '16px',
              border: `1px solid ${theme.colors.primary}30`,
            }}>
              <div style={{
                width: '32px', height: '32px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: 800,
                fontSize: '14px',
                marginBottom: '12px',
              }}>
                {index + 1}
              </div>
              <div style={{ color: theme.colors.primary, fontWeight: 700, marginBottom: '4px' }}>
                {theme.name}
              </div>
              <div style={{ color: '#888', fontSize: '12px', lineHeight: 1.5 }}>
                {key === 'cyber' && 'Digital origins. Clean, technical, precise. The starting point.'}
                {key === 'pulse' && 'System comes alive. Organic warmth enters the cold digital space.'}
                {key === 'aurora' && 'Transcendence begins. Ethereal beauty replaces hard edges.'}
                {key === 'singularity' && 'Ultimate power. Cosmic, golden, reality-bending. You\'ve ascended.'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcase;
