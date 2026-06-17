import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { 
  FadeIn, 
  FadeInUp, 
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeBlurView } from '../components/SafeBlurView';
import { useChallenges } from '../hooks/useChallenges';
import { useMissions } from '../hooks/useMissions';
import { usePlayerCityProgress } from '../hooks/usePlayerCityProgress';
import { useQuestions } from '../hooks/useQuestions';
import MissionStepper from '../components/MissionStepper';
import { SoundService } from '../services/sounds';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { getChallengePath } from '../constants/navigation';

const { width, height } = Dimensions.get('window');

// ─── Fallback couleurs par ville (si DB vide) ─────────────────────
const CITY_COLORS: Record<string, string> = {
  rabat:       '#735c00',
  chefchaouen: '#4A90D9',
  fes:         '#d4a843',
  marrakech:   '#e2711d',
  laayoune:    '#f4a261',
  dakhla:      '#2a9d8f',
};

// ─── Fallback images locales (si illustration_url absent) ────────
const FALLBACK_IMAGES: Record<string, any> = {
  rabat:       { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/intro-rabat-full.png?v=1775991607436' },
  chefchaouen: { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/intro-chefchaouen-v2.png?v=1775991607436' },
  fes:         { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/intro-fes-v2.png?v=1775991607436' },
  marrakech:   { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/intro-marrakech-full.png?v=1775991607436' },
  laayoune:    { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/intro-laayoune-v3.png?v=1775991607436' },
  dakhla:      { uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/intro-dakhla-full.png?v=1775991607436' },
};

const ASSETS_URL = 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets';

export default function IntroDefiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, s } = useTheme();
  const { city } = useLocalSearchParams();
  const cityName = (city as string) || 'rabat';

  // ── Fetch challenges from Supabase ────────────────────────────
  const { challenges, loading } = useChallenges();
  const dbData = challenges[cityName];

  // ── Build display data — DB first, fallback to sensible defaults ─
  const cityColor = dbData?.city_color ?? CITY_COLORS[cityName] ?? '#735c00';
  const cityTitle = dbData
    ? `${dbData.city_name_fr}${dbData.city_name_ar ? ' | ' + dbData.city_name_ar : ''}`
    : cityName.charAt(0).toUpperCase() + cityName.slice(1);
  const headline   = dbData?.headline_fr   ?? '...';
  const desc       = dbData?.description_fr ?? '...';
  const stepLabel  = dbData?.step_label     ?? '';
  const uiProgress = dbData?.progress       ?? 0.25;

  // ── Bottom-sheet animation ─────────────────────────────────────
  const translateY   = useSharedValue(height);
  const context      = useSharedValue({ y: 0 });
  const isExpanded   = useSharedValue(true);
  const expandedY    = height * 0.15; // Raised slightly to feel more attached
  const collapsedY   = height * 0.55; // Lowered to leave more space for background

  useEffect(() => {
    // Animation de bas vers le haut plus lente et fluide
    translateY.value = withTiming(expandedY, { 
      duration: 2000,
    });
  }, []);

  const toggleSheet = () => {
    if (isExpanded.value) {
      translateY.value = withSpring(collapsedY, { damping: 20 });
      isExpanded.value = false;
    } else {
      translateY.value = withSpring(expandedY, { damping: 20 });
      isExpanded.value = true;
    }
  };

  const gesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((event) => {
      let y = event.translationY + context.value.y;
      // Add resistance when pulling above expanded limit
      if (y < expandedY) {
        y = expandedY - Math.pow(expandedY - y, 0.7); 
      }
      translateY.value = y;
    })
    .onEnd((event) => {
      if (event.translationY > 50 || event.velocityY > 300) {
        translateY.value = withSpring(collapsedY, { damping: 20 });
        isExpanded.value = false;
      } else if (event.translationY < -50 || event.velocityY < -300) {
        translateY.value = withSpring(expandedY, { damping: 20 });
        isExpanded.value = true;
      } else {
        translateY.value = withSpring(isExpanded.value ? expandedY : collapsedY, { damping: 20 });
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const { missions } = useMissions(cityName);
  const { progress: playerProgressMap } = usePlayerCityProgress();
  
  const cityProg = playerProgressMap[cityName];
  const missionsCompleted = cityProg?.missions_completed ?? 0;
  const currentMissionIdx = missionsCompleted < missions.length ? missionsCompleted : 0;
  const primaryMission = missions[currentMissionIdx];
  const primaryMissionId = primaryMission?.id;

  // ── Fetch questions for the current mission ──────────────────
  const { questions, loading: loadingQuestions } = useQuestions(primaryMissionId);
  const firstQuestion = questions[0];

  // ── Navigate to Pedago first (as requested by user) ──────────
  const handleStart = () => {
    SoundService.getInstance().playSound('click');
    if (loadingQuestions) return;

    if (!primaryMissionId || !firstQuestion) {
      console.log('Aucune mission ou question trouvée, tentative de sync...');
      // On déclenche la sync et on rafraîchit la page
      (async () => {
        const { syncCurriculum } = await import('../services/sync');
        await syncCurriculum();
        router.replace({ pathname: '/intro-defi' as any, params: { city: cityName } });
      })();
      return;
    }

    const targetPath = getChallengePath(firstQuestion.question_type);

    // Now navigating to Pedago first
    router.push({
      pathname: '/pedago' as any,
      params: { 
        cityId: cityName,
        nextPath: targetPath,
        nextMissionId: primaryMissionId
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Chargement ────────────────────────────────────────────── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 10, fontWeight: '600' }}>Mise à jour du contenu...</Text>
        </View>
      )}

      {/* ── Image de chaque ville (DB first) ─────────────────────── */}
      <Animated.Image
        entering={FadeIn.duration(800)}
        source={
          dbData?.illustration_url 
            ? { uri: `${dbData.illustration_url}?v=${Date.now()}` } 
            : (FALLBACK_IMAGES[cityName] ?? FALLBACK_IMAGES.rabat)
        }
        style={[StyleSheet.absoluteFillObject, styles.bgImage]}
        resizeMode="cover"
      />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={[styles.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={dynamics.progressContainer}>
          <MissionStepper 
            currentMissionIndex={currentMissionIdx} 
            totalMissions={missions.length || 5} 
            customColor={cityColor} 
            lightText={true} 
          />
        </View>

        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Fixed Bottom Block ("Rideau") ────────────────────────── */}
      <Animated.View 
        style={[styles.bottomSheet, rBottomSheetStyle]} 
      >
        <SafeBlurView intensity={95} tint="light" style={StyleSheet.absoluteFillObject}>
          {/* Gesture area - ONLY for the handle and top part */}
          <GestureDetector gesture={gesture}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
          </GestureDetector>

          <ScrollView 
            style={{ flex: 1, marginTop: 40 }} 
            contentContainerStyle={[styles.blurContainer, { paddingBottom: Math.max(insets.bottom, 160) }]}
            showsVerticalScrollIndicator={true}
          >
            {/* City badge */}
            <Animated.View entering={FadeInUp.delay(400)} style={styles.badgeContainer}>
              <View style={[styles.cityBadge, { backgroundColor: `${cityColor}15`, borderColor: `${cityColor}30` }]}>
                <MaterialIcons name="location-on" size={18} color={cityColor} />
                <Text style={[styles.cityBadgeText, { color: cityColor }]}>{cityTitle}</Text>
              </View>
            </Animated.View>
            
            {/* Acte Title from DB */}
            {dbData?.acte_title && (
              <Animated.Text entering={FadeInUp.delay(450)} style={[styles.acteTitle, { color: cityColor }]}>
                {dbData.acte_title.toUpperCase()}
              </Animated.Text>
            )}

            {/* Headline from DB */}
            <Animated.Text entering={FadeInUp.delay(500)} style={styles.title}>
              {headline}
            </Animated.Text>

            {/* Description from DB */}
            <Animated.Text entering={FadeInUp.delay(600)} style={styles.description}>
              {desc}
            </Animated.Text>


            {/* Missions list — Refined Grid */}
            {missions.length > 0 && (
              <Animated.View entering={FadeInUp.delay(700)} style={styles.missionsContainer}>
                <Text style={styles.missionsTitle}>{dbData?.missions_title_fr || "VOTRE VOYAGE :"}</Text>
                <View style={styles.missionsWrapper}>
                  {missions.map((m, idx) => {
                    const isCurrent = idx === currentMissionIdx;
                    const isDone = idx < currentMissionIdx;
                    return (
                      <View 
                        key={m.id} 
                        style={[
                          styles.missionChip, 
                          { 
                            backgroundColor: isCurrent ? `${cityColor}15` : isDone ? '#F0F9F0' : '#F9F9FB', 
                            borderColor: isCurrent ? cityColor : isDone ? '#81C784' : '#E0E0E6',
                          }
                        ]}
                      >
                        {isDone ? (
                          <MaterialIcons name="check-circle" size={14} color="#4CAF50" style={{ marginRight: 6 }} />
                        ) : (
                          <View style={[styles.missionNumber, { backgroundColor: isCurrent ? cityColor : '#BDBDBD' }]}>
                            <Text style={styles.missionNumberText}>{idx + 1}</Text>
                          </View>
                        )}
                        <View>
                          <Text style={[styles.missionChipText, { color: isCurrent ? cityColor : isDone ? '#2E7D32' : '#757575' }]}>
                            {m.title_fr}
                          </Text>
                          {isCurrent && m.soft_skill_dominant && (
                            <Text style={[styles.softSkillText, { color: cityColor }]}>
                              {m.soft_skill_dominant}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Fixed CTA Button at the bottom */}
          <Animated.View 
            entering={FadeInUp.delay(800)} 
            style={[
              styles.fixedCtaContainer, 
              { paddingBottom: Math.max(insets.bottom, 20) }
            ]}
          >
              <TouchableOpacity
                style={[
                  styles.primaryBtn, 
                  { backgroundColor: cityColor },
                  loadingQuestions && { opacity: 0.5 }
                ]}
                onPress={handleStart}
                disabled={loadingQuestions}
              >
                {loadingQuestions ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[styles.primaryBtnText, { fontSize: s(15) }]}>
                      {!firstQuestion ? 'CHARGER LE DÉFI' : 'POURSUIVRE LE DÉFI'}
                    </Text>
                    <MaterialIcons 
                      name={!firstQuestion ? 'refresh' : 'play-arrow'} 
                      size={24} 
                      color="#fff" 
                    />
                  </>
                )}
              </TouchableOpacity>

            {(!firstQuestion && !loadingQuestions) && (
              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: '#444', marginTop: 12 }]}
                onPress={async () => {
                  const { syncCurriculum } = await import('../services/sync');
                  await syncCurriculum();
                  router.replace({ pathname: '/intro-defi' as any, params: { city: cityName } });
                }}
              >
                <Text style={styles.primaryBtnText}>SYNCHRONISER LES DONNÉES</Text>
                <MaterialIcons name="sync" size={24} color="#fff" />
              </TouchableOpacity>
            )}

            <View style={styles.socialProof}>
              <View style={styles.avatarsRow}>
                <Image source={{ uri: `${ASSETS_URL}/avatar-1.jpg` }} style={styles.avatarMini} />
                <Image source={{ uri: `${ASSETS_URL}/avatar-2.jpg` }} style={[styles.avatarMini, { marginLeft: -10 }]} />
                <View style={[styles.avatarMiniNum, { marginLeft: -10, backgroundColor: `${cityColor}20` }]}>
                  <Text style={[styles.avatarNumText, { color: cityColor }]}>+12</Text>
                </View>
              </View>
              <Text style={styles.socialText}>12 autres voyageurs</Text>
            </View>
          </Animated.View>
        </SafeBlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    width,
    height,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: height * 0.8, // Match the visible area (1 - expandedY/height)
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#fff', // Solid background to ensure curtain effect
  },
  dragHandleContainer: {
    width: '100%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 100,
  },
  dragHandle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  blurContainer: {
    padding: 12,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  badgeContainer: {
    marginBottom: 4,
    marginTop: 0,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  cityBadgeText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 12,
    opacity: 0.8,
  },
  acteTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  softSkillText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
    opacity: 0.8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#ccc',
  },
  avatarMiniNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarNumText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  fixedCtaContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)', // Subtle background to separate from scrollable content
  },
  socialText: {
    fontSize: 12,
    color: 'rgba(26,26,46,0.5)',
    fontWeight: '600',
  },
  missionsContainer: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  missionsTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 10,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  missionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  missionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  missionChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  missionNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  missionNumberText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

});

const dynamics = StyleSheet.create({
  progressContainer: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
