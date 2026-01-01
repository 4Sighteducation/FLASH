import React, { useState } from 'react';

const IconShowcase = () => {
  const [activeTab, setActiveTab] = useState('system');

  // System Status Icons (Concept 1) - Now with 7 levels
  const SystemIcons = {
    Standby: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glowPinkSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Border with subtle pink glow */}
        <circle cx="50" cy="50" r="40" fill="none" stroke="#ec4899" strokeWidth="1" opacity="0.25" filter="url(#glowPinkSoft)"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="2" opacity="0.5"/>
        {/* Z's with pink tint */}
        <text x="50" y="58" textAnchor="middle" fill="#9d4e7c" fontSize="28" fontFamily="Arial" filter="url(#glowPinkSoft)">Z</text>
        <text x="62" y="48" textAnchor="middle" fill="#9d4e7c" fontSize="22" fontFamily="Arial" filter="url(#glowPinkSoft)" opacity="0.7">z</text>
        <text x="72" y="40" textAnchor="middle" fill="#9d4e7c" fontSize="16" fontFamily="Arial" filter="url(#glowPinkSoft)" opacity="0.5">z</text>
      </svg>
    ),
    WakingUp: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          <filter id="glowWake" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#0d9488" strokeWidth="2" opacity="0.4"/>
        {/* Blinking cursor */}
        <rect x="42" y="35" width="16" height="30" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.5" filter="url(#glowWake)"/>
        <rect x="45" y="38" width="3" height="24" fill="#14b8a6" filter="url(#glowWake)"/>
        {/* Underscore cursor blink */}
        <rect x="50" y="58" width="12" height="3" fill="#ec4899" filter="url(#glowWake)"/>
      </svg>
    ),
    Booting: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          {/* Outer pink glow */}
          <filter id="glowOnlinePink" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Inner teal glow */}
          <filter id="glowOnlineTeal" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="onlineCenterGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ec4899"/>
            <stop offset="100%" stopColor="#14b8a6"/>
          </radialGradient>
        </defs>
        {/* Outer pink glow ring */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="#ec4899" strokeWidth="3" opacity="0.3" filter="url(#glowOnlinePink)"/>
        {/* Main power circle - teal with pink glow */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="#ec4899" strokeWidth="4" filter="url(#glowOnlinePink)"/>
        <circle cx="50" cy="50" r="35" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glowOnlineTeal)"/>
        {/* Power button line */}
        <path d="M50 22 L50 50" stroke="#ec4899" strokeWidth="6" strokeLinecap="round" filter="url(#glowOnlinePink)"/>
        {/* Inner glow circle */}
        <circle cx="50" cy="50" r="18" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6" filter="url(#glowOnlineTeal)"/>
        {/* Center dot */}
        <circle cx="50" cy="58" r="5" fill="#ec4899" filter="url(#glowOnlinePink)"/>
        {/* Radiating energy lines */}
        <line x1="15" y1="50" x2="22" y2="50" stroke="#ec4899" strokeWidth="2" opacity="0.6" filter="url(#glowOnlinePink)"/>
        <line x1="78" y1="50" x2="85" y2="50" stroke="#ec4899" strokeWidth="2" opacity="0.6" filter="url(#glowOnlinePink)"/>
        <line x1="50" y1="78" x2="50" y2="85" stroke="#14b8a6" strokeWidth="2" opacity="0.6" filter="url(#glowOnlineTeal)"/>
      </svg>
    ),
    Overclocked: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          <filter id="glowNeural" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glowNeuralStrong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
        
        {/* Brain outline - more defined shape */}
        <path d="M50 15 Q75 15 80 35 Q85 55 75 70 Q65 85 50 85 Q35 85 25 70 Q15 55 20 35 Q25 15 50 15" 
              fill="none" stroke="url(#neuralGrad)" strokeWidth="2" filter="url(#glowNeuralStrong)"/>
        
        {/* Brain center line */}
        <path d="M50 20 Q52 50 50 80" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.5"/>
        
        {/* Circuit traces - left hemisphere */}
        <path d="M30 35 L40 35 L40 45" fill="none" stroke="#14b8a6" strokeWidth="1.5" filter="url(#glowNeural)"/>
        <path d="M25 50 L35 50 L35 60 L45 60" fill="none" stroke="#14b8a6" strokeWidth="1.5" filter="url(#glowNeural)"/>
        <path d="M30 70 L40 70 L40 65" fill="none" stroke="#14b8a6" strokeWidth="1.5" filter="url(#glowNeural)"/>
        
        {/* Circuit traces - right hemisphere */}
        <path d="M70 35 L60 35 L60 45" fill="none" stroke="#ec4899" strokeWidth="1.5" filter="url(#glowNeural)"/>
        <path d="M75 50 L65 50 L65 60 L55 60" fill="none" stroke="#ec4899" strokeWidth="1.5" filter="url(#glowNeural)"/>
        <path d="M70 70 L60 70 L60 65" fill="none" stroke="#ec4899" strokeWidth="1.5" filter="url(#glowNeural)"/>
        
        {/* Cross connections */}
        <path d="M40 45 L50 50 L60 45" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.7" filter="url(#glowNeural)"/>
        <path d="M45 60 L50 55 L55 60" fill="none" stroke="#ec4899" strokeWidth="1" opacity="0.7" filter="url(#glowNeural)"/>
        
        {/* Neural nodes - left side (teal) */}
        <circle cx="30" cy="35" r="4" fill="#14b8a6" filter="url(#glowNeuralStrong)"/>
        <circle cx="40" cy="45" r="3" fill="#14b8a6" filter="url(#glowNeural)"/>
        <circle cx="25" cy="50" r="3" fill="#14b8a6" filter="url(#glowNeural)"/>
        <circle cx="35" cy="60" r="3" fill="#14b8a6" filter="url(#glowNeural)"/>
        <circle cx="30" cy="70" r="4" fill="#14b8a6" filter="url(#glowNeuralStrong)"/>
        
        {/* Neural nodes - right side (pink) */}
        <circle cx="70" cy="35" r="4" fill="#ec4899" filter="url(#glowNeuralStrong)"/>
        <circle cx="60" cy="45" r="3" fill="#ec4899" filter="url(#glowNeural)"/>
        <circle cx="75" cy="50" r="3" fill="#ec4899" filter="url(#glowNeural)"/>
        <circle cx="65" cy="60" r="3" fill="#ec4899" filter="url(#glowNeural)"/>
        <circle cx="70" cy="70" r="4" fill="#ec4899" filter="url(#glowNeuralStrong)"/>
        
        {/* Central processor node */}
        <circle cx="50" cy="50" r="6" fill="#0d9488" stroke="#ec4899" strokeWidth="2" filter="url(#glowNeuralStrong)"/>
        <circle cx="50" cy="50" r="3" fill="#fff"/>
        
        {/* Data pulses - small bright dots along traces */}
        <circle cx="35" cy="35" r="2" fill="#fff" opacity="0.9"/>
        <circle cx="65" cy="50" r="2" fill="#fff" opacity="0.9"/>
        <circle cx="50" cy="55" r="2" fill="#fff" opacity="0.9"/>
      </svg>
    ),
    Singularity: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          <filter id="glow6" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow6Strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="vortexGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ec4899"/>
            <stop offset="50%" stopColor="#14b8a6"/>
            <stop offset="100%" stopColor="#0d9488"/>
          </radialGradient>
        </defs>
        {/* Outer energy ring */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="#ec4899" strokeWidth="2" opacity="0.4" filter="url(#glow6)"/>
        {/* Swirling vortex rings */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="#ec4899" strokeWidth="3" filter="url(#glow6Strong)"/>
        <circle cx="50" cy="50" r="28" fill="none" stroke="#14b8a6" strokeWidth="3" filter="url(#glow6)"/>
        <circle cx="50" cy="50" r="21" fill="none" stroke="#ec4899" strokeWidth="2" filter="url(#glow6)"/>
        <circle cx="50" cy="50" r="14" fill="none" stroke="#14b8a6" strokeWidth="2" filter="url(#glow6)"/>
        {/* Bright core */}
        <circle cx="50" cy="50" r="8" fill="#ec4899" filter="url(#glow6Strong)"/>
        <circle cx="50" cy="50" r="4" fill="#fff"/>
        {/* Energy beams shooting out */}
        <line x1="50" y1="8" x2="50" y2="20" stroke="#14b8a6" strokeWidth="2" filter="url(#glow6)"/>
        <line x1="50" y1="80" x2="50" y2="92" stroke="#14b8a6" strokeWidth="2" filter="url(#glow6)"/>
        <line x1="8" y1="50" x2="20" y2="50" stroke="#14b8a6" strokeWidth="2" filter="url(#glow6)"/>
        <line x1="80" y1="50" x2="92" y2="50" stroke="#14b8a6" strokeWidth="2" filter="url(#glow6)"/>
        {/* Diagonal beams */}
        <line x1="15" y1="15" x2="25" y2="25" stroke="#ec4899" strokeWidth="2" filter="url(#glow6)"/>
        <line x1="85" y1="15" x2="75" y2="25" stroke="#ec4899" strokeWidth="2" filter="url(#glow6)"/>
        <line x1="15" y1="85" x2="25" y2="75" stroke="#ec4899" strokeWidth="2" filter="url(#glow6)"/>
        <line x1="85" y1="85" x2="75" y2="75" stroke="#ec4899" strokeWidth="2" filter="url(#glow6)"/>
      </svg>
    )
  };

  // Power Cell Icons (Concept 4) - Now with 7 levels
  const PowerIcons = {
    Depleted: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          <filter id="glowP0" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="25" y="30" width="45" height="40" rx="4" fill="none" stroke="#374151" strokeWidth="2" opacity="0.5"/>
        <rect x="70" y="42" width="8" height="16" rx="2" fill="#374151" opacity="0.5"/>
        {/* X mark */}
        <line x1="38" y1="42" x2="57" y2="58" stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
        <line x1="57" y1="42" x2="38" y2="58" stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
    LowPower: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
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
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <defs>
          <filter id="glowP6" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glowP6Strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
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
        <circle cx="50" cy="50" r="30" fill="url(#plasmaGrad)" filter="url(#glowP6Strong)"/>
        {/* Lightning bolts radiating out */}
        <path d="M50 5 L48 18 L52 18 L50 12" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M50 88 L52 82 L48 82 L50 95" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M5 50 L18 48 L18 52 L12 50" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M88 50 L82 52 L82 48 L95 50" fill="#14b8a6" filter="url(#glowP6)"/>
        <path d="M18 18 L28 25 L25 28 L20 22" fill="#ec4899" filter="url(#glowP6)"/>
        <path d="M82 18 L72 25 L75 28 L80 22" fill="#ec4899" filter="url(#glowP6)"/>
        <path d="M18 82 L28 75 L25 72 L20 78" fill="#ec4899" filter="url(#glowP6)"/>
        <path d="M82 82 L72 75 L75 72 L80 78" fill="#ec4899" filter="url(#glowP6)"/>
      </svg>
    )
  };

  const systemData = [
    { name: 'Standby', points: '0', tagline: '"Currently in sleep mode."', Icon: SystemIcons.Standby },
    { name: 'Waking Up', points: '250', tagline: '"Cursor blinking. Brain loading."', Icon: SystemIcons.WakingUp },
    { name: 'Booting', points: '1,000', tagline: '"Knowledge loading... please wait."', Icon: SystemIcons.Booting },
    { name: 'Online', points: '5,000', tagline: '"Fully operational. Slightly dangerous."', Icon: SystemIcons.Online },
    { name: 'Overclocked', points: '20,000', tagline: '"Running hot. Can\'t be stopped."', Icon: SystemIcons.Overclocked },
    { name: 'Neural Net', points: '75,000', tagline: '"Thinking in algorithms now."', Icon: SystemIcons.NeuralNet },
    { name: 'Singularity', points: '200,000', tagline: '"You ARE the revision."', Icon: SystemIcons.Singularity },
  ];

  const powerData = [
    { name: 'Depleted', points: '0', tagline: '"Battery not found."', Icon: PowerIcons.Depleted },
    { name: 'Low Power', points: '250', tagline: '"Running on vibes and caffeine."', Icon: PowerIcons.LowPower },
    { name: 'Charging', points: '1,000', tagline: '"Absorbing knowledge."', Icon: PowerIcons.Charging },
    { name: 'Full Cell', points: '5,000', tagline: '"Ready for anything. Probably."', Icon: PowerIcons.FullCell },
    { name: 'Overcharged', points: '20,000', tagline: '"Warning: may cause excellence."', Icon: PowerIcons.Overcharged },
    { name: 'Nuclear', points: '75,000', tagline: '"Dangerously prepared."', Icon: PowerIcons.Nuclear },
    { name: 'Unlimited Power', points: '200,000', tagline: '"The grid can\'t contain you."', Icon: PowerIcons.UnlimitedPower },
  ];

  const activeData = activeTab === 'system' ? systemData : powerData;

  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-teal-400 to-pink-500 bg-clip-text text-transparent">
        Study App Level Icons
      </h1>
      <p className="text-gray-500 text-center mb-8">Neon Cyber Theme — 7 Levels</p>
      
      {/* Tab Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'system'
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
              : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-teal-500'
          }`}
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
        >
          🔋 Power Cell
        </button>
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {activeData.map((item, index) => (
          <div
            key={item.name}
            className={`bg-gray-900 rounded-xl p-5 border transition-all hover:shadow-lg group ${
              index === 0 
                ? 'border-gray-700 hover:border-gray-500 hover:shadow-gray-500/10' 
                : 'border-gray-800 hover:border-teal-500 hover:shadow-teal-500/10'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="mb-3 transform group-hover:scale-110 transition-transform">
                <item.Icon />
              </div>
              <div className={`text-xs mb-1 ${index === 0 ? 'text-gray-600' : 'text-gray-500'}`}>
                Level {index + 1}
              </div>
              <h3 className={`text-base font-bold mb-1 ${index === 0 ? 'text-gray-500' : 'text-white'}`}>
                {item.name}
              </h3>
              <div className={`text-sm font-mono mb-2 ${index === 0 ? 'text-gray-600' : 'text-teal-400'}`}>
                {item.points} pts
              </div>
              <p className="text-gray-500 text-xs text-center italic">{item.tagline}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Color Palette Reference */}
      <div className="mt-10 flex justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-black border border-gray-700"></div>
          <span className="text-gray-500 text-sm">Black</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-teal-500"></div>
          <span className="text-gray-500 text-sm">Turquoise</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-500"></div>
          <span className="text-gray-500 text-sm">Neon Pink</span>
        </div>
      </div>
    </div>
  );
};

export default IconShowcase;
