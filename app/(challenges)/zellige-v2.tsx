import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import ChallengeTimer from '../../components/ChallengeTimer';
import { SoundService } from '../../services/sounds';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { useMissionStore } from '../../stores/missionStore';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { useQuestions } from '../../hooks/useQuestions';
import { MissionSplash } from '../../components/MissionSplash';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { FullScreenLoader } from '../../components/FullScreenLoader';

const { width } = Dimensions.get('window');

export default function ZelligeV2Screen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, goToIntro, restartMission } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const missionId = params.missionId as string;
  const cityId = params.cityId as string;
  const questionIndex = (Array.isArray(params.questionIndex) ? params.questionIndex[0] : params.questionIndex) || '0';

  const { questions: dbQuestions, loading: loadingQuestions, error: errorQuestions, refresh: refreshQuestions } = useQuestions(missionId);
  const questions = Array.isArray(dbQuestions) ? dbQuestions : [];
  
  const currentIdx = parseInt(questionIndex as string) || 0;
  const qData = questions[currentIdx];

  const [selected, setSelected] = useState<number | null>(null);

  React.useEffect(() => {
    if (questions.length > 0 && missionId) {
      initQueue(missionId, questions);
    }
  }, [questions, missionId, initQueue]);

  const PATTERNS = Array.isArray(qData?.options) ? qData.options : [];

  const handleFinish = () => {
    SoundService.getInstance().playSound('success');
    
    markComplete(missionId, parseInt(questionIndex as string));
    
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
  };

  const handleSelectPattern = (id: number) => {
    setSelected(id);
    SoundService.getInstance().playSound('click');
    SoundService.getInstance().triggerHaptic('light');
  };

  if (loadingQuestions) {
    return (
      <FullScreenLoader 
        message="Chargement..." 
        error={errorQuestions} 
        onRetry={() => { refreshQuestions(); }} 
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ChallengeHeader 
        cityId={cityId} 
        onClose={() => goToIntro(cityId)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Text style={styles.title}>Atelier Zellige</Text>
          <Text style={styles.subtitle}>Choisissez le prochain motif à restaurer</Text>
        </Animated.View>

        <View style={styles.zelligeGrid}>
          {PATTERNS.map((pattern: any, idx: number) => (
            <Animated.View key={pattern.id} entering={ZoomIn.delay(400 + idx * 100)} style={styles.patternWrapper}>
              <TouchableOpacity
                style={[
                  styles.patternCard,
                  selected === pattern.id && { borderColor: pattern.color, backgroundColor: `${pattern.color}15` }
                ]}
                onPress={() => setSelected(pattern.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={[styles.patternIcon, { backgroundColor: pattern.color }]}>
                  <MaterialIcons name="auto-fix-high" size={24} color="#fff" />
                </View>
                <Text style={styles.patternName}>Motif #{pattern.id}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeIn.delay(1000)} style={styles.illustrationBox}>
          <View style={[styles.placeholderArt, selected !== null && { backgroundColor: PATTERNS.find((p: any) => p.id === selected)?.color + '20' }]}>
            <MaterialIcons 
              name={selected !== null ? "stars" : "grid-on"} 
              size={80} 
              color={selected !== null ? PATTERNS.find((p: any) => p.id === selected)?.color : "rgba(45, 107, 90, 0.1)"} 
            />
            <Text style={[styles.artText, selected !== null && { color: PATTERNS.find((p: any) => p.id === selected)?.color }]}>
              {selected !== null ? `Motif ${selected} appliqué` : "Aperçu de la restauration"}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 10 }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={'#2D6B5A'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelected(null); SoundService.getInstance().playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={'#2D6B5A'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/pedago' as any, params: { cityId, fromChallenge: 'true' } })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="info-outline" size={24} color={'#2D6B5A'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.skipIconBtn, { borderColor: '#2D6B5A' + '40' }]} 
            onPress={() => skipQuestion({ missionId, cityId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="fast-forward" size={24} color={'#2D6B5A'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#2D6B5A' }, !selected && { opacity: 0.5 }]}
            onPress={handleFinish}
            disabled={!selected}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="done-all" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <MissionSplash 
        isVisible={currentIdx === 0 && !selected}
        title="Art du Zellige"
        subtitle="Restaurez les motifs traditionnels"
        onFinish={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Zellige Clair V2 background
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.onSurface,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: 8,
  },
  zelligeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  patternWrapper: {
    width: (width - 64) / 2,
  },
  patternCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  patternIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  patternName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },
  illustrationBox: {
    marginTop: 40,
    width: '100%',
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(45, 107, 90, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderArt: {
    alignItems: 'center',
    gap: 12,
  },
  artText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(45, 107, 90, 0.3)',
  },
  footer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
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
    flex: 1.5,
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
    flex: 1,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
