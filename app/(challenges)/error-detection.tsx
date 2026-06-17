/**
 * error-detection.tsx
 * Format données : options = [{id, error, correct: bool}]
 * presentation_fr = contexte (planning du Dr. Rachid)
 * question_fr = titre de la tâche
 * correct_answer = null (toutes celles avec correct:true sont bonnes)
 *
 * UX : cases à cocher pour sélectionner les erreurs, puis valider
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { MissionSplash } from '../../components/MissionSplash';
import { FullScreenLoader } from '../../components/FullScreenLoader';
import { useBadges } from '../../hooks/useBadges';
import { useMissions } from '../../hooks/useMissions';
import { useQuestions } from '../../hooks/useQuestions';
import { useTheme } from '../../hooks/useTheme';
import { playSound } from '../../utils/SoundManager';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { useMissionStore } from '../../stores/missionStore';

export default function ErrorDetectionScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, goToIntro } = useChallengeNavigation();
  const { initQueue, markComplete } = useMissionStore();
  const { missionId, questionIndex = '0', cityId: cityParam } = useLocalSearchParams();
  const cityId = cityParam as string;
  const currentIdx = parseInt(questionIndex as string) || 0;

  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId as string);
  const questions = dbQuestions || [];
  const qData = questions[currentIdx];

  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();

  // State: set of selected error IDs
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(currentIdx === 0);

  useEffect(() => {
    if (questions.length > 0 && missionId) initQueue(missionId as string, questions);
  }, [questions, missionId]);

  useEffect(() => {
    setSelected(new Set());
    setRevealed(false);
    setIsCorrect(null);
  }, [currentIdx]);

  // Parse options: [{id, error, correct}]
  const errorItems: { id: string; error: string; correct: boolean }[] = useMemo(() => {
    let base: any[] = [];
    if (Array.isArray(qData?.options)) {
      base = qData.options;
    } else if (qData?.options?.errors && Array.isArray(qData.options.errors)) {
      // If it's just an array of strings, convert to objects
      base = qData.options.errors.map((err: any, idx: number) => 
        typeof err === 'string' ? { id: `err-${idx}`, error: err, correct: true } : err
      );
    }

    return base.map((o: any, idx: number) => ({
      id: String(o.id ?? o.value ?? `item-${idx}`),
      error: o.error ?? o.label ?? o.text_fr ?? o.text ?? (typeof o === 'string' ? o : ''),
      correct: o.correct === true || o.correct === 'true' || (qData?.options?.errors !== undefined),
    }));
  }, [qData]);

  const correctIds = new Set(errorItems.filter(e => e.correct).map(e => e.id));
  const totalCorrect = correctIds.size;

  const toggleSelect = (id: string) => {
    if (revealed) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    playSound('click');
  };

  const handleValidate = () => {
    if (selected.size === 0 || revealed) return;
    // Correct if selected set equals exactly all correct IDs
    const correct =
      selected.size === correctIds.size &&
      [...selected].every(id => correctIds.has(id));

    setIsCorrect(correct);
    setRevealed(true);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('detective_culturel');
    }

    markComplete(missionId as string, currentIdx);

    setTimeout(() => {
      setShowFeedback(false);
      navigateToNext({
        missionId: missionId as string,
        cityId,
        isMissionComplete: currentIdx + 1 === questions.length,
      });
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ChallengeHeader cityId={cityId} onClose={() => goToIntro(cityId)} />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Context card */}
        {!!qData.presentation_fr && (
          <Animated.View entering={FadeInDown.delay(100)} style={[styles.contextCard, { borderLeftColor: colors.primary }]}>
            <Text style={[styles.contextLabel, { color: colors.onSurface }]}>📋 CONTEXTE</Text>
            <Text style={[styles.contextText, { color: colors.onSurface }]}>{qData.presentation_fr}</Text>
          </Animated.View>
        )}

        {/* Instruction */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.header}>
          <Text style={[styles.instruction, { color: colors.onSurface }]}>DÉTECTION D&apos;ERREURS</Text>
          <Text style={[styles.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
            <MaterialIcons name="search" size={14} color={colors.primary} />
            <Text style={[styles.countText, { color: colors.onSurface }]}>
              Trouvez les {totalCorrect} erreur{totalCorrect > 1 ? 's' : ''}
            </Text>
          </View>
        </Animated.View>

        {/* Error items as checkboxes */}
        <View style={styles.errorList}>
          {errorItems.map((item, idx) => {
            const isSelected = selected.has(item.id);
            const showCorrect = revealed && item.correct;
            const showWrong   = revealed && isSelected && !item.correct;

            let borderColor = isSelected ? colors.primary : 'rgba(0,0,0,0.08)';
            let bgColor = isSelected ? colors.primary + '10' : colors.surface;
            if (showCorrect) { borderColor = '#22c55e'; bgColor = 'rgba(34,197,94,0.10)'; }
            if (showWrong)   { borderColor = '#ef4444'; bgColor = 'rgba(239,68,68,0.08)'; }

            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(200 + idx * 70)}>
                <TouchableOpacity
                  style={[styles.errorCard, { backgroundColor: bgColor, borderColor }]}
                  onPress={() => toggleSelect(item.id)}
                  disabled={revealed}
                  activeOpacity={0.75}
                >
                  {/* Checkbox */}
                  <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.2)', backgroundColor: isSelected ? colors.primary : 'transparent' }
                  ]}>
                    {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                  </View>

                  <Text style={[styles.errorText, { color: colors.onSurface, flex: 1 }]}>{item.error}</Text>

                  {/* Post-reveal icon */}
                  {showCorrect && <MaterialIcons name="check-circle" size={22} color="#22c55e" />}
                  {showWrong   && <MaterialIcons name="cancel"       size={22} color="#ef4444" />}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Selection counter */}
        {selected.size > 0 && !revealed && (
          <Animated.View entering={FadeInUp} style={[styles.selectionCounter, { backgroundColor: colors.primary + '12' }]}>
            <MaterialIcons name="check-box" size={18} color={colors.primary} />
            <Text style={[styles.selectionText, { color: colors.primary }]}>
              {selected.size}/{totalCorrect} sélectionnée{selected.size > 1 ? 's' : ''}
            </Text>
          </Animated.View>
        )}

        {/* Result summary after reveal */}
        {revealed && (
          <Animated.View entering={FadeInUp.delay(200)} style={[styles.resultBox, { backgroundColor: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', borderColor: isCorrect ? '#22c55e' : '#ef4444' }]}>
            <MaterialIcons name={isCorrect ? 'emoji-events' : 'info'} size={24} color={isCorrect ? '#22c55e' : '#ef4444'} />
            <Text style={[styles.resultText, { color: isCorrect ? '#15803d' : '#991b1b' }]}>
              {isCorrect
                ? `Bravo ! Vous avez trouvé les ${totalCorrect} erreurs !`
                : `${[...selected].filter(id => correctIds.has(id)).length}/${totalCorrect} erreurs correctes. Continuez !`}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 16) + 8, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelected(new Set()); setRevealed(false); setIsCorrect(null); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => skipQuestion({ missionId: missionId as string, cityId })}
          >
            <MaterialIcons name="fast-forward" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.validateBtn, { backgroundColor: colors.primary }, (selected.size === 0 || revealed) && { opacity: 0.45 }]}
            onPress={handleValidate}
            disabled={selected.size === 0 || revealed}
          >
            <MaterialIcons name="done-all" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={isCorrect ?? false} 
        onClose={() => setShowFeedback(false)}
      />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
      <MissionSplash
        isVisible={showSplash}
        title="Détection d'Erreurs"
        subtitle="Repérez toutes les erreurs"
        onFinish={() => setShowSplash(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  contextCard: { borderRadius: 14, padding: 14, marginBottom: 18, backgroundColor: 'rgba(0,0,0,0.03)', borderLeftWidth: 4 },
  contextLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  contextText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  header: { marginBottom: 22, alignItems: 'center' },
  instruction: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8, opacity: 0.6 },
  questionText: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  countText: { fontSize: 13, fontWeight: '700' },
  errorList: { gap: 12 },
  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderRadius: 18, borderWidth: 2, gap: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  checkbox: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  errorText: { fontSize: 14, fontWeight: '600', lineHeight: 21 },
  selectionCounter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: 12 },
  selectionText: { fontSize: 14, fontWeight: '700' },
  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  resultText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sideActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  skipBtn: { paddingHorizontal: 22, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  validateBtn: { paddingHorizontal: 32, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
});
