import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

export default function V1RankingScreen() {
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

  const [data, setData] = useState<any[]>([]);
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

  useEffect(() => {
    if (qData) {
      const shuffled = [...(qData.options || [])].sort(() => Math.random() - 0.5);
      setData(shuffled);
    }
  }, [qData]);

  const handleValidation = () => {
    if (!qData) return;
    let correctOrder = '';
    
    if (qData.correct_answer && typeof qData.correct_answer === 'string' && qData.correct_answer.includes(',')) {
      // Use the comma-separated sequence from DB
      correctOrder = qData.correct_answer.trim();
    } else {
      // Fallback: Correct order is by increasing value ("1", "2", "3"...)
      correctOrder = [...(qData.options || [])]
        .sort((a: any, b: any) => Number(a.value || 0) - Number(b.value || 0))
        .map((o: any) => o.value ?? o.id)
        .join(',');
    }

    const currentOrder = data.map((o: any) => o.value ?? o.id).join(',');
    const correct = currentOrder.replace(/\s/g, '') === correctOrder.replace(/\s/g, '');

    setIsCorrect(correct);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('maitre_de_l_ordre');
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
        setIsCorrect(null);
      } else {
        setIsCorrect(null);
      }
    }, 2500);
  };

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<any>) => {
    const itemLabel = item.label ?? item.label_fr ?? item.text_fr ?? item.text ?? item.texte ?? '';
    return (
      <ScaleDecorator>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={drag}
          disabled={isActive || isCorrect !== null}
          style={[
            styles.rowItem,
            { backgroundColor: isActive ? colors.surface : colors.surface, borderColor: isActive ? colors.primary : colors.border },
            isCorrect !== null && { opacity: 0.8 }
          ]}
        >
          <MaterialIcons name="drag-handle" size={24} color={colors.onSurfaceVariant} style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemText, { color: colors.onSurface }]}>{itemLabel}</Text>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [colors, isCorrect]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ChallengeHeader 
          cityId={cityId} 
          onClose={() => goToIntro(cityId)}
        />
        <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

        <DraggableFlatList
          data={data}
          onDragBegin={() => playSound('click')}
          onDragEnd={({ data }) => { setData(data); playSound('click'); }}
          keyExtractor={(item) => String(item.value ?? item.id ?? Math.random())}
          renderItem={renderItem}
          containerStyle={styles.listContainer}
          ListHeaderComponent={
            <View style={styles.header}>
              {!!qData.presentation_fr && (
                <Animated.View entering={FadeInDown.delay(100)} style={styles.presentationCard}>
                  <Text style={[styles.presentationText, { color: colors.onSurface }]}>{qData.presentation_fr}</Text>
                </Animated.View>
              )}
              <Animated.View entering={FadeInDown.delay(200)} style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.instruction, { color: colors.onSurface }]}>CLASSEMENT / ORDRE</Text>
                <Text style={[styles.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
                {!!qData.question_ar && <Text style={[styles.arabicHeader, { color: colors.onSurface }]}>{qData.question_ar}</Text>}
              </Animated.View>
            </View>
          }
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.surface }]}>
          <View style={styles.footerRow}>
            <View style={styles.sideActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => { const shuffled = [...(qData.options || [])].sort(() => Math.random() - 0.5); setData(shuffled); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }, isCorrect !== null && { opacity: 0.5 }]}
              onPress={handleValidation}
              disabled={isCorrect !== null}
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
          title={qData?.title_fr || "Défi d'ordre"} 
          subtitle="Classez les éléments dans le bon ordre"
          onFinish={() => setShowSplash(false)} 
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 10 },
  presentationCard: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#cca72f' },
  presentationText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  instruction: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8, opacity: 0.6 },
  questionText: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  arabicHeader: { fontSize: 17, textAlign: 'center', marginTop: 6, color: colors.onSurface, fontWeight: '700' },
  listContainer: { flex: 1, paddingHorizontal: 24 },
  rowItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, borderWidth: 2, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  itemText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  itemTextAr: { fontSize: 14, marginTop: 2, opacity: 0.7 },
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
  },
  validateText: { color: '#fff', fontWeight: '900' },
});
