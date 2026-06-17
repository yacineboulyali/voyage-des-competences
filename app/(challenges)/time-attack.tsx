import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, Vibration, View, ScrollView } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import MissionTracker from '../../components/MissionTracker';
import { useTheme } from '../../hooks/useTheme';
import { ProgressService } from '../../services/progress';
import { SoundService } from '../../services/sounds';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { useMissionStore } from '../../stores/missionStore';
import { useQuestions } from '../../hooks/useQuestions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScreenLoader } from '../../components/FullScreenLoader';

const PATTERNS = [
  { id: '1', icon: 'star', color: '#cca72f' },
  { id: '2', icon: 'favorite', color: '#e11d48' },
  { id: '3', icon: 'vibration', color: '#8e4e14' },
  { id: '4', icon: 'brightness-7', color: '#2563eb' }
];

const { width } = Dimensions.get('window');

export default function TimeAttackScreen() {
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const missionId = params.missionId as string;
  const cityId = params.cityId as string;
  const questionIndex = (Array.isArray(params.questionIndex) ? params.questionIndex[0] : params.questionIndex) || '0';

  const { questions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId);
  const qData = questions[parseInt(questionIndex)];

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targetPattern, setTargetPattern] = useState<any>(null);
  const [grid, setGrid] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [runtimeError, setRuntimeError] = useState<any>(null);

  const shakeX = useSharedValue(0);
  const stressLevel = useSharedValue(0); // 0 to 1

  const containerStyle = useAnimatedStyle(() => {
    const bg = colors?.background ?? '#FDF9F3';
    const sValue = stressLevel?.value ?? 0;
    const xValue = shakeX?.value ?? 0;
    
    return {
      backgroundColor: interpolateColor(
        sValue,
        [0, 1],
        [bg, '#FEE2E2']
      ),
      transform: [{ translateX: xValue }]
    };
  });

  const timerStyle = useAnimatedStyle(() => {
    const primary = colors?.primary ?? '#1A1A2E';
    const level = stressLevel?.value ?? 0;
    return {
      color: level > 0.5 ? '#EF4444' : primary,
      transform: [{ scale: withSpring(1 + level * 0.2) }]
    };
  });

  useEffect(() => {
    try {
      if (questions && questions.length > 0 && missionId) {
        initQueue(missionId, questions);
      }
    } catch (err) {
      console.error("Queue initialization error:", err);
      setRuntimeError(err);
    }
  }, [questions, missionId, initQueue]);


  const generateRound = useCallback(() => {
    if (PATTERNS.length === 0) return;
    const newTarget = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    setTargetPattern(newTarget);

    const newGrid = [...PATTERNS].sort(() => 0.5 - Math.random()).slice(0, 4);
    if (!newGrid.find(p => p.id === newTarget.id)) {
      newGrid[Math.floor(Math.random() * 4)] = newTarget;
    }
    setGrid(newGrid);
  }, [PATTERNS]);

  useEffect(() => {
    if (PATTERNS.length > 0) {
      generateRound();
      setIsActive(true);
    }
  }, [PATTERNS, generateRound]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 10) {
            stressLevel.value = withTiming(1 - next / 10, { duration: 500 });
            if (next <= 5) triggerShake();
          }
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 100 }), 5, true),
      withTiming(0, { duration: 50 })
    );
    Vibration.vibrate(100);
  };

  const handleSelect = (id: string) => {
    if (isFinished) return;

    if (id === targetPattern.id) {
      setScore(s => s + 1);
      SoundService.getInstance().playSound('success');
      generateRound();
    } else {
      setTimeLeft(t => Math.max(0, t - 3)); // Penalty
      SoundService.getInstance().playSound('error');
      triggerShake();
    }
  };

  const handleComplete = async () => {
    setIsActive(false);
    setIsFinished(true);
    SoundService.getInstance().playSound('level_up');

    const user = useAuthStore.getState().user;
    if (user?.id) {
      await ProgressService.completeMission(user.id, cityId);
    }

    markComplete(missionId, parseInt(questionIndex));

    setTimeout(() => {
      const queue = getQueue(missionId);
      
      if (queue.length > 0) {
        navigateToNext({ missionId, cityId });
      } else {
        navigateToNext({ missionId, cityId, isMissionComplete: true });
      }
    }, 2000);
  };

  if (loadingQuestions) {
    return (
      <FullScreenLoader 
        message="Chargement du défi..." 
        error={errorQuestions} 
        onRetry={() => { refreshQuestions(); }} 
      />
    );
  }

  if (runtimeError || !qData || !targetPattern) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary, marginTop: 24, textAlign: 'center' }}>
          Oups ! Une erreur est survenue
        </Text>
        <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
          Nous ne pouvons pas charger ce défi pour le moment.
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 32, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 }}
          onPress={() => skipQuestion({ missionId, cityId })}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Passer au défi suivant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, containerStyle, { paddingTop: insets.top }]}>
      <ChallengeHeader 
        cityId={cityId} 
        timerDuration={30} 
        onSkip={() => skipQuestion({ missionId, cityId })}
        onPrevious={goBack}
        onRestart={() => restartMission({ missionId, cityId, firstQuestionType: questions[0].question_type })}
      />
      <View style={styles.header}>
        <ChallengeProgressBar progress={timeLeft / 30} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreLabel, { color: colors.onSurface }]}>SCORE</Text>
          <Text style={[styles.scoreValue, { color: colors.onSurface }]}>{score}</Text>
        </View>

        <Animated.Text style={[styles.timer, timerStyle]}>
          {timeLeft}s
        </Animated.Text>

        <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: targetPattern.color }]}>
          <Text style={[styles.targetLabel, { color: colors.onSurface }]}>TROUVEZ CELUI-CI :</Text>
          <MaterialIcons name={targetPattern.icon as any} size={80} color={targetPattern.color} />
        </View>

        <View style={styles.grid}>
          {grid.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.gridItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSelect(p.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons name={p.icon as any} size={40} color={p.color} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 10, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { generateRound(); SoundService.getInstance().playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/pedago' as any, params: { cityId, fromChallenge: 'true' } })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="info-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.skipIconBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => skipQuestion({ missionId, cityId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="fast-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {isFinished && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <Text style={styles.finishTitle}>TEMPS ÉCOULÉ !</Text>
          <Text style={styles.finishScore}>Félicitations ! Score : {score}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  timer: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 40,
  },
  targetCard: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  gridItem: {
    width: (width - 80) / 2,
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  finishTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  finishScore: {
    color: '#D4AF37',
    fontSize: 20,
    fontWeight: '700',
  },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  sideActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipIconBtn: {
    paddingHorizontal: 24,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
