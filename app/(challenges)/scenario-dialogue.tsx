/**
 * scenario-dialogue.tsx
 * Format données : options = [{label, score, value}]
 * correct_answer = value de la meilleure réponse (ex: "C")
 * presentation_fr = contexte de la situation (texte du mentor)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { playSound } from '../../utils/SoundManager';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { useMissionStore } from '../../stores/missionStore';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import { useQuestions } from '../../hooks/useQuestions';
import { useMissions } from '../../hooks/useMissions';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { useBadges } from '../../hooks/useBadges';
import { FullScreenLoader } from '../../components/FullScreenLoader';

const { width } = Dimensions.get('window');

// Score color
function scoreColor(score: number) {
  if (score >= 150) return '#22c55e';
  if (score >= 80)  return '#f59e0b';
  return '#ef4444';
}

export default function ScenarioDialogueScreen() {
  const { navigateToNext, skipQuestion, goBack, goToIntro } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const missionId   = params.missionId as string;
  const cityId      = params.cityId as string;
  const questionIndex = params.questionIndex || '0';
  const currentIdx  = parseInt(questionIndex as string) || 0;

  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId);
  const questions = dbQuestions || [];
  const qData = questions[currentIdx];

  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (questions.length > 0 && missionId) initQueue(missionId, questions);
  }, [questions, missionId]);

  // Reset on question change
  useEffect(() => {
    setSelectedValue(null);
    setRevealed(false);
  }, [currentIdx]);

  const options: any[] = Array.isArray(qData?.options) ? qData.options : [];
  const correctValue = qData?.correct_answer;
  const selectedOption = options.find(o => (o.value ?? o.id) === selectedValue);
  const isCorrect = selectedValue !== null && (selectedValue === correctValue || (selectedOption?.score ?? 0) >= 150);

  const handleSelect = (val: string) => {
    if (revealed) return;
    setSelectedValue(val);
    playSound('click');
  };

  const handleValidate = () => {
    if (!selectedValue || revealed) return;
    setRevealed(true);
    setShowFeedback(true);
    playSound(isCorrect ? 'correct' : 'wrong');

    if (isCorrect && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('diplomate_du_dialogue');
    }

    markComplete(missionId, currentIdx);

    // Record the result
    const { recordResult } = useMissionStore.getState();
    recordResult(missionId, currentIdx, isCorrect);

    setTimeout(() => {
      setShowFeedback(false);
      navigateToNext({
        missionId,
        cityId,
        isMissionComplete: getQueue(missionId).length === 0,
      });
    }, 3000);
  };

  if (loadingMissions || loadingQuestions) {
    return (
      <FullScreenLoader 
        message="Chargement..." 
        error={errorMissions || errorQuestions} 
        onRetry={() => { refreshMissions(); refreshQuestions(); }} 
      />
    );
  }

  if (!qData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: 20, textAlign: 'center' }}>
          Exercice introuvable
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}
          onPress={() => skipQuestion({ missionId, cityId })}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Passer au suivant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ChallengeHeader cityId={cityId} onClose={() => goToIntro(cityId)} />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

        {/* Mentor Context */}
        {!!qData.presentation_fr && (
          <Animated.View entering={FadeInDown.delay(100)} style={[styles.contextBubble, { backgroundColor: colors.surface, borderColor: colors.primary + '20' }]}>
            <View style={[styles.contextHeader, { backgroundColor: colors.primary + '15' }]}>
              <MaterialIcons name="movie" size={16} color={colors.primary} />
              <Text style={[styles.contextLabel, { color: colors.onSurface }]}>SITUATION</Text>
            </View>
            <Text style={[styles.contextText, { color: colors.onSurface }]}>{qData.presentation_fr}</Text>
          </Animated.View>
        )}

        {/* Dialogue History */}
        {qData?.options?.dialogue && Array.isArray(qData.options.dialogue) && (
          <View style={styles.dialogueContainer}>
            {qData.options.dialogue.map((d: any, idx: number) => (
              <Animated.View 
                key={idx} 
                entering={FadeInDown.delay(100 + idx * 50)}
                style={[
                  styles.dialogueBubble, 
                  d.character === 'Ishaq' ? styles.ishaqBubble : styles.otherBubble,
                  { backgroundColor: d.character === 'Ishaq' ? colors.primary + '15' : colors.surface }
                ]}
              >
                <Text style={[styles.characterName, { color: colors.onSurface }]}>{d.character}</Text>
                <Text style={[styles.dialogueText, { color: colors.onSurface }]}>{d.text || d.text_fr}</Text>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Question Bubble */}
        <Animated.View entering={FadeInDown.delay(200)} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: '#cca72f' + '40' }]}>
          <View style={styles.qIcon}>
            <MaterialIcons name="chat" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
          {!!qData.question_ar && <Text style={[styles.questionAr, { color: colors.onSurface }]}>{qData.question_ar}</Text>}
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsList}>
          {(Array.isArray(qData?.options) ? qData.options : (qData?.options?.responses || qData?.options?.options || [])).map((opt: any, idx: number) => {
            const val = opt.value ?? opt.id ?? String(idx);
            const label = opt.label ?? opt.label_fr ?? opt.text_fr ?? opt.text ?? opt.texte ?? '';
            const score = opt.score ?? 0;
            const isSelected = selectedValue === val;
            const isCorrectOpt = String(val) === String(correctValue);

            let cardBg = colors.surface;
            let cardBorder = 'rgba(0,0,0,0.07)';
            if (isSelected && !revealed) { cardBg = colors.primary + '10'; cardBorder = colors.primary; }
            if (revealed && isSelected && isCorrectOpt) { cardBg = 'rgba(34,197,94,0.10)'; cardBorder = '#22c55e'; }
            if (revealed && isSelected && !isCorrectOpt) { cardBg = 'rgba(239,68,68,0.08)'; cardBorder = '#ef4444'; }
            if (revealed && !isSelected && isCorrectOpt) { cardBg = 'rgba(34,197,94,0.06)'; cardBorder = '#22c55e'; }

            return (
              <Animated.View key={val} entering={SlideInRight.delay(300 + idx * 80)}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  onPress={() => handleSelect(val)}
                  disabled={revealed}
                  activeOpacity={0.75}
                >
                  {/* Letter badge */}
                  <View style={[styles.letterBadge, { backgroundColor: isSelected ? colors.primary : 'rgba(0,0,0,0.06)' }]}>
                    <Text style={[styles.letterText, { color: isSelected ? '#fff' : colors.onSurfaceVariant }]}>{val}</Text>
                  </View>

                  <Text style={[styles.optionLabel, { color: colors.onSurface, flex: 1 }]}>{label}</Text>

                  {/* Score pill (shown after reveal) */}
                  {revealed && (
                    <View style={[styles.scorePill, { backgroundColor: scoreColor(score) }]}>
                      <Text style={styles.scoreText}>{score > 0 ? `+${score}` : score}</Text>
                    </View>
                  )}

                  {/* Selection indicator */}
                  {!revealed && (
                    <MaterialIcons
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={isSelected ? colors.primary : colors.border}
                    />
                  )}

                  {/* Correct/wrong icon post-reveal */}
                  {revealed && isCorrectOpt && (
                    <MaterialIcons name="check-circle" size={22} color="#22c55e" />
                  )}
                  {revealed && isSelected && !isCorrectOpt && (
                    <MaterialIcons name="cancel" size={22} color="#ef4444" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Explanation post-reveal */}
        {revealed && !!qData.explanation_fr && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.explanationBox}>
            <MaterialIcons name="lightbulb" size={20} color="#f59e0b" />
            <Text style={styles.explanationText}>{qData.explanation_fr}</Text>
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
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedValue(null); setRevealed(false); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => skipQuestion({ missionId, cityId })}
          >
            <MaterialIcons name="fast-forward" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.validateBtn, { backgroundColor: colors.primary }, (!selectedValue || revealed) && { opacity: 0.45 }]}
            onPress={handleValidate}
            disabled={!selectedValue || revealed}
          >
            <MaterialIcons name="done-all" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={isCorrect} 
        onClose={() => setShowFeedback(false)}
      />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  // Context bubble
  contextBubble: { borderRadius: 18, borderWidth: 1, marginBottom: 18, overflow: 'hidden', elevation: 2 },
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  contextLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  contextText: { fontSize: 14, lineHeight: 21, padding: 16, paddingTop: 4, fontStyle: 'italic' },
  // Dialogue
  dialogueContainer: { marginBottom: 20, gap: 12 },
  dialogueBubble: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', maxWidth: '85%' },
  ishaqBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  characterName: { fontSize: 11, fontWeight: '900', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  dialogueText: { fontSize: 14, lineHeight: 20 },
  // Question card
  questionCard: { borderRadius: 20, borderWidth: 1.5, borderLeftWidth: 5, borderLeftColor: '#cca72f', padding: 20, marginBottom: 22, elevation: 2 },
  qIcon: { marginBottom: 10 },
  questionText: { fontSize: 17, fontWeight: '800', lineHeight: 25 },
  questionAr: { fontSize: 16, textAlign: 'right', marginTop: 10, color: colors.onSurface, fontWeight: '700' },
  // Options
  optionsList: { gap: 12 },
  optionCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderRadius: 18, borderWidth: 2, gap: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  letterBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  letterText: { fontSize: 14, fontWeight: '900' },
  optionLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  // Explanation
  explanationBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, backgroundColor: '#fffbeb', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#fde68a' },
  explanationText: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  // Footer
  footer: { padding: 18, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sideActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  skipBtn: { paddingHorizontal: 22, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  validateBtn: { paddingHorizontal: 32, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
});
