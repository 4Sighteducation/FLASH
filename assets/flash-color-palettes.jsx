import React, { useState } from 'react';

const ColorPalettes = () => {
  const [selectedSolid, setSelectedSolid] = useState(0);
  const [selectedGradient, setSelectedGradient] = useState(0);

  // 28 distinct solid colors - well distributed across spectrum
  const solidColors = [
    // Row 1: Core primaries & secondaries
    { name: 'Royal Blue', hex: '#3B82F6' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Fuchsia', hex: '#D946EF' },
    { name: 'Rose', hex: '#F43F5E' },
    
    // Row 2: Warm spectrum
    { name: 'Orange', hex: '#F97316' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Yellow', hex: '#EAB308' },
    { name: 'Lime', hex: '#84CC16' },
    
    // Row 3: Cool spectrum
    { name: 'Green', hex: '#22C55E' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Teal', hex: '#14B8A6' },
    { name: 'Cyan', hex: '#06B6D4' },
    
    // Row 4: Blues & purples
    { name: 'Sky', hex: '#0EA5E9' },
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Purple', hex: '#A855F7' },
    { name: 'Pink', hex: '#EC4899' },
    
    // Row 5: Pastels
    { name: 'Soft Blue', hex: '#93C5FD' },
    { name: 'Soft Purple', hex: '#C4B5FD' },
    { name: 'Soft Pink', hex: '#F9A8D4' },
    { name: 'Soft Peach', hex: '#FDBA74' },
    
    // Row 6: Earth & muted tones
    { name: 'Coral', hex: '#FB7185' },
    { name: 'Salmon', hex: '#FCA5A5' },
    { name: 'Mint', hex: '#6EE7B7' },
    { name: 'Aqua', hex: '#67E8F9' },
    
    // Row 7: Neutrals & darks
    { name: 'Slate', hex: '#64748B' },
    { name: 'Graphite', hex: '#475569' },
    { name: 'Charcoal', hex: '#334155' },
    { name: 'Midnight', hex: '#1E293B' },
  ];

  // Expanded gradients - 20 total (12 original + 8 new)
  const gradients = [
    // Original 12 from the app
    { name: 'Sunset', colors: ['#FCA5A5', '#FB923C'], angle: 135 },
    { name: 'Ocean', colors: ['#5EEAD4', '#3B82F6'], angle: 135 },
    { name: 'Purple Dream', colors: ['#C084FC', '#EC4899'], angle: 135 },
    { name: 'Forest', colors: ['#86EFAC', '#22C55E'], angle: 135 },
    { name: 'Fire', colors: ['#FDBA74', '#F97316'], angle: 135 },
    { name: 'Sky', colors: ['#7DD3FC', '#38BDF8'], angle: 135 },
    { name: 'Lavender', colors: ['#DDD6FE', '#A78BFA'], angle: 135 },
    { name: 'Mint', colors: ['#A7F3D0', '#6EE7B7'], angle: 135 },
    { name: 'Neon Wave', colors: ['#67E8F9', '#F0ABFC'], angle: 135 },
    { name: 'Cyber Ice', colors: ['#BAE6FD', '#38BDF8'], angle: 135 },
    { name: 'Midnight', colors: ['#475569', '#1E293B'], angle: 135 },
    { name: 'Steel', colors: ['#94A3B8', '#64748B'], angle: 135 },
    
    // NEW gradients
    { name: 'Aurora', colors: ['#22D3EE', '#A855F7', '#EC4899'], angle: 135 },
    { name: 'Candy', colors: ['#F472B6', '#FB923C'], angle: 135 },
    { name: 'Electric', colors: ['#3B82F6', '#8B5CF6'], angle: 135 },
    { name: 'Sunrise', colors: ['#FDE047', '#FB923C', '#F43F5E'], angle: 135 },
    { name: 'Deep Sea', colors: ['#0EA5E9', '#1E3A5F'], angle: 135 },
    { name: 'Grape', colors: ['#7C3AED', '#DB2777'], angle: 135 },
    { name: 'Mojito', colors: ['#BEF264', '#22C55E'], angle: 135 },
    { name: 'Peach', colors: ['#FECACA', '#FCD34D'], angle: 135 },
    { name: 'Berry', colors: ['#BE185D', '#7C3AED'], angle: 135 },
    { name: 'Glacier', colors: ['#E0F2FE', '#0284C7'], angle: 135 },
    { name: 'Ember', colors: ['#F87171', '#B91C1C'], angle: 135 },
    { name: 'Cosmic', colors: ['#1E1B4B', '#7C3AED', '#EC4899'], angle: 135 },
  ];

  const getGradientCSS = (colors, angle) => {
    return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      padding: '32px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
            FLASH Colour Palettes
          </h1>
          <p style={{ color: '#64748b' }}>Subject colour picker options</p>
        </div>

        {/* SOLID COLORS */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
              Solid Colors
            </h2>
            <span style={{ 
              background: '#3B82F6', 
              color: '#fff', 
              padding: '4px 12px', 
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              28 colors
            </span>
          </div>

          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Select a color:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {solidColors.map((color, index) => (
              <div
                key={color.hex}
                onClick={() => setSelectedSolid(index)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: color.hex,
                  cursor: 'pointer',
                  border: selectedSolid === index ? '3px solid #1e293b' : '3px solid transparent',
                  boxShadow: selectedSolid === index ? '0 0 0 2px #fff, 0 4px 12px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                title={`${color.name}: ${color.hex}`}
              />
            ))}
          </div>

          {/* Selected color info */}
          <div style={{
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: solidColors[selectedSolid].hex,
            }} />
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>
                {solidColors[selectedSolid].name}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b', fontFamily: 'monospace' }}>
                {solidColors[selectedSolid].hex}
              </div>
            </div>
          </div>
        </div>

        {/* GRADIENTS */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
              Gradients
            </h2>
            <span style={{ 
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', 
              color: '#fff', 
              padding: '4px 12px', 
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              24 gradients
            </span>
          </div>

          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Select a gradient:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {gradients.map((gradient, index) => (
              <div
                key={gradient.name}
                onClick={() => setSelectedGradient(index)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: getGradientCSS(gradient.colors, gradient.angle),
                  border: selectedGradient === index ? '3px solid #1e293b' : '3px solid transparent',
                  boxShadow: selectedGradient === index ? '0 0 0 2px #fff, 0 4px 12px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: selectedGradient === index ? '#1e293b' : '#64748b',
                  fontWeight: selectedGradient === index ? 600 : 400,
                }}>
                  {gradient.name}
                </span>
              </div>
            ))}
          </div>

          {/* Selected gradient info */}
          <div style={{
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: getGradientCSS(gradients[selectedGradient].colors, gradients[selectedGradient].angle),
            }} />
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>
                {gradients[selectedGradient].name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                {gradients[selectedGradient].colors.join(' → ')}
              </div>
            </div>
          </div>
        </div>

        {/* EXPORT DATA */}
        <div style={{
          background: '#1e293b',
          borderRadius: '20px',
          padding: '24px',
          color: '#fff',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            📋 Copy-Paste Data
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Solid Colors Array
            </div>
            <pre style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '150px',
            }}>
{`const solidColors = [
  '#3B82F6', // Royal Blue
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#93C5FD', // Soft Blue
  '#C4B5FD', // Soft Purple
  '#F9A8D4', // Soft Pink
  '#FDBA74', // Soft Peach
  '#FB7185', // Coral
  '#FCA5A5', // Salmon
  '#6EE7B7', // Mint
  '#67E8F9', // Aqua
  '#64748B', // Slate
  '#475569', // Graphite
  '#334155', // Charcoal
  '#1E293B', // Midnight
];`}
            </pre>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Gradients Array
            </div>
            <pre style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '200px',
            }}>
{`const gradients = [
  { name: 'Sunset', colors: ['#FCA5A5', '#FB923C'] },
  { name: 'Ocean', colors: ['#5EEAD4', '#3B82F6'] },
  { name: 'Purple Dream', colors: ['#C084FC', '#EC4899'] },
  { name: 'Forest', colors: ['#86EFAC', '#22C55E'] },
  { name: 'Fire', colors: ['#FDBA74', '#F97316'] },
  { name: 'Sky', colors: ['#7DD3FC', '#38BDF8'] },
  { name: 'Lavender', colors: ['#DDD6FE', '#A78BFA'] },
  { name: 'Mint', colors: ['#A7F3D0', '#6EE7B7'] },
  { name: 'Neon Wave', colors: ['#67E8F9', '#F0ABFC'] },
  { name: 'Cyber Ice', colors: ['#BAE6FD', '#38BDF8'] },
  { name: 'Midnight', colors: ['#475569', '#1E293B'] },
  { name: 'Steel', colors: ['#94A3B8', '#64748B'] },
  // NEW
  { name: 'Aurora', colors: ['#22D3EE', '#A855F7', '#EC4899'] },
  { name: 'Candy', colors: ['#F472B6', '#FB923C'] },
  { name: 'Electric', colors: ['#3B82F6', '#8B5CF6'] },
  { name: 'Sunrise', colors: ['#FDE047', '#FB923C', '#F43F5E'] },
  { name: 'Deep Sea', colors: ['#0EA5E9', '#1E3A5F'] },
  { name: 'Grape', colors: ['#7C3AED', '#DB2777'] },
  { name: 'Mojito', colors: ['#BEF264', '#22C55E'] },
  { name: 'Peach', colors: ['#FECACA', '#FCD34D'] },
  { name: 'Berry', colors: ['#BE185D', '#7C3AED'] },
  { name: 'Glacier', colors: ['#E0F2FE', '#0284C7'] },
  { name: 'Ember', colors: ['#F87171', '#B91C1C'] },
  { name: 'Cosmic', colors: ['#1E1B4B', '#7C3AED', '#EC4899'] },
];`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ColorPalettes;
