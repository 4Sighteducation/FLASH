import React, { memo } from 'react';
import { Platform, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

type Props = {
  rankKey: string;
  size?: number;
  // If true, adds subtle native shadow around the icon container (helps "glow" on mobile).
  withContainerGlow?: boolean;
};

const glowStroke = (color: string, width: number, opacity: number) => ({
  stroke: color,
  strokeWidth: width,
  opacity,
});

function rankIndexFromKey(rankKey: string) {
  // Order matches the 7-rank ladder.
  switch (rankKey) {
    case 'rookie':
      return 0;
    case 'learner':
      return 1;
    case 'scholar':
      return 2;
    case 'contender':
      return 3;
    case 'ace':
      return 4;
    case 'elite':
      return 5;
    case 'singularity':
      return 6;
    default:
      return 0;
  }
}

function GlowRing({
  r,
  color,
  baseWidth,
}: {
  r: number;
  color: string;
  baseWidth: number;
}) {
  // Fake glow: stack wider strokes behind the main line.
  // Native needs this to feel bright; SVG filter glows aren't available.
  return (
    <>
      <Circle cx="50" cy="50" r={r} fill="none" {...glowStroke(color, baseWidth + 10, 0.10)} />
      <Circle cx="50" cy="50" r={r} fill="none" {...glowStroke(color, baseWidth + 7, 0.16)} />
      <Circle cx="50" cy="50" r={r} fill="none" {...glowStroke(color, baseWidth + 4, 0.24)} />
    </>
  );
}

function FrameRings({ rankIdx }: { rankIdx: number }) {
  // Second visual progression cue: more rings + brighter accents as rank increases.
  // Keep inside the icon box so it works everywhere (Home header, Profile, Ladder).
  const rings = Math.min(4, 1 + Math.floor(rankIdx / 2)); // 1..4 rings across 7 ranks
  // Brighter neon palette for mobile
  const accentA = '#00F5FF';
  const accentB = '#FF2D9A';

  const ringDefs = Array.from({ length: rings }).map((_, i) => {
    const r = 48 - i * 3.75; // 48, 44.25, 40.5, 36.75
    const color = i % 2 === 0 ? accentA : accentB;
    const baseWidth = 2.2 - i * 0.15;
    const solidOpacity = 0.22 + rankIdx * 0.035; // becomes more intense at higher ranks
    const dash = rankIdx >= 5 && i === 0 ? '2 6' : undefined; // “high-rank tech” effect
    return { r, color, baseWidth: Math.max(1.6, baseWidth), solidOpacity: Math.min(0.55, solidOpacity), dash };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
      {/* Halo behind everything (helps Android a lot) */}
      <Defs>
        <RadialGradient id="haloA" cx="50%" cy="50%" r="60%">
          <Stop offset="0%" stopColor={accentA} stopOpacity={0.22 + rankIdx * 0.03} />
          <Stop offset="55%" stopColor={accentA} stopOpacity={0.10 + rankIdx * 0.02} />
          <Stop offset="100%" stopColor={accentA} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="haloB" cx="50%" cy="50%" r="60%">
          <Stop offset="0%" stopColor={accentB} stopOpacity={0.18 + rankIdx * 0.025} />
          <Stop offset="55%" stopColor={accentB} stopOpacity={0.08 + rankIdx * 0.015} />
          <Stop offset="100%" stopColor={accentB} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="49" fill="url(#haloA)" />
      <Circle cx="50" cy="50" r="45" fill="url(#haloB)" opacity={0.9} />

      {/* Top-tier sparks: ranks 4/5/6 (Overclocked/Neural Net/Singularity) get progressively more "impressive" */}
      {rankIdx >= 4 ? (
        <>
          {(() => {
            const tier = Math.min(2, rankIdx - 4); // 0..2
            const count = tier === 0 ? 4 : tier === 1 ? 7 : 10;
            const baseOpacity = tier === 0 ? 0.55 : tier === 1 ? 0.7 : 0.85;
            const strokeW = tier === 0 ? 1.9 : tier === 1 ? 2.2 : 2.6;
            const radius = tier === 0 ? 47 : tier === 1 ? 48 : 49;

            // Deterministic "spark" positions around the ring (degrees).
            const angles = [18, 52, 96, 140, 196, 234, 276, 312, 338, 10];
            const pick = angles.slice(0, count);

            const toXY = (deg: number, r: number) => {
              const rad = (deg * Math.PI) / 180;
              return { x: 50 + Math.cos(rad) * r, y: 50 + Math.sin(rad) * r };
            };

            return pick.map((deg, i) => {
              const a = toXY(deg, radius);
              const b = toXY(deg + 8, radius - 6);
              const c = toXY(deg - 10, radius - 4);
              const color = i % 2 === 0 ? accentA : accentB;
              const op = Math.min(1, baseOpacity + i * 0.03);
              return (
                <React.Fragment key={`spark-${deg}`}>
                  {/* glow under-stroke */}
                  <Line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={strokeW + 7}
                    opacity={op * 0.22}
                    strokeLinecap="round"
                  />
                  {/* bloom mid-stroke */}
                  <Line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={strokeW + 3}
                    opacity={op * 0.28}
                    strokeLinecap="round"
                  />
                  {/* main spark stroke */}
                  <Line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={color}
                    strokeWidth={strokeW}
                    opacity={op}
                    strokeLinecap="round"
                  />
                  {/* small cross flick */}
                  <Line
                    x1={a.x}
                    y1={a.y}
                    x2={c.x}
                    y2={c.y}
                    stroke={color}
                    strokeWidth={Math.max(1.2, strokeW - 0.3)}
                    opacity={op * 0.85}
                    strokeLinecap="round"
                  />
                  {/* bright tip */}
                  <Circle cx={a.x} cy={a.y} r={tier === 2 ? 2.2 : tier === 1 ? 2.0 : 1.8} fill="#ffffff" opacity={op * 0.95} />
                </React.Fragment>
              );
            });
          })()}
        </>
      ) : null}

      {ringDefs.map((d, idx) => (
        <React.Fragment key={`${d.color}-${idx}`}>
          <Circle cx="50" cy="50" r={d.r} fill="none" {...glowStroke(d.color, d.baseWidth + 10, 0.10)} />
          <Circle cx="50" cy="50" r={d.r} fill="none" {...glowStroke(d.color, d.baseWidth + 6, 0.18)} />
          <Circle cx="50" cy="50" r={d.r} fill="none" {...glowStroke(d.color, d.baseWidth + 3, 0.26)} />
          <Circle
            cx="50"
            cy="50"
            r={d.r}
            fill="none"
            stroke={d.color}
            strokeWidth={d.baseWidth}
            opacity={Math.min(0.75, d.solidOpacity + 0.12)}
            strokeDasharray={d.dash}
          />
        </React.Fragment>
      ))}
    </Svg>
  );
}

function StandbyIcon({ size }: { size: number }) {
  const neonPink = '#FF2D9A';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <GlowRing r={40} color={neonPink} baseWidth={2} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke={neonPink} strokeWidth="1.5" opacity={0.30} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="2.5" opacity={0.55} />

      {/* Neon Z glow: stack strokes behind the filled glyph (SVG filters aren't available in RN). */}
      <SvgText x="50" y="58" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={10} opacity={0.10} fontSize="30" fontFamily="Arial" fontWeight="700">
        Z
      </SvgText>
      <SvgText x="50" y="58" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={6} opacity={0.16} fontSize="30" fontFamily="Arial" fontWeight="700">
        Z
      </SvgText>
      <SvgText x="50" y="58" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={3.5} opacity={0.24} fontSize="30" fontFamily="Arial" fontWeight="700">
        Z
      </SvgText>
      <SvgText
        x="50"
        y="58"
        textAnchor="middle"
        fill={neonPink}
        fontSize="30"
        fontFamily="Arial"
        fontWeight="700"
      >
        Z
      </SvgText>

      <SvgText x="62" y="48" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={8} opacity={0.08} fontSize="24" fontFamily="Arial" fontWeight="700">
        z
      </SvgText>
      <SvgText x="62" y="48" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={4.5} opacity={0.14} fontSize="24" fontFamily="Arial" fontWeight="700">
        z
      </SvgText>
      <SvgText
        x="62"
        y="48"
        textAnchor="middle"
        fill={neonPink}
        fontSize="24"
        fontFamily="Arial"
        fontWeight="700"
        opacity={0.85}
      >
        z
      </SvgText>

      <SvgText x="72" y="40" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={6} opacity={0.06} fontSize="18" fontFamily="Arial" fontWeight="700">
        z
      </SvgText>
      <SvgText x="72" y="40" textAnchor="middle" fill="none" stroke={neonPink} strokeWidth={3.5} opacity={0.10} fontSize="18" fontFamily="Arial" fontWeight="700">
        z
      </SvgText>
      <SvgText
        x="72"
        y="40"
        textAnchor="middle"
        fill={neonPink}
        fontSize="18"
        fontFamily="Arial"
        fontWeight="700"
        opacity={0.75}
      >
        z
      </SvgText>
    </Svg>
  );
}

function WakingUpIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <GlowRing r={40} color="#14b8a6" baseWidth={2} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke="#0d9488" strokeWidth="2.5" opacity={0.45} />
      <Rect x="42" y="35" width="16" height="30" fill="none" stroke="#14b8a6" strokeWidth="2.5" opacity={0.65} />
      <Rect x="45" y="38" width="3.5" height="24" fill="#14b8a6" opacity={0.9} />
      <Rect x="50" y="58" width="12" height="3.5" fill="#ec4899" opacity={0.9} />
    </Svg>
  );
}

function BootingIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#14b8a6" />
          <Stop offset="100%" stopColor="#ec4899" />
        </LinearGradient>
      </Defs>
      <Rect x="15" y="40" width="70" height="20" rx="4" fill="none" stroke="#0d9488" strokeWidth="2.5" opacity={0.9} />
      <Rect x="18" y="43" width="40" height="14" rx="2" fill="url(#loadGrad)" />
      <SvgText x="50" y="75" textAnchor="middle" fill="#14b8a6" fontSize="11" fontFamily="monospace">
        57%
      </SvgText>
    </Svg>
  );
}

function OnlineIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <GlowRing r={42} color="#ec4899" baseWidth={3} />
      <GlowRing r={35} color="#14b8a6" baseWidth={3} />
      <Circle cx="50" cy="50" r="42" fill="none" stroke="#ec4899" strokeWidth="3.5" opacity={0.25} />
      <Circle cx="50" cy="50" r="35" fill="none" stroke="#ec4899" strokeWidth="4.5" opacity={0.9} />
      <Circle cx="50" cy="50" r="35" fill="none" stroke="#14b8a6" strokeWidth="2.5" opacity={0.9} />
      <Path d="M50 22 L50 50" stroke="#ec4899" strokeWidth="6.5" strokeLinecap="round" />
      <Circle cx="50" cy="50" r="18" fill="none" stroke="#14b8a6" strokeWidth="2.5" opacity={0.7} />
      <Circle cx="50" cy="58" r="5.5" fill="#ec4899" />
      <Line x1="15" y1="50" x2="22" y2="50" stroke="#ec4899" strokeWidth="2.5" opacity={0.6} />
      <Line x1="78" y1="50" x2="85" y2="50" stroke="#ec4899" strokeWidth="2.5" opacity={0.6} />
      <Line x1="50" y1="78" x2="50" y2="85" stroke="#14b8a6" strokeWidth="2.5" opacity={0.6} />
    </Svg>
  );
}

function OverclockedIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="25" y="30" width="50" height="40" rx="4" fill="none" stroke="#14b8a6" strokeWidth="2.5" />
      <Rect x="35" y="38" width="30" height="24" fill="#0d9488" opacity={0.3} />
      <Line x1="30" y1="20" x2="30" y2="30" stroke="#14b8a6" strokeWidth="2.5" />
      <Line x1="50" y1="20" x2="50" y2="30" stroke="#14b8a6" strokeWidth="2.5" />
      <Line x1="70" y1="20" x2="70" y2="30" stroke="#14b8a6" strokeWidth="2.5" />
      <Line x1="30" y1="70" x2="30" y2="80" stroke="#14b8a6" strokeWidth="2.5" />
      <Line x1="50" y1="70" x2="50" y2="80" stroke="#14b8a6" strokeWidth="2.5" />
      <Line x1="70" y1="70" x2="70" y2="80" stroke="#14b8a6" strokeWidth="2.5" />
      {/* Fake glow flames: thicker stroke behind */}
      <Path d="M35 35 Q38 28 40 35 Q42 25 45 35" fill="none" stroke="#ec4899" strokeWidth="6" opacity={0.10} />
      <Path d="M55 35 Q58 25 60 35 Q62 28 65 35" fill="none" stroke="#ec4899" strokeWidth="6" opacity={0.10} />
      <Path d="M35 35 Q38 28 40 35 Q42 25 45 35" fill="none" stroke="#ec4899" strokeWidth="2.5" opacity={0.9} />
      <Path d="M55 35 Q58 25 60 35 Q62 28 65 35" fill="none" stroke="#ec4899" strokeWidth="2.5" opacity={0.9} />
    </Svg>
  );
}

function NeuralNetIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#14b8a6" />
          <Stop offset="100%" stopColor="#ec4899" />
        </LinearGradient>
      </Defs>

      {/* Outline glow */}
      <Path
        d="M50 15 Q75 15 80 35 Q85 55 75 70 Q65 85 50 85 Q35 85 25 70 Q15 55 20 35 Q25 15 50 15"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="6"
        opacity={0.08}
      />
      <Path
        d="M50 15 Q75 15 80 35 Q85 55 75 70 Q65 85 50 85 Q35 85 25 70 Q15 55 20 35 Q25 15 50 15"
        fill="none"
        stroke="url(#neuralGrad)"
        strokeWidth="2.5"
      />
      <Path d="M50 20 Q52 50 50 80" fill="none" stroke="#14b8a6" strokeWidth="1" opacity={0.5} />

      <Path d="M30 35 L40 35 L40 45" fill="none" stroke="#14b8a6" strokeWidth="1.5" />
      <Path d="M25 50 L35 50 L35 60 L45 60" fill="none" stroke="#14b8a6" strokeWidth="1.5" />
      <Path d="M30 70 L40 70 L40 65" fill="none" stroke="#14b8a6" strokeWidth="1.5" />

      <Path d="M70 35 L60 35 L60 45" fill="none" stroke="#ec4899" strokeWidth="1.5" />
      <Path d="M75 50 L65 50 L65 60 L55 60" fill="none" stroke="#ec4899" strokeWidth="1.5" />
      <Path d="M70 70 L60 70 L60 65" fill="none" stroke="#ec4899" strokeWidth="1.5" />

      <Path d="M40 45 L50 50 L60 45" fill="none" stroke="#14b8a6" strokeWidth="1" opacity={0.7} />
      <Path d="M45 60 L50 55 L55 60" fill="none" stroke="#ec4899" strokeWidth="1" opacity={0.7} />

      <Circle cx="30" cy="35" r="4" fill="#14b8a6" />
      <Circle cx="40" cy="45" r="3" fill="#14b8a6" />
      <Circle cx="25" cy="50" r="3" fill="#14b8a6" />
      <Circle cx="35" cy="60" r="3" fill="#14b8a6" />
      <Circle cx="30" cy="70" r="4" fill="#14b8a6" />

      <Circle cx="70" cy="35" r="4" fill="#ec4899" />
      <Circle cx="60" cy="45" r="3" fill="#ec4899" />
      <Circle cx="75" cy="50" r="3" fill="#ec4899" />
      <Circle cx="65" cy="60" r="3" fill="#ec4899" />
      <Circle cx="70" cy="70" r="4" fill="#ec4899" />

      <Circle cx="50" cy="50" r="6.5" fill="#0d9488" stroke="#ec4899" strokeWidth="2.5" />
      <Circle cx="50" cy="50" r="3" fill="#fff" />

      <Circle cx="35" cy="35" r="2" fill="#fff" opacity={0.9} />
      <Circle cx="65" cy="50" r="2" fill="#fff" opacity={0.9} />
      <Circle cx="50" cy="55" r="2" fill="#fff" opacity={0.9} />
    </Svg>
  );
}

function SingularityIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <GlowRing r={35} color="#ec4899" baseWidth={3} />
      <GlowRing r={28} color="#14b8a6" baseWidth={3} />
      <Circle cx="50" cy="50" r="42" fill="none" stroke="#ec4899" strokeWidth="2" opacity={0.4} />
      <Circle cx="50" cy="50" r="35" fill="none" stroke="#ec4899" strokeWidth="3" />
      <Circle cx="50" cy="50" r="28" fill="none" stroke="#14b8a6" strokeWidth="3" />
      <Circle cx="50" cy="50" r="21" fill="none" stroke="#ec4899" strokeWidth="2" />
      <Circle cx="50" cy="50" r="14" fill="none" stroke="#14b8a6" strokeWidth="2" />
      <Circle cx="50" cy="50" r="8" fill="#ec4899" />
      <Circle cx="50" cy="50" r="4" fill="#fff" />

      <Line x1="50" y1="8" x2="50" y2="20" stroke="#14b8a6" strokeWidth="2" />
      <Line x1="50" y1="80" x2="50" y2="92" stroke="#14b8a6" strokeWidth="2" />
      <Line x1="8" y1="50" x2="20" y2="50" stroke="#14b8a6" strokeWidth="2" />
      <Line x1="80" y1="50" x2="92" y2="50" stroke="#14b8a6" strokeWidth="2" />

      <Line x1="15" y1="15" x2="25" y2="25" stroke="#ec4899" strokeWidth="2" />
      <Line x1="85" y1="15" x2="75" y2="25" stroke="#ec4899" strokeWidth="2" />
      <Line x1="15" y1="85" x2="25" y2="75" stroke="#ec4899" strokeWidth="2" />
      <Line x1="85" y1="85" x2="75" y2="75" stroke="#ec4899" strokeWidth="2" />
    </Svg>
  );
}

function iconForRankKey(rankKey: string) {
  // Keep existing rank keys stable, but swap their visuals to the System Status set.
  switch (rankKey) {
    case 'rookie':
      return StandbyIcon;
    case 'learner':
      return WakingUpIcon;
    case 'scholar':
      return BootingIcon;
    case 'contender':
      return OnlineIcon;
    case 'ace':
      return OverclockedIcon;
    case 'elite':
      return NeuralNetIcon;
    case 'legend':
      return SingularityIcon;
    default:
      return StandbyIcon;
  }
}

function SystemStatusRankIconInner({ rankKey, size = 44, withContainerGlow = true }: Props) {
  const IconCmp = iconForRankKey(rankKey);
  // `size` is the overall box size (so it fits existing UI slots).
  const wrapSize = size;
  const iconSize = Math.max(12, size - 8);
  const rankIdx = rankIndexFromKey(rankKey);
  return (
    <View
      style={
        withContainerGlow
          ? [
              {
                width: wrapSize,
                height: wrapSize,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: wrapSize / 2,
                backgroundColor: 'rgba(0,0,0,0.18)',
              },
              Platform.select({
                ios: {
                  shadowColor: '#14b8a6',
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                },
                android: {
                  // Android shadow is limited; elevation gives a soft lift.
                  elevation: 2,
                },
                default: {},
              }),
            ]
          : undefined
      }
    >
      <FrameRings rankIdx={rankIdx} />
      <IconCmp size={iconSize} />
    </View>
  );
}

export default memo(SystemStatusRankIconInner);


