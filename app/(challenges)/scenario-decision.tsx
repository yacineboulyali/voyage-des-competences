import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View , ActivityIndicator } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import ChallengeTimer from '../../components/ChallengeTimer';
import { THEME } from '../../constants/theme';
import { SoundService } from '../../services/sounds';
import { useTheme } from '../../hooks/useTheme';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuestions } from '../../hooks/useQuestions';
import { ChallengeIntroModal } from '../../components/ChallengeIntroModal';
import { FullScreenLoader } from '../../components/FullScreenLoader';

import { useAuthStore } from '../../stores/authStore';
import { ProgressService } from '../../services/progress';
import { useMissionStore } from '../../stores/missionStore';
import { MaterialIcons } from '@expo/vector-icons';


const SCENARIO = {
  context: "Un artisan vous explique que son secret se transmet de père en fils, mais il semble hésiter à vous laisser entrer dans son atelier.",
  choices: [
    { id: '1', text: "Lui offrir un thé et l'écouter parler de sa famille.", impact: "Confiance ++", color: '#4CAF50' },
    { id: '2', text: "Lui proposer de l'argent pour voir son travail.", impact: "Méfiance +", color: '#FF5252' },
    { id: '3', text: "Lui montrer vos propres dessins d'artisanat.", impact: "Respect +", color: '#2196F3' }
  ]
};

export default function ScenarioDecisionScreen() {
  const { colors, s } = useTheme();
  const dynamics = getStyles(colors, s);
  const { navigateToNext, skipQuestion, goBack, goToIntro, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(state => state.user);
  
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [runtimeError, setRuntimeError] = useState<any>(null);
  const [isFatimaPowerActive, setIsFatimaPowerActive] = useState(false); // Placeholder for power-up logic

  const { questions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(params.missionId as string);

  React.useEffect(() => {
    try {
      if (questions && questions.length > 0 && params.missionId) {
        initQueue(params.missionId as string, questions);
      }
    } catch (err) {
      console.error("Queue initialization error:", err);
      setRuntimeError(err);
    }
  }, [questions, params.missionId, initQueue]);

  if (loadingQuestions) {
    return (
      <FullScreenLoader 
        message="Chargement du scénario..." 
        error={errorQuestions} 
        onRetry={() => { refreshQuestions(); }} 
      />
    );
  }

  if (runtimeError || !questions.length) {
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
          onPress={() => skipQuestion({ missionId: params.missionId as string, cityId: params.cityId as string })}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Passer au défi suivant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cityId = params.cityId as string;
  const missionId = params.missionId as string;
  const currentMissionIdx = parseInt(params.questionIndex as string || '0');
  const currentQ = questions[currentMissionIdx]; 
  const rawOptions = Array.isArray(currentQ.options) ? currentQ.options as any[] : [];
  
  // Filter hidden options unless power is active
  const options = rawOptions.filter(o => !o.is_hidden || (o.id === 'E' && isFatimaPowerActive));

  const handleChoice = (id: string) => {
    setSelected(id);
    SoundService.getInstance().playSound('click');
    SoundService.getInstance().triggerHaptic('light');
  };

  const onConfirmResult = async () => {
    try {
      if (!selected) return;
      setShowFeedback(true);
      SoundService.getInstance().triggerHaptic('medium');

      if (user) {
        await ProgressService.completeMission(user.id, cityId);
      }

      markComplete(missionId, currentMissionIdx);

      setTimeout(() => {
        setShowFeedback(false);
        const queue = getQueue(missionId);

        if (queue.length > 0) {
          navigateToNext({
            missionId: missionId,
            cityId: cityId,
          });
        } else {
          navigateToNext({
            missionId: missionId,
            cityId: cityId,
            isMissionComplete: true
          });
        }
      }, 2000);
    } catch (err) {
      console.error("Confirmation error:", err);
      setRuntimeError(err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ChallengeHeader 
        cityId={cityId} 
        onClose={() => goToIntro(cityId)}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topSection}>
          <Animated.View entering={FadeIn} style={styles.characterBox}>
            <View style={[styles.avatarCircle, { borderColor: colors.primary }]}>
               <MaterialIcons name="account-circle" size={80} color={colors.primary} />
            </View>
            <View style={styles.bubble}>
              <Text style={[styles.bubbleText, { color: colors.onSurface }]}>{currentQ.question_fr}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={dynamics.choicesSection}>
          {options.map((choice, idx) => (
            <Animated.View key={choice.id} entering={SlideInRight.delay(400 + idx * 200)}>
              <TouchableOpacity
                style={[
                  dynamics.choiceCard,
                  selected === choice.id && { borderColor: choice.color || colors.primary, backgroundColor: `${choice.color || colors.primary}10` },
                  { backgroundColor: colors.surface }
                ]}
                onPress={() => handleChoice(choice.id)}
                disabled={!!selected}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[dynamics.choiceTitle, { color: colors.onSurface }]}>{choice.titre || choice.text_fr || choice.text || choice.texte}</Text>
                  <Text style={[dynamics.choiceDesc, { color: colors.onSurface }]}>{choice.description}</Text>
                </View>
                {selected === choice.id && (
                  <View style={[dynamics.impactBadge, { backgroundColor: choice.score > 70 ? '#4CAF50' : '#FF5252' }]}>
                    <Text style={dynamics.impactText}>{choice.score}/100</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[dynamics.footer, { paddingBottom: (insets.bottom || 24) + s(10), backgroundColor: colors.surface }]}>
        <View style={dynamics.footerRow}>
          <View style={dynamics.sideActions}>
            <TouchableOpacity style={dynamics.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={dynamics.iconBtn} onPress={() => { setSelected(null); SoundService.getInstance().playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={dynamics.iconBtn} onPress={() => router.push({ pathname: '/pedago' as any, params: { cityId, fromChallenge: 'true' } })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="info-outline" size={s(24)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[dynamics.skipIconBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => skipQuestion({ missionId, cityId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="fast-forward" size={s(24)} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              dynamics.primaryActionBtn, 
              { backgroundColor: colors.primary }, 
              !selected && { backgroundColor: '#ccc', opacity: 0.6 }
            ]}
            onPress={onConfirmResult}
            disabled={!selected || showFeedback}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="done-all" size={s(28)} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={true} 
      />
      <ChallengeIntroModal
        isVisible={showIntro && !!currentQ?.context_dialogue}
        dialogue={currentQ?.context_dialogue}
        cityColor={colors.primary}
        onStart={() => setShowIntro(false)}
      />
    </View>
  );
}

const getStyles = (colors: any, s: (v: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingBottom: s(40),
  },
  topSection: {
    padding: s(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterBox: {
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 24,
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    elevation: 4,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    lineHeight: 24,
    textAlign: 'center',
  },
  choicesSection: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  choiceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  choiceDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
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
