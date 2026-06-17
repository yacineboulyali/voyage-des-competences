import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { useBadges } from '../../hooks/useBadges';
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

export default function V1PuzzleRiddleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, goToIntro, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete } = useMissionStore();
  const { missionId, questionIndex = '0', cityId: cityParam } = useLocalSearchParams();
  const cityId = cityParam as string;

  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId as string);

  const questions = dbQuestions || [];
  const currentIdx = parseInt(questionIndex as string) || 0;
  const qData = questions[currentIdx];

  // Determine rendering mode
  // If options is an array with {label, value} items → QCM mode
  // Otherwise → text input mode
  const rawOptions = Array.isArray(qData?.options) ? qData.options : [];
  const isQCMMode = rawOptions.length > 0 && rawOptions[0]?.value !== undefined;

  const [answer, setAnswer] = useState('');         // text mode
  const [selectedId, setSelectedId] = useState<string | null>(null); // QCM mode
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(currentIdx === 0);
  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();

  const shake = useSharedValue(0);

  useEffect(() => {
    if (questions.length > 0 && missionId) {
      initQueue(missionId as string, questions);
    }
  }, [questions, missionId]);

  const handleValidation = () => {
    if (!qData) return;

    let correct = false;
    if (isQCMMode) {
      if (!selectedId) return;
      correct = String(selectedId) === String(qData.correct_answer);
    } else {
      if (!answer.trim()) return;
      correct = answer.toLowerCase().trim() === qData.correct_answer.toLowerCase().trim();
    }

    setIsCorrect(correct);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    if (!correct && !isQCMMode) {
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('detective_rabati');
    }

    markComplete(missionId as string, currentIdx);

    setTimeout(() => {
      setShowFeedback(false);
      if (correct) {
        navigateToNext({
          missionId: missionId as string,
          cityId,
          isMissionComplete: currentIdx + 1 === questions.length,
        });
        setAnswer('');
        setSelectedId(null);
        setIsCorrect(null);
      } else {
        setIsCorrect(null);
      }
    }, 2500);
  };

  const rInputStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
    borderColor:
      isCorrect === true
        ? '#4CAF50'
        : isCorrect === false
        ? '#EF4444'
        : colors.border,
  }));

  const hasAnswer = isQCMMode ? !!selectedId : !!answer.trim();

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
        onRestart={() =>
          restartMission({
            missionId: missionId as string,
            cityId,
            firstQuestionType: questions[0].question_type,
          })
        }
      />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Mentor context card */}
        {!!qData.presentation_fr && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.presentationCard}>
            <MaterialIcons name="person" size={18} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={[styles.presentationText, { color: colors.onSurface }]}>
              {qData.presentation_fr}
            </Text>
          </Animated.View>
        )}

        {/* Riddle card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Text style={[styles.instruction, { color: colors.onSurface }]}>ÉNIGME & MYSTÈRE</Text>
          <View style={styles.riddleBox}>
            <MaterialIcons name="help-outline" size={32} color={colors.gold ?? '#cca72f'} style={{ marginBottom: 16 }} />
            <Text style={[styles.riddleText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
            {!!qData.question_ar && <Text style={[styles.riddleTextAr, { color: colors.onSurface }]}>{qData.question_ar}</Text>}
          </View>
        </Animated.View>

        {/* QCM mode */}
        {isQCMMode ? (
          <View style={styles.optionsList}>
            {rawOptions.map((option: any, index: number) => {
              const optKey = option.value ?? option.id ?? String(index);
              const optLabel = option.label ?? option.label_fr ?? option.text_fr ?? option.text ?? option.texte ?? '';
              const isSelected = selectedId === optKey;
              const isCorrectOpt = String(optKey) === String(qData.correct_answer);
              return (
                <Animated.View key={optKey} entering={FadeInRight.delay(400 + index * 100)}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.06)' },
                      isCorrect !== null && isCorrectOpt && { borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.08)' },
                      isCorrect === false && isSelected && !isCorrectOpt && { borderColor: '#ff5252', backgroundColor: 'rgba(255,82,82,0.08)' },
                    ]}
                    onPress={() => { setSelectedId(optKey); playSound('click'); }}
                    disabled={isCorrect !== null}
                  >
                    <View style={[styles.optionBadge, { backgroundColor: isSelected ? colors.primary : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[styles.optionBadgeText, { color: isSelected ? '#fff' : colors.onSurfaceVariant }]}>
                        {optKey}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, { color: colors.onSurface, flex: 1 }]}>{optLabel}</Text>
                    {isSelected && <MaterialIcons name="check-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          /* Text input mode */
          <>
            <Animated.View style={[styles.inputBox, rInputStyle, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.input, { color: colors.onSurface }]}
                placeholder="Tapez le nom mystère..."
                placeholderTextColor={(colors.onSurfaceVariant ?? '#888') + '80'}
                value={answer}
                onChangeText={setAnswer}
                autoCorrect={false}
              />
            </Animated.View>
            {!!qData.hint_fr && (
              <View style={styles.hintContainer}>
                <Text style={[styles.hintLabel, { color: colors.gold ?? '#cca72f' }]}>INDICE</Text>
                <Text style={[styles.hintContent, { color: colors.onSurface }]}>{qData.hint_fr}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setAnswer(''); setSelectedId(null); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
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
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }, !hasAnswer && { opacity: 0.5 }]}
            onPress={handleValidation}
            disabled={!hasAnswer || isCorrect !== null}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="done-all" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={isCorrect ?? false} 
        message={isCorrect ? qData.feedback_positive_fr || undefined : qData.feedback_negative_fr || undefined}
      />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
      <MissionSplash
        isVisible={showSplash}
        title="Énigme Culturelle"
        subtitle="Déchiffre les mystères de la ville"
        onFinish={() => setShowSplash(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 40 },
  presentationCard: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#cca72f',
  },
  presentationText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  header: { marginBottom: 28, alignItems: 'center' },
  instruction: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 14, opacity: 0.6 },
  riddleBox: {
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    width: '100%',
  },
  riddleText: { fontSize: 19, fontWeight: '800', textAlign: 'center', lineHeight: 27 },
  riddleTextAr: { fontSize: 17, textAlign: 'center', marginTop: 12, color: colors.onSurface, fontWeight: '700' },
  // QCM
  optionsList: { gap: 12 },
  optionItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBadgeText: { fontSize: 14, fontWeight: '800' },
  optionText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  // Text input
  inputBox: {
    height: 64,
    borderWidth: 2,
    borderRadius: 20,
    marginTop: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  input: { fontSize: 18, fontWeight: '700' },
  hintContainer: { marginTop: 28, alignItems: 'center' },
  hintLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  hintContent: { fontSize: 14, textAlign: 'center', opacity: 0.7, paddingHorizontal: 20 },
  // Footer
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerRow: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  sideActions: { flexDirection: 'row', gap: 8 },
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
    height: 58,
    borderRadius: 29,
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
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
