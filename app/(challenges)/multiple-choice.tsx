import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import MissionTracker from '../../components/MissionTracker';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { MissionSplash } from '../../components/MissionSplash';
import { ChallengeIntroModal } from '../../components/ChallengeIntroModal';
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

export default function V1MultipleChoiceScreen() {
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

  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showIntro, setShowIntro] = useState(currentIdx === 0 && !!qData?.context_dialogue);
  const [showSplash, setShowSplash] = useState(currentIdx === 0 && !qData?.context_dialogue);

  useEffect(() => {
    if (questions.length > 0 && missionId) {
      initQueue(missionId as string, questions);
    }
  }, [questions, missionId]);

  const handleValidation = () => {
    if (!qData || !selectedId) return;
    const correct = String(selectedId) === String(qData.correct_answer);
    setIsCorrect(correct);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    // Milestones badges
    const halfWay = Math.floor(questions.length / 2);
    if (correct && currentIdx + 1 === halfWay) {
      awardBadge('explorateur_curieux'); // Award halfway badge
    }

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('maitre_du_savoir'); // Award completion badge (placeholder id)
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
        setSelectedId(null);
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

  const options = Array.isArray(qData.options) ? qData.options : [];

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
          <Text style={[dynamics.instruction, { color: colors.onSurface }]}>CHOIX MULTIPLE</Text>
          <Text style={[dynamics.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
          {!!qData.question_ar && <Text style={[dynamics.arabicHeader, { color: colors.onSurface }]}>{qData.question_ar}</Text>}
        </Animated.View>

        <View style={dynamics.optionsContainer}>
          {options.map((option: any, index: number) => {
            const optKey = option.value ?? option.id ?? String(index);
            const optLabel = option.label ?? option.label_fr ?? option.text_fr ?? option.text ?? option.texte ?? '';
            const isSelected = selectedId === optKey;
            const isCorrectOpt = optKey === qData.correct_answer;
            return (
              <Animated.View key={optKey} entering={FadeInUp.delay(400 + index * 100)}>
                <TouchableOpacity
                  style={[
                    dynamics.optionCard,
                    { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : 'transparent' },
                    isCorrect !== null && isCorrectOpt && { borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.08)' },
                    isCorrect === false && isSelected && !isCorrectOpt && { borderColor: '#ff5252', backgroundColor: 'rgba(255,82,82,0.08)' }
                  ]}
                  onPress={() => { setSelectedId(optKey); playSound('click'); }}
                  disabled={isCorrect !== null}
                  hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[dynamics.optionText, { color: colors.onSurface }]}>{optLabel}</Text>
                  </View>
                  <MaterialIcons 
                    name={isSelected ? "radio-button-checked" : "radio-button-unchecked"} 
                    size={s(24)} 
                    color={isSelected ? colors.primary : colors.border} 
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[dynamics.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.surface }]}>
        <View style={dynamics.footerRow}>
          <View style={dynamics.sideActions}>
            <TouchableOpacity style={dynamics.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={dynamics.iconBtn} onPress={() => { setSelectedId(null); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            style={[dynamics.primaryActionBtn, { backgroundColor: colors.primary }, (!selectedId || isCorrect !== null) && { opacity: 0.5 }]}
            onPress={handleValidation}
            disabled={!selectedId || isCorrect !== null}
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
        title={qData?.title_fr || "Défi d'observation"} 
        subtitle="Choisissez la bonne réponse"
        onFinish={() => setShowSplash(false)} 
      />
      <ChallengeIntroModal
        isVisible={showIntro}
        dialogue={qData?.context_dialogue}
        cityColor={colors.primary}
        onStart={() => setShowIntro(false)}
      />
    </View>
  );
}

const getStyles = (colors: any, s: (v: number) => number) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: s(24), paddingBottom: s(40) },
  presentationCard: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: s(16), padding: s(16), marginBottom: s(20), borderLeftWidth: 4, borderLeftColor: '#cca72f', alignItems: 'flex-start' },
  presentationText: { fontSize: s(14), lineHeight: s(20), fontStyle: 'italic' },
  header: { marginBottom: s(24), alignItems: 'center' },
  instruction: { fontSize: s(11), fontWeight: '900', letterSpacing: 2, marginBottom: s(10), opacity: 0.6 },
  questionText: { fontSize: s(20), fontWeight: '800', textAlign: 'center', lineHeight: s(28) },
  arabicHeader: { fontSize: s(18), textAlign: 'center', marginTop: s(8), color: colors.onSurface, fontWeight: '700' },
  optionsContainer: { gap: s(14) },
  optionCard: { padding: s(18), borderRadius: s(18), borderWidth: 2.5, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  optionText: { fontSize: s(15), fontWeight: '600', lineHeight: s(22), flex: 1 },
  optionTextAr: { fontSize: s(14), marginTop: s(4), opacity: 0.8 },
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
  },
  validateText: { color: '#fff', fontWeight: '900' },
});
