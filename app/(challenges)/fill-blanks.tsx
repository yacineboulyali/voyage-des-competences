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

export default function V1FillBlanksScreen() {
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

  const [selections, setSelections] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
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

  const correctAnswers = (qData?.correct_answer || '').split(/[|,]/).map((a: string) => a.trim());
  const options = Array.isArray(qData?.options) ? qData.options : [];

  const handleSelect = (text: string) => {
    if (selections.length >= correctAnswers.length) return;
    setSelections([...selections, text]);
    playSound('click');
  };

  const handleUndo = () => {
    setSelections(selections.slice(0, -1));
    playSound('click');
  };

  const handleValidation = () => {
    if (selections.length < correctAnswers.length) return;
    const correct = selections.every((s, i) => s.toLowerCase() === correctAnswers[i].toLowerCase());
    setIsCorrect(correct);
    setCompleted(correct);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('expert_des_mots');
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
        setSelections([]);
        setIsCorrect(null);
      } else {
        setIsCorrect(null);
      }
    }, 2500);
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

  const partsFr = qData.question_fr.split(/(________)/);
  const partsAr = qData.question_ar ? qData.question_ar.split(/(________)/) : [];

  const renderSentence = (parts: string[], isAr: boolean = false) => {
    let blankIdx = 0;
    return (
      <View style={[styles.sentenceWrapper, isAr && { flexDirection: 'row-reverse' }]}>
        {parts.map((p, i) => {
          if (p === '________') {
            const currentBlank = blankIdx++;
            const selection = selections[currentBlank];
            return (
              <View key={i} style={[styles.blank, { backgroundColor: selection ? colors.primary : colors.surface, borderColor: selection ? colors.primary : colors.border }]}>
                <Text style={[styles.blankText, { color: selection ? '#fff' : colors.onSurface }]}>{selection || ""}</Text>
              </View>
            );
          }
          return <Text key={i} style={[styles.staticText, isAr && styles.staticTextAr, { color: colors.onSurface }]}>{p}</Text>;
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ChallengeHeader 
        cityId={cityId} 
        onClose={() => goToIntro(cityId)}
      />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Text style={[styles.instruction, { color: colors.onSurface }]}>COMPLÉTER LES BLANCS</Text>
          <View style={styles.sentencesBox}>
            {renderSentence(partsFr)}
            {partsAr.length > 0 && <View style={{ height: 20 }} />}
            {partsAr.length > 0 && renderSentence(partsAr, true)}
          </View>
        </Animated.View>

        <View style={styles.optionsGrid}>
          {options.map((opt: any, idx: number) => {
            const isUsed = selections.includes(opt.text);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionBtn, isUsed && { opacity: 0.3 }]}
                onPress={() => handleSelect(opt.text)}
                disabled={isUsed || isCorrect !== null}
              >
                <Text style={styles.optionBtnText}>{opt.text}</Text>
                {!!opt.textAr && <Text style={styles.optionBtnTextAr}>{opt.textAr}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {selections.length > 0 && (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} disabled={isCorrect !== null}>
            <MaterialIcons name="undo" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>ANNULER LE DERNIER MOT</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelections([]); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }, (!selections.length || isCorrect !== null) && { opacity: 0.5 }]}
            onPress={handleValidation}
            disabled={!selections.length || isCorrect !== null}
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
        title={qData?.title_fr || "Texte à trous"} 
        subtitle="Remplissez les espaces vides"
        onFinish={() => setShowSplash(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24 },
  header: { marginBottom: 30, alignItems: 'center' },
  instruction: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  sentencesBox: { width: '100%', padding: 20, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  sentenceWrapper: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  staticText: { fontSize: 18, fontWeight: '600', lineHeight: 32 },
  staticTextAr: { fontSize: 20, fontWeight: '700' },
  blank: { minWidth: 80, height: 36, marginHorizontal: 6, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  blankText: { fontWeight: '800', fontSize: 14 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 20 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, alignItems: 'center' },
  optionBtnText: { fontWeight: '700', fontSize: 14 },
  optionBtnTextAr: { fontSize: 13, marginTop: 2, opacity: 0.7 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, opacity: 0.8 },
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
