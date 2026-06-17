import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useChallenges } from '../hooks/useChallenges';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { usePlayerCityProgress } from '../hooks/usePlayerCityProgress';
import Animated, {
  FadeInUp,
  FadeInDown,
  ZoomIn,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { ConfettiEffect } from '../components/ConfettiEffect';
import { SafeBlurView } from '../components/SafeBlurView';
import Svg, { Path, Circle } from 'react-native-svg';
import { BadgeRewardModal } from '../components/BadgeRewardModal';
import { BADGES } from '../constants/Badges';
import { useMissionStore } from '../stores/missionStore';
import { useQuestions } from '../hooks/useQuestions';
import { useChallengeNavigation } from '../hooks/useChallengeNavigation';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#2c4e3e',
  surface: '#fdf9f3',
  onSurface: '#1c1c18',
  onSurfaceVariant: '#404943',
  tertiary: '#735c00',
  tertiaryContainer: '#cca72f',
  secondaryContainer: '#ffab69',
  onPrimary: '#ffffff',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

const PARTICIPANTS = [
  { id: '1', name: 'Yassine', xp: 450, rank: 1, avatar: { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/avatar-map-user.jpg?v=1775991607434' } },
  { id: '2', name: 'Zineb', xp: 380, rank: 2, avatar: { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/avatar-1.jpg?v=1775991607434' } },
  { id: '3', name: 'Karim', xp: 290, rank: 3, avatar: { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/avatar-2.jpg?v=1775991607434' } },
];

const SKILLS = [
  { name: 'Négociation', val: 0.85, color: '#2c4e3e' },
  { name: 'Empathie', val: 0.70, color: '#cca72f' },
  { name: 'Analyse', val: 0.60, color: '#ffab69' },
];


export default function DefiResultatScreen() {
  const insets = useSafeAreaInsets();
  const { cityId, missionId, nextMissionId } = useLocalSearchParams();
  const { challenges } = useChallenges();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const { getResults, clearResults } = useMissionStore();
  const { questions: allQuestions } = useQuestions(missionId as string);
  const { retryIncorrectQuestions } = useChallengeNavigation();

  const results = getResults(missionId as string);
  const correctCount = results.filter(r => r.isCorrect).length;
  const incorrectCount = results.filter(r => !r.isCorrect).length;
  const totalQuestions = results.length;

  const AnimatedSkillBar = ({ skill, index }: { skill: any, index: number }) => {
    const widthVal = useSharedValue(0);

    React.useEffect(() => {
      widthVal.value = withDelay(1400 + index * 200, withTiming(skill.val * 100, {
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      width: `${widthVal.value}%`,
    }));

    return (
      <View style={styles.skillRow}>
        <View style={styles.skillInfo}>
          <Text style={styles.skillName}>{skill.name}</Text>
          <Text style={styles.skillPercent}>{Math.round(skill.val * 100)}%</Text>
        </View>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, animatedStyle, { backgroundColor: skill.color }]} />
        </View>
      </View>
    );
  };

  const { progress, incrementMissionProgress } = usePlayerCityProgress();

  const currentCity = cityId as string || 'rabat';
  const cityProg = progress[currentCity];
  const missionsCompleted = cityProg?.missions_completed ?? 0;
  const missionsTotal = cityProg?.missions_total ?? 5;
  const hasNextMission = (missionsCompleted + 1) < missionsTotal;

  const CITY_SEQUENCE = ['rabat', 'chefchaouen', 'fes', 'marrakech', 'laayoune', 'dakhla'];
  const nextCityIndex = CITY_SEQUENCE.indexOf(currentCity) + 1;
  const nextCityId = nextCityIndex < CITY_SEQUENCE.length ? CITY_SEQUENCE[nextCityIndex] : null;
  const nextCityName = nextCityId ? challenges[nextCityId]?.city_name_fr : null;

  const currentCityData = challenges[currentCity];
  const cityTitle = currentCityData?.city_name_fr?.toUpperCase() || currentCity.toUpperCase();
  const cityTitleAr = currentCityData?.city_name_ar;

  const [showBadge, setShowBadge] = React.useState(false);
  const earnedBadge = BADGES.find(b => b.id === 'explorateur_curieux') || BADGES[0];

  React.useEffect(() => {
    // Save progress as soon as the result is shown (victory)
    incrementMissionProgress(currentCity);

    // Show badge modal after victory animation
    const timer = setTimeout(() => {
      setShowBadge(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleNextAction = () => {
    if (hasNextMission) {
      // Go back to intro screen which will now show the NEW current mission
      router.replace({
        pathname: '/intro-defi',
        params: { city: currentCity }
      });
    } else {
      router.replace('/map');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fdf9f3', '#f2ece4']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Zellige Background Pattern Overlay */}
      <View style={styles.patternLayer}>
        <Svg width={width} height={height} opacity={0.03}>
          {Array.from({ length: 15 }).map((_, i) => (
            <Path
              key={i}
              d={`M${i % 2 === 0 ? 0 : 50} ${i * 100} L300 ${i * 150}`}
              stroke={COLORS.primary}
              strokeWidth="0.5"
            />
          ))}
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Text style={styles.title}>Victoire Collective !</Text>
          <Text style={styles.subtitle}>{cityTitleAr || 'النتيجة النهائية للتحدي'}</Text>
          <View style={styles.badgeLabel}>
            <MaterialIcons name="group" size={16} color={COLORS.onPrimary} />
            <Text style={styles.badgeLabelText}>DÉFI {cityTitle} : TERMINÉ</Text>
          </View>
        </Animated.View>

        {/* Podium Section */}
        <View style={styles.podiumContainer}>
          {/* Rang 2 */}
          <Animated.View entering={ZoomIn.delay(600)} style={[styles.podiumItem, styles.rank2]}>
            <View style={[styles.avatarRing, { borderColor: COLORS.silver }]}>
              <Image source={PARTICIPANTS[1].avatar} style={styles.avatar} />
              <View style={[styles.rankBadge, { backgroundColor: COLORS.silver }]}>
                <Text style={styles.rankText}>2</Text>
              </View>
            </View>
            <Text style={styles.participantName}>{PARTICIPANTS[1].name}</Text>
            <Text style={styles.participantXP}>{PARTICIPANTS[1].xp} XP</Text>
          </Animated.View>

          {/* Rang 1 */}
          <Animated.View entering={ZoomIn.delay(400)} style={[styles.podiumItem, styles.rank1]}>
            <MaterialIcons name="emoji-events" size={32} color={COLORS.gold} style={styles.crownIcon} />
            <View style={[styles.avatarRingMain, { borderColor: COLORS.gold }]}>
              <Image source={PARTICIPANTS[0].avatar} style={styles.avatarMain} />
              <View style={[styles.rankBadgeMain, { backgroundColor: COLORS.gold }]}>
                <Text style={styles.rankTextMain}>1</Text>
              </View>
            </View>
            <Text style={[styles.participantName, styles.nameMain]}>{PARTICIPANTS[0].name}</Text>
            <Text style={styles.participantXPMain}>{PARTICIPANTS[0].xp} XP</Text>
          </Animated.View>

          {/* Rang 3 */}
          <Animated.View entering={ZoomIn.delay(800)} style={[styles.podiumItem, styles.rank3]}>
            <View style={[styles.avatarRing, { borderColor: COLORS.bronze }]}>
              <Image source={PARTICIPANTS[2].avatar} style={styles.avatar} />
              <View style={[styles.rankBadge, { backgroundColor: COLORS.bronze }]}>
                <Text style={styles.rankText}>3</Text>
              </View>
            </View>
            <Text style={styles.participantName}>{PARTICIPANTS[2].name}</Text>
            <Text style={styles.participantXP}>{PARTICIPANTS[2].xp} XP</Text>
          </Animated.View>
        </View>

        {/* Rewards Section */}
        <Animated.View entering={FadeInUp.delay(1000)} style={styles.section}>
          <Text style={styles.sectionTitle}>Tes Récompenses <Text style={styles.sectionArabic}>جوائزك</Text></Text>
          <View style={styles.rewardsRow}>
            <SafeBlurView intensity={60} tint="light" style={styles.rewardCard}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.tertiaryContainer }]}>
                <MaterialIcons name="bolt" size={24} color="#fff" />
              </View>
              <Text style={styles.rewardVal}>+450 XP</Text>
              <Text style={styles.rewardLabel}>Progrès total</Text>
            </SafeBlurView>

            <SafeBlurView intensity={60} tint="light" style={styles.rewardCard}>
              <View style={[styles.iconBox, { backgroundColor: COLORS.secondaryContainer }]}>
                <MaterialIcons name="military-tech" size={24} color="#fff" />
              </View>
              <Text style={styles.rewardVal}>{earnedBadge.name}</Text>
              <Text style={styles.rewardLabel}>Nouveau Badge Débloqué</Text>
            </SafeBlurView>
          </View>
        </Animated.View>

        {/* Skill Analysis Section */}
        <Animated.View entering={FadeInUp.delay(1200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Analyse des compétences <Text style={styles.sectionArabic}>تحليل المهارات</Text></Text>
          <SafeBlurView intensity={80} tint="light" style={styles.skillsCard}>
            {SKILLS.map((skill, index) => (
              <AnimatedSkillBar key={index} skill={skill} index={index} />
            ))}
          </SafeBlurView>
        </Animated.View>

        {/* Results Summary Section */}
        <Animated.View entering={FadeInUp.delay(1300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Bilan du défi <Text style={styles.sectionArabic}>نتائج التحدي</Text></Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { borderColor: '#4CAF50' }]}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.statVal}>{correctCount}</Text>
              <Text style={styles.statLabel}>Correctes</Text>
            </View>
            <View style={[styles.statBox, { borderColor: '#ff5252' }]}>
              <MaterialIcons name="cancel" size={24} color="#ff5252" />
              <Text style={styles.statVal}>{incorrectCount}</Text>
              <Text style={styles.statLabel}>Erreurs</Text>
            </View>
            <View style={[styles.statBox, { borderColor: '#FFA000' }]}>
              <MaterialIcons name="help-outline" size={24} color="#FFA000" />
              <Text style={styles.statVal}>{allQuestions.length - results.length}</Text>
              <Text style={styles.statLabel}>Ignorées</Text>
            </View>
          </View>

          {incorrectCount > 0 && (
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.primary, marginBottom: 12 }]}
              onPress={() => retryIncorrectQuestions({
                missionId: missionId as string,
                cityId: cityId as string,
                questions: allQuestions || []
              })}
            >
              <MaterialIcons name="refresh" size={20} color={colors.primary} />
              <Text style={[styles.retryBtnText, { color: colors.primary }]}>Refaire les questions fausses</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: '#FFA000', borderStyle: 'solid' }]}
            onPress={() => {
              if (allQuestions.length > 0) {
                clearResults(missionId as string);
                router.replace({
                  pathname: ('/(challenges)/' + allQuestions[0].question_type) as any,
                  params: { missionId, cityId, questionIndex: '0' }
                });
              }
            }}
          >
            <MaterialIcons name="replay" size={20} color="#FFA000" />
            <Text style={[styles.retryBtnText, { color: '#FFA000' }]}>Recommencer la mission</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Detailed Questions List Section */}
        <Animated.View entering={FadeInUp.delay(1350)} style={styles.section}>
          <Text style={styles.sectionTitle}>Détails de la mission <Text style={styles.sectionArabic}>تفاصيل المهمة</Text></Text>
          <View style={styles.questionsList}>
            {allQuestions.map((q, idx) => {
              const result = results.find(r => r.questionIndex === idx);
              const status = result ? (result.isCorrect ? 'correct' : 'wrong') : 'skipped';
              return (
                <View key={idx} style={[styles.questionItem, idx === 0 && { borderTopWidth: 0 }]}>
                  <View style={[styles.statusIndicator, { backgroundColor: status === 'correct' ? '#4CAF50' : status === 'wrong' ? '#ff5252' : '#FFA000' }]}>
                    <MaterialIcons 
                      name={status === 'correct' ? 'check' : status === 'wrong' ? 'close' : 'priority-high'} 
                      size={12} 
                      color="#fff" 
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.questionTextItem, { color: colors.onSurface }]} numberOfLines={1}>
                      {q.question_fr || "Question sans titre"}
                    </Text>
                  </View>
                  {status === 'correct' ? (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneText}>Validé</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => {
                        router.replace({
                          pathname: ('/(challenges)/' + q.question_type) as any,
                          params: { missionId, cityId, questionIndex: String(idx) }
                        });
                      }}
                      style={[styles.retryActionBtn, { backgroundColor: status === 'wrong' ? '#ff525220' : '#FFA00020' }]}
                    >
                      <Text style={[styles.retryActionText, { color: status === 'wrong' ? '#ff5252' : '#FFA000' }]}>
                        {status === 'wrong' ? 'Corriger' : 'Répondre'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Actions Button */}
        <Animated.View entering={FadeInUp.delay(1400)} style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleNextAction}
          >
            <LinearGradient
              colors={['#2c4e3e', '#436655']}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.btnText}>
                {hasNextMission ? "Mission Suivante" : (nextCityName ? `En route vers ${nextCityName}` : "Retourner à la Carte")}
              </Text>
              <MaterialIcons name={hasNextMission ? "arrow-forward" : (nextCityName ? "flight-takeoff" : "map")} size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/accueil')}
          >
            <Text style={styles.secondaryBtnText}>Terminer la session</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>

      <BadgeRewardModal
        badge={earnedBadge}
        isVisible={showBadge}
        onClose={() => setShowBadge(false)}
      />

      <ConfettiEffect />
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
    marginTop: 4,
  },
  badgeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  badgeLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 220,
    marginBottom: 40,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  rank1: {
    zIndex: 10,
    transform: [{ translateY: -20 }],
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    padding: 2,
    backgroundColor: colors.surface,
    position: 'relative',
    marginBottom: 12,
  },
  avatarRingMain: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    padding: 3,
    backgroundColor: colors.surface,
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarMain: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  rank2: {
    paddingBottom: 20,
  },
  rank3: {
    paddingBottom: 10,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeMain: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  rankTextMain: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  nameMain: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
  },
  participantXP: {
    fontSize: 12,
    color: colors.onSurface,
    opacity: 0.8,
  },
  participantXPMain: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  crownIcon: {
    position: 'absolute',
    top: -35,
    zIndex: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 16,
  },
  sectionArabic: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.5,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rewardVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.onSurface,
  },
  rewardLabel: {
    fontSize: 12,
    color: colors.onSurface,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 4,
  },
  skillsCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skillRow: {
    marginBottom: 16,
  },
  skillInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  skillPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },
  progressBg: {
    height: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    height: 64,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurface,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  questionsList: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 12,
    marginTop: 8,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionTextItem: {
    fontSize: 13,
    fontWeight: '600',
  },
  doneBadge: {
    backgroundColor: '#4CAF5015',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  doneText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '800',
  },
  retryActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  retryActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
