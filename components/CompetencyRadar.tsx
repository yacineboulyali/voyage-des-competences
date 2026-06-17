import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle as SVGCircle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import { SkillScore } from '../types';

// ─── Animated SVG primitives ───────────────────────────────────────────────
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedCircle  = Animated.createAnimatedComponent(SVGCircle);

// ─── Data ──────────────────────────────────────────────────────────────────
export const RADAR_SKILLS_DEFAULT = [
  { skill_label: 'Prise de Décision', score: 78, color: '#2c4e3e' },
  { skill_label: 'Travail en Équipe', score: 65, color: '#8e4e14' },
  { skill_label: 'Gestion du Stress', score: 82, color: '#735c00' },
];

// ─── Precomputed geometry (viewBox 200×200, centre 100×100, maxR = 84) ─────
// maxR = 84 → +20% vs original 70
// Angles: top = −π/2, bottom-right = π/6, bottom-left = 5π/6
const CX = 100, CY = 100, MAX_R = 84;

function gridPts(ratio: number): string {
  const r = MAX_R * ratio;
  return [
    `${CX},${CY - r}`,                                          // top
    `${CX + r * 0.8660254},${CY + r * 0.5}`,                   // br
    `${CX - r * 0.8660254},${CY + r * 0.5}`,                   // bl
  ].join(' ');
}

// Static axis line endpoints (r = MAX_R)
const EP0 = `${CX},${CY - MAX_R}`;
const EP1 = `${CX + MAX_R * 0.8660254},${CY + MAX_R * 0.5}`;
const EP2 = `${CX - MAX_R * 0.8660254},${CY + MAX_R * 0.5}`;

// ─── Animated progress bar ─────────────────────────────────────────────────
const SkillBar = ({ value, color, delay }: { value: number; color: string; delay: number }) => {
  const [bw, setBW] = useState(0);
  const animW = useSharedValue(0);

  useEffect(() => {
    if (bw <= 0) return;
    const t = setTimeout(() => {
      animW.value = withTiming(bw * value / 100, {
        duration: 900,
        easing: Easing.out(Easing.exp),
      });
    }, delay);
    return () => clearTimeout(t);
  }, [bw]);

  const animStyle = useAnimatedStyle(() => ({ width: animW.value }));

  return (
    <View style={css.barBg} onLayout={e => setBW(e.nativeEvent.layout.width)}>
      <Animated.View style={[css.barFill, { backgroundColor: color }, animStyle]} />
    </View>
  );
};

interface CompetencyRadarProps {
  skills?: SkillScore[];
}

