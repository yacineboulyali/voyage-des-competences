import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
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

export default function V1ScenarioCascadeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, goToIntro, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const { missionId, questionIndex = '0', cityId: cityParam } = useLocalSearchParams();
  const cityId = cityParam as string;

  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId as string);
  
  const questions = dbQuestions || [];

  const currentIdx = parseInt(questionIndex as string) || 0;
  const qData = questions[currentIdx];

  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const steps = qData?.options?.steps || [];
  const hasSteps = steps.length > 0;
  
  const currentStep = hasSteps ? steps[currentStepIdx] : null;
  const currentQuestion = currentStep ? (currentStep.question_fr || currentStep.question) : qData?.question_fr;
  const currentOptions = currentStep ? (currentStep.responses || currentStep.options || []) : (Array.isArray(qData?.options) ? qData.options : []);

  const handleValidation = () => {
    if (!qData || !selectedId) return;
    
    const isLastStep = !hasSteps || currentStepIdx === steps.length - 1;
    
    // For single-step or last-step, validate against qData.correct_answer
    // For intermediate steps, we might just progress or check step-specific correctness if available
    const correct = String(selectedId) === String(qData.correct_answer);

    if (isLastStep) {
      setIsCorrect(correct);
      setShowFeedback(true);
      playSound(correct ? 'correct' : 'wrong');

      if (correct && currentIdx + 1 === questions.length) {
        setShowConfetti(true);
        awardBadge('diplomate_du_voyage');
      }

      // Record the result
      const { recordResult } = useMissionStore.getState();
      recordResult(missionId as string, currentIdx, correct);

      markComplete(missionId as string, currentIdx);

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
          setCurrentStepIdx(0);
        } else {
          setIsCorrect(null);
        }
      }, 2000);
    } else {
      // Progress to next step
      setCurrentStepIdx(prev => prev + 1);
      setSelectedId(null);
      playSound('click');
    }
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ChallengeHeader 
        cityId={cityId} 
        onClose={() => goToIntro(cityId)}
      />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {!!qData.presentation_fr && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.presentationCard}>
            <MaterialIcons name="person" size={18} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={[styles.presentationText, { color: colors.onSurface }]}>{qData.presentation_fr}</Text>
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Text style={[styles.instruction, { color: colors.onSurface }]}>
            SCÉNARIO EN CASCADE {hasSteps ? `(${currentStepIdx + 1}/${steps.length})` : ''}
          </Text>
          <View style={styles.scenarioCard}>
            <View style={styles.scenarioHeader}>
              <MaterialIcons name="assignment" size={22} color={colors.primary} />
              <Text style={styles.scenarioLabel}>SITUATION</Text>
            </View>
            <Text style={[styles.scenarioText, { color: colors.onSurface }]}>{currentQuestion}</Text>
            {currentStepIdx === 0 && !!qData.question_ar && <Text style={styles.scenarioTextAr}>{qData.question_ar}</Text>}
          </View>
        </Animated.View>

        <View style={styles.optionsList}>
          {currentOptions.map((option: any, index: number) => {
            const optKey = option.value ?? option.id ?? String(index);
            const optLabel = option.label ?? option.label_fr ?? option.text_fr ?? option.text ?? option.texte ?? '';
            const isSelected = selectedId === optKey;
            
            const isLastStep = !hasSteps || currentStepIdx === steps.length - 1;
            const isCorrectOpt = isLastStep && String(optKey) === String(qData.correct_answer);

            return (
              <Animated.View key={optKey} entering={FadeInRight.delay(400 + index * 100)}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.05)' },
                    isCorrect !== null && isCorrectOpt && { borderColor: '#4CAF50', borderLeftWidth: 8 },
                    isCorrect === false && isSelected && !isCorrectOpt && { borderColor: '#ff5252' },
                  ]}
                  onPress={() => { setSelectedId(optKey); playSound('click'); }}
                  disabled={isCorrect !== null}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, { color: colors.onSurface }]}>{optLabel}</Text>
                  </View>
                  {isSelected && <MaterialIcons name="lens" size={16} color={colors.primary} />}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 10, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedId(null); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/pedago' as any, params: { cityId, fromChallenge: 'true' } })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="info-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.skipIconBtn, { borderColor: colors.primary + '40' }]} 
            onPress={() => skipQuestion({ missionId: missionId as string, cityId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="fast-forward" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }, (!selectedId || isCorrect !== null) && { opacity: 0.5 }]}
            onPress={handleValidation}
            disabled={!selectedId || isCorrect !== null}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="done-all" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback isVisible={showFeedback} isCorrect={isCorrect ?? false} />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
      <MissionSplash 
        isVisible={showSplash} 
        title={qData?.title_fr || "Scénario Immersif"} 
        subtitle="Prenez la meilleure décision"
        onFinish={() => setShowSplash(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 40 },
  presentationCard: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#cca72f' },
  presentationText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  header: { marginBottom: 24 },
  instruction: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center', opacity: 0.6 },
  scenarioCard: { padding: 22, backgroundColor: '#fff', borderRadius: 22, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, borderLeftWidth: 6, borderLeftColor: '#cca72f' },
  scenarioHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  scenarioLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, opacity: 0.6 },
  scenarioText: { fontSize: 17, fontWeight: '700', lineHeight: 25 },
  scenarioTextAr: { fontSize: 16, textAlign: 'right', marginTop: 12, color: colors.onSurface, fontWeight: '700' },
  optionsList: { gap: 12 },
  optionItem: { padding: 18, borderRadius: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  optionTextAr: { fontSize: 14, marginTop: 2, opacity: 0.8, textAlign: 'right' },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sideActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  primaryActionBtn: {
    paddingHorizontal: 28,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  skipIconBtn: {
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
