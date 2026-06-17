import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { useBadges } from '../../hooks/useBadges';
import { useChallenges } from '../../hooks/useChallenges';
import { useMissions } from '../../hooks/useMissions';
import { useQuestions } from '../../hooks/useQuestions';
import { useTheme } from '../../hooks/useTheme';
import { playSound } from '../../utils/SoundManager';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { useMissionStore } from '../../stores/missionStore';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { MissionSplash } from '../../components/MissionSplash';
import { FullScreenLoader } from '../../components/FullScreenLoader';

const { width } = Dimensions.get('window');

export default function V1TrueFalseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, s } = useTheme();
  const dynamics = getStyles(colors, s);
  const { navigateToNext, skipQuestion, goBack, goToIntro, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const { missionId, questionIndex = '0', cityId: cityParam } = useLocalSearchParams();
  const cityId = cityParam as string;

  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId as string);
  
  const questions = dbQuestions || [];

  const currentIdx = parseInt(questionIndex as string) || 0;
  const qData = questions[currentIdx];

  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(currentIdx === 0);
  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();

  useEffect(() => {
    if (questions.length > 0 && missionId) {
      initQueue(missionId as string, questions);
    }
  }, [questions, missionId]);

  const handleValidation = () => {
    if (!qData || !selected) return;
    const correct = String(selected).toLowerCase() === String(qData.correct_answer || '').toLowerCase();
    setIsCorrect(correct);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    // Milestones badges
    const halfWay = Math.floor(questions.length / 2);
    if (correct && currentIdx + 1 === halfWay) {
      awardBadge('detective_vrai_faux'); // Halfway reward
    }

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('as_de_la_verite'); // Mission full complete reward id
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
        setSelected(null);
        setIsCorrect(null);
      } else {
        setIsCorrect(null);
      }
    }, 3000);
  };

  if (loadingMissions || loadingQuestions) {
    return (
      <FullScreenLoader 
        message="Chargement de la mission..." 
        error={errorMissions || errorQuestions} 
        onRetry={() => { refreshMissions(); refreshQuestions(); }} 
      />
    );
  }
  if (!qData) return null;

  return (
    <View style={[dynamics.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ChallengeHeader 
        cityId={cityId} 
        onClose={() => goToIntro(cityId)}
      />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={dynamics.scroll}>
        {!!qData.presentation_fr && (
          <Animated.View entering={FadeInDown.delay(100)} style={dynamics.presentationCard}>
            <MaterialIcons name="person" size={s(18)} color={colors.primary} style={{ marginBottom: s(6) }} />
            <Text style={[dynamics.presentationText, { color: colors.onSurface }]}>{qData.presentation_fr}</Text>
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.delay(200)} style={dynamics.header}>
          <Text style={[dynamics.instruction, { color: colors.onSurface }]}>VRAI OU FAUX</Text>
          <Text style={[dynamics.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
          {!!qData.question_ar && <Text style={[dynamics.arabicHeader, { color: colors.onSurface }]}>{qData.question_ar}</Text>}
        </Animated.View>

        <View style={dynamics.optionsWrapper}>
          <TouchableOpacity
            style={[
              dynamics.choiceBtn,
              selected === 'vrai' && { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
              isCorrect !== null && 'vrai' === qData.correct_answer.toLowerCase() && { borderColor: '#4CAF50', borderWidth: 3 }
            ]}
            onPress={() => { setSelected('vrai'); playSound('click'); }}
            disabled={isCorrect !== null}
          >
            <View style={[dynamics.iconCircle, { backgroundColor: '#4CAF50' }]}>
              <MaterialIcons name="check" size={s(32)} color="#fff" />
            </View>
            <Text style={dynamics.choiceText}>VRAI</Text>
            <Text style={dynamics.choiceTextAr}>صحيح</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              dynamics.choiceBtn,
              selected === 'faux' && { backgroundColor: '#FFEBEE', borderColor: '#EF5350' },
              isCorrect !== null && 'faux' === qData.correct_answer.toLowerCase() && { borderColor: '#4CAF50', borderWidth: 3 }
            ]}
            onPress={() => { setSelected('faux'); playSound('click'); }}
            disabled={isCorrect !== null}
          >
            <View style={[dynamics.iconCircle, { backgroundColor: '#EF5350' }]}>
              <MaterialIcons name="close" size={s(32)} color="#fff" />
            </View>
            <Text style={dynamics.choiceText}>FAUX</Text>
            <Text style={dynamics.choiceTextAr}>خطأ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[dynamics.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.surface }]}>
        <View style={dynamics.footerRow}>
          <View style={dynamics.sideActions}>
            <TouchableOpacity style={dynamics.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={dynamics.iconBtn} onPress={() => { setSelected(null); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={dynamics.iconBtn} onPress={() => router.push({ pathname: '/pedago' as any, params: { cityId, fromChallenge: 'true' } })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="info-outline" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[dynamics.skipIconBtn, { borderColor: colors.primary + '40' }]} 
            onPress={() => skipQuestion({ missionId: missionId as string, cityId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="fast-forward" size={s(24)} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamics.primaryActionBtn, { backgroundColor: colors.primary }, (selected === null || isCorrect !== null) && { opacity: 0.5 }]}
            onPress={handleValidation}
            disabled={selected === null || isCorrect !== null}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="done-all" size={s(28)} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={isCorrect ?? false} 
        message={isCorrect ? qData.feedback_positive_fr || undefined : qData.feedback_negative_fr || undefined}
        onClose={() => setShowFeedback(false)}
      />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
      <MissionSplash 
        isVisible={showSplash} 
        title={qData?.title_fr || "Vrai ou Faux"} 
        subtitle="Démantelez le vrai du faux"
        onFinish={() => setShowSplash(false)} 
      />
    </View>
  );
}

const getStyles = (colors: any, s: (v: number) => number) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: s(24), paddingBottom: s(40) },
  presentationCard: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: s(16), padding: s(16), marginBottom: s(20), borderLeftWidth: 4, borderLeftColor: '#cca72f' },
  presentationText: { fontSize: s(14), lineHeight: s(20), fontStyle: 'italic' },
  header: { marginBottom: s(36), alignItems: 'center' },
  instruction: { fontSize: s(11), fontWeight: '900', letterSpacing: 2, marginBottom: s(14), opacity: 0.6 },
  questionText: { fontSize: s(22), fontWeight: '800', textAlign: 'center', lineHeight: s(30) },
  arabicHeader: { fontSize: s(20), textAlign: 'center', marginTop: s(12), color: colors.onSurface, fontWeight: '700' },
  optionsWrapper: { flexDirection: 'row', gap: s(20), justifyContent: 'center' },
  choiceBtn: { flex: 1, height: s(180), borderRadius: s(24), borderWidth: 2, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'rgba(0,0,0,0.01)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  iconCircle: { width: s(64), height: s(64), borderRadius: s(32), alignItems: 'center', justifyContent: 'center', marginBottom: s(12) },
  choiceText: { fontSize: s(18), fontWeight: '900', letterSpacing: 1 },
  choiceTextAr: { fontSize: s(16), fontWeight: '700', marginTop: s(4), opacity: 0.6 },
  footer: { padding: s(24), borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerRow: { flexDirection: 'row', gap: s(10), alignItems: 'center' },
  sideActions: { flexDirection: 'row', gap: s(6) },
  iconBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtn: {
    paddingHorizontal: s(32),
    height: s(60),
    borderRadius: s(30),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  skipIconBtn: {
    paddingHorizontal: s(24),
    height: s(60),
    borderRadius: s(30),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