// ─── Main component ────────────────────────────────────────────────────────
export const CompetencyRadar: React.FC<CompetencyRadarProps> = ({ skills }) => {
  const progress = useSharedValue(0);

  // We use the first 3 skills, or defaults if not enough data
  const data = (skills && skills.length >= 3) 
    ? skills.slice(0, 3) 
    : RADAR_SKILLS_DEFAULT;

  useEffect(() => {
    const t = setTimeout(() => {
      progress.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.exp) });
    }, 350);
    return () => clearTimeout(t);
  }, []);

  // Animated data polygon draws from center outward
  const dataProps = useAnimatedProps(() => {
    'worklet';
    const p = progress.value;
    const r0 = 84 * (data[0].score / 100) * p;
    const r1 = 84 * (data[1].score / 100) * p;
    const r2 = 84 * (data[2].score / 100) * p;
    return {
      points: [
        `${100},${100 - r0}`,                             // top
        `${100 + r1 * 0.8660254},${100 + r1 * 0.5}`,     // br
        `${100 - r2 * 0.8660254},${100 + r2 * 0.5}`,     // bl
      ].join(' '),
    };
  });

  // Animated dots – move outward and pop in
  const dot0 = useAnimatedProps(() => {
    'worklet';
    const p = progress.value;
    const r = 84 * (data[0].score / 100) * p;
    return { cx: 100, cy: 100 - r, r: 4 * Math.min(p * 2.5, 1) };
  });
  const dot1 = useAnimatedProps(() => {
    'worklet';
    const p = progress.value;
    const r = 84 * (data[1].score / 100) * p;
    return { cx: 100 + r * 0.8660254, cy: 100 + r * 0.5, r: 4 * Math.min(p * 2.5, 1) };
  });
  const dot2 = useAnimatedProps(() => {
    'worklet';
    const p = progress.value;
    const r = 84 * (data[2].score / 100) * p;
    return { cx: 100 - r * 0.8660254, cy: 100 + r * 0.5, r: 4 * Math.min(p * 2.5, 1) };
  });

  return (
    <Animated.View entering={FadeInDown.duration(700).springify()}>

      {/* ── SVG square ───────────────────────────────────────── */}
      <View style={css.svgBox}>
        <Svg viewBox="0 0 200 200" style={css.svg}>
          {/* Grid rings */}
          <Polygon points={gridPts(0.33)} fill="none" stroke="#bfc9c1" strokeWidth="0.8" strokeDasharray="3,2" />
          <Polygon points={gridPts(0.66)} fill="none" stroke="#bfc9c1" strokeWidth="0.8" strokeDasharray="3,2" />
          <Polygon points={gridPts(1.0)}  fill="none" stroke="#bfc9c1" strokeWidth="1.2" />

          {/* Axis lines from center */}
          <Polygon points={`${CX},${CY} ${EP0}`} fill="none" stroke="#bfc9c1" strokeWidth="0.8" />
          <Polygon points={`${CX},${CY} ${EP1}`} fill="none" stroke="#bfc9c1" strokeWidth="0.8" />
          <Polygon points={`${CX},${CY} ${EP2}`} fill="none" stroke="#bfc9c1" strokeWidth="0.8" />

          {/* ← Animated data polygon */}
          <AnimatedPolygon
            animatedProps={dataProps}
            fill="rgba(44, 78, 62, 0.15)"
            stroke="#2c4e3e"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* ← Animated dots */}
          <AnimatedCircle animatedProps={dot0} fill={data[0].color} />
          <AnimatedCircle animatedProps={dot1} fill={data[1].color} />
          <AnimatedCircle animatedProps={dot2} fill={data[2].color} />

          {/* Center dot */}
          <SVGCircle cx={CX} cy={CY} r={2} fill="#bfc9c1" />
        </Svg>

        {/* ── Axis labels (absolute, outside SVG) ── */}
        <Text style={[css.label, { top: 6, left: 0, right: 0, textAlign: 'center' }]}>
          {data[0].skill_label.toUpperCase().replace(' ', '\n')}
        </Text>
        <Text style={[css.label, { bottom: 12, right: 4, textAlign: 'right' }]}>
          {data[1].skill_label.toUpperCase().replace(' ', '\n')}
        </Text>
        <Text style={[css.label, { bottom: 12, left: 4, textAlign: 'left' }]}>
          {data[2].skill_label.toUpperCase().replace(' ', '\n')}
        </Text>
      </View>

      {/* ── Skill legend with animated progress bars ─────────── */}
      <View style={css.legend}>
        {data.map((s, i) => (
          <Animated.View key={i} entering={FadeInUp.delay(600 + i * 130)} style={css.row}>
            <View style={[css.dot, { backgroundColor: s.color }]} />
            <View style={css.info}>
              <View style={css.rowHeader}>
                <Text style={[css.skillName, { color: s.color }]}>{s.skill_label}</Text>
                <Text style={[css.skillPct, { color: s.color }]}>{s.score}%</Text>
              </View>
              <SkillBar value={s.score} color={s.color} delay={800 + i * 130} />
            </View>
          </Animated.View>
        ))}
      </View>

    </Animated.View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const css = StyleSheet.create({
  svgBox: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '900',
    color: '#2c4e3e',
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  legend: {
    marginTop: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skillPct: {
    fontSize: 12,
    fontWeight: '900',
  },
  barBg: {
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
