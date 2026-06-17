import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { MissionSplash } from '../../components/MissionSplash';
import { FullScreenLoader } from '../../components/FullScreenLoader';
import { useBadges } from '../../hooks/useBadges';
import { useChallenges } from '../../hooks/useChallenges';
import { useMissions } from '../../hooks/useMissions';
import { useQuestions } from '../../hooks/useQuestions';
import { useTheme } from '../../hooks/useTheme';
import { playSound } from '../../utils/SoundManager';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { useMissionStore } from '../../stores/missionStore';

const { width } = Dimensions.get('window');

export default function ShortAnswerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { navigateToNext, skipQuestion, goBack, goToIntro, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const { missionId, questionIndex = '0', cityId: cityParam } = useLocalSearchParams();
  const cityId = cityParam as string;

  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId as string);
  
  const questions = dbQuestions || [];

  const currentIdx = parseInt(questionIndex as string) || 0;
  const qData = questions[currentIdx];

  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();
  const [answer, setAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(currentIdx === 0);

  // Animation values
  const inputShake = useSharedValue(0);

  useEffect(() => {
    if (questions.length > 0 && missionId) {
      initQueue(missionId as string, questions);
    }
  }, [questions, missionId]);

  const handleValidation = () => {
    if (!qData || !answer.trim()) return;
    
    const userVal = answer.toLowerCase().trim();
    let correct = false;

    // Check against main correct_answer
    if (qData.correct_answer && userVal === qData.correct_answer.toLowerCase().trim()) {
      correct = true;
    }

    // Check against options array if present (synonyms)
    if (!correct && Array.isArray(qData.options)) {
      correct = qData.options.some((opt: any) => {
        const val = typeof opt === 'string' ? opt : (opt.text_fr || opt.text || opt.value || '');
        return val.toLowerCase().trim() === userVal;
      });
    }

    setIsCorrect(correct);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    if (!correct) {
      inputShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('linguiste_en_herbe');
    }

    markComplete(missionId as string, currentIdx);
    
    // Record the result
    const { recordResult } = useMissionStore.getState();
    recordResult(missionId as string, currentIdx, correct);

    setTimeout(() => {
      setShowFeedback(false);
      if (correct) {
        navigateToNext({ 
          missionId: missionId as string, 
          cityId, 
          isMissionComplete: getQueue(missionId as string).length === 0 
        });
        setAnswer('');
        setIsCorrect(null);
      } else {
        setIsCorrect(null);
      }
    }, 2500);
  };

  const handleSkip = () => {
    skipQuestion({ missionId: missionId as string, cityId });
  };

  const handleCancel = () => {
    setAnswer('');
    playSound('click');
  };

  const rInputStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inputShake.value }],
    borderColor: isCorrect === true ? colors.primary : (isCorrect === false ? '#EF4444' : (answer.length > 0 ? colors.primary : colors.border))
  }));

  if (loadingMissions || loadingQuestions) {
    return (
      <FullScreenLoader 
        message="Chargement de la mission..." 
        error={errorMissions || errorQuestions} 
        onRetry={() => { refreshMissions(); refreshQuestions(); }} 
      />
    );
  }

  if (!qData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.primary }}>Défi non trouvé</Text>
        <TouchableOpacity onPress={handleSkip}><Text>Passer</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ChallengeHeader 
        cityId={cityId} 
        onClose={() => goToIntro(cityId)}
      />
      
      <ChallengeProgressBar
        progress={currentIdx / questions.length}
        label={`Question ${currentIdx + 1} / ${questions.length}`}
        color={colors.primary}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Text style={[styles.instruction, { color: colors.onSurface }]}>RÉPONSE COURTE</Text>
          <View style={styles.bilingualBox}>
            <Text style={[styles.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
            {!!qData.question_ar && <Text style={[styles.arabicText, { color: colors.onSurface }]}>{qData.question_ar}</Text>}
          </View>
        </Animated.View>

        <Animated.View style={[styles.inputContainer, rInputStyle]}>
          <TextInput
            style={[styles.input, { color: colors.onSurface }]}
            placeholder="Écrivez votre réponse ici..."
            placeholderTextColor={colors.onSurfaceVariant + '80'}
            value={answer}
            onChangeText={setAnswer}
            autoFocus
            autoCorrect={false}
          />
        </Animated.View>

        {!!qData.hint_fr && (
          <Animated.View entering={FadeInUp.delay(500)} style={styles.hintBox}>
            <MaterialIcons name="lightbulb-outline" size={20} color={colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.hintText, { color: colors.onSurface }]}>{qData.hint_fr}</Text>
              {!!qData.hint_ar && <Text style={[styles.hintTextAr, { color: colors.onSurface }]}>{qData.hint_ar}</Text>}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 10, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setAnswer(''); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/pedago' as any, params: { cityId, fromChallenge: 'true' } })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="info-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.skipIconBtn, { borderColor: colors.primary + '40' }]} 
            onPress={() => skipQuestion({ missionId: missionId as string, cityId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="fast-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }, (!answer.trim() || isCorrect !== null) && { opacity: 0.5 }]}
            onPress={handleValidation}
            disabled={!answer.trim() || isCorrect !== null}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="done-all" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback isVisible={showFeedback} isCorrect={isCorrect ?? false} />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
      <MissionSplash 
        isVisible={showSplash} 
        title={qData?.title_fr || "Défi d'écriture"} 
        subtitle="Rédigez votre réponse"
        onFinish={() => setShowSplash(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  instruction: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  bilingualBox: { width: '100%', alignItems: 'center' },
  questionText: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  arabicText: { fontSize: 20, textAlign: 'center', color: colors.onSurface, fontWeight: '700' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  input: { flex: 1, fontSize: 18, fontWeight: '600' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 24, padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  hintText: { fontSize: 14, fontWeight: '600' },
  hintTextAr: { fontSize: 14, marginTop: 4, textAlign: 'right' },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sideActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtn: {
    paddingHorizontal: 32,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
