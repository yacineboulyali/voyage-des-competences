import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { ProgressService } from '../../services/progress';
import { SoundService } from '../../services/sounds';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { MissionSplash } from '../../components/MissionSplash';
import { useMissionStore } from '../../stores/missionStore';

import { useMissions } from '../../hooks/useMissions';
import { useQuestions } from '../../hooks/useQuestions';
import { FullScreenLoader } from '../../components/FullScreenLoader';

const { width } = Dimensions.get('window');

interface Member {
  id: string;
  name: string;
  role: string;
  specialty: string;
  color: string;
}

export default function TeamRolesScreen() {
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const params = useLocalSearchParams();
  const cityId = params.cityId as string;
  const missionId = params.missionId as string;
  const questionIndex = parseInt(params.questionIndex as string || '0');
  const insets = useSafeAreaInsets();

  const { questions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId);
  const { missions, loading: loadingMissions, error: errorMissions, refresh: refreshMissions } = useMissions(cityId);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [runtimeError, setRuntimeError] = useState<any>(null);

  useEffect(() => {
    try {
      if (questions && questions.length > 0 && missionId) {
        initQueue(missionId as string, questions);
      }
    } catch (err) {
      console.error("Queue initialization error:", err);
      setRuntimeError(err);
    }
  }, [questions, missionId, initQueue]);

  const qData = questions[questionIndex];
  const dynamicTasks = (qData?.options as any)?.tasks || [];
  const dynamicMembers = (qData?.options as any)?.members || [];

  if (loadingQuestions || loadingMissions) {
    return (
      <FullScreenLoader 
        message="Chargement de l'équipe..." 
        error={errorMissions || errorQuestions} 
        onRetry={() => { refreshMissions(); refreshQuestions(); }} 
      />
    );
  }

  if (runtimeError || !qData) {
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
          onPress={() => skipQuestion({ missionId, cityId })}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Passer au défi suivant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleMatch = (taskId: string, specialty: string) => {
    if (!selectedMember) return;

    if (selectedMember.specialty === specialty) {
      setMatches(prev => ({ ...prev, [taskId]: selectedMember.id }));
      SoundService.getInstance().playSound('success');
      setSelectedMember(null);
    } else {
      SoundService.getInstance().playSound('error');

      SoundService.getInstance().triggerHaptic('medium');
    }
  };

  const onConfirmResult = () => {
    if (Object.keys(matches).length < dynamicTasks.length) return;
    setShowFeedback(true);
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      setIsFinished(true);
      const user = useAuthStore.getState().user;
      if (user?.id) {
        await ProgressService.completeMission(user.id, cityId);
      }
      
      setShowConfetti(true);
      markComplete(missionId as string, questionIndex);

      setTimeout(() => {
        setShowFeedback(false);
        const queue = getQueue(missionId as string);

        if (queue.length > 0) {
          navigateToNext({
            missionId: params.missionId as string,
            cityId: params.cityId as string,
          });
        } else {
          const currentMissionIdx = missions.findIndex(m => m.id === missionId);
          const nextMission = missions[currentMissionIdx + 1];
          navigateToNext({
            missionId: params.missionId as string,
            cityId: params.cityId as string,
            isMissionComplete: true,
            nextMissionId: nextMission?.id
          });
        }
      }, 2500);
    } catch (err) {
      console.error("Completion logic error:", err);
      setRuntimeError(err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ChallengeHeader 
        cityId={params.cityId as string} 
        hasTimer={false} 
        onSkip={() => skipQuestion({ missionId: missionId as string, cityId })}
        onPrevious={goBack}
        onRestart={() => restartMission({ missionId: missionId as string, cityId, firstQuestionType: questions[0].question_type })}
      />
      <View style={{ height: 20 }} />
      <View style={styles.content}>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{qData?.question_fr || "TRAVAIL D'ÉQUIPE"}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.onSurface }]}>Assignez le bon expert à chaque tâche</Text>
        </View>

        <View style={styles.tasksContainer}>
          {dynamicTasks.map((task: any) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: matches[task.id] ? '#4CAF50' : colors.border,
                  borderStyle: matches[task.id] ? 'solid' : 'dashed'
                }
              ]}
              onPress={() => handleMatch(task.id, task.specialty)}
              disabled={!!matches[task.id]}
            >
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, { color: colors.onSurface }]}>{task.title}</Text>
                {matches[task.id] && (
                  <Animated.View entering={FadeIn} style={styles.assignedBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={[styles.assignedText, { color: '#4CAF50' }]}>Assigné</Text>
                  </Animated.View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.membersContainer}>
          {dynamicMembers.map((member: any) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedMember?.id === member.id ? member.color : 'transparent',
                  opacity: Object.values(matches).includes(member.id) ? 0.4 : 1
                }
              ]}
              onPress={() => setSelectedMember(member)}
              disabled={Object.values(matches).includes(member.id)}
            >
              <View style={[styles.memberIcon, { backgroundColor: member.color }]}>
                <MaterialIcons name="person" size={24} color="#fff" />
              </View>
              <Text style={[styles.memberName, { color: colors.onSurface }]}>{member.name}</Text>
              <Text style={[styles.memberRole, { color: colors.onSurface }]}>{member.role}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 120, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.skipBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => skipQuestion({ missionId: missionId as string, cityId })}
          >
            <Text style={[styles.skipBtnText, { color: colors.primary }]}>IGNORER</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.validateBtn, 
              { backgroundColor: colors.primary }, 
              Object.keys(matches).length < dynamicTasks.length && { backgroundColor: colors.locked, opacity: 0.6 }
            ]}
            onPress={onConfirmResult}
            disabled={Object.keys(matches).length < dynamicTasks.length || isFinished}
          >
            <Text style={styles.validateBtnText}>VALIDER</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={true} 
      />

      {showConfetti && <ConfettiEffect />}
      
      <MissionSplash
        isVisible={showSplash}
        title={missions.find(m => m.id === missionId)?.title_fr || "Esprit d'Équipe"}
        subtitle="Composez la meilleure équipe pour relever le défi."
        cityColor={colors.primary}
        onFinish={() => setShowSplash(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitleContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tasksContainer: {
    gap: 15,
    marginBottom: 40,
  },
  taskCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '800',
  },
  membersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  memberBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 3,
    elevation: 4,
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
  },
  memberRole: {
    fontSize: 11,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  finishTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 20,
    textAlign: 'center',
  },
  finishBonus: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  validateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipBtn: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  validateBtn: {
    flex: 2,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
