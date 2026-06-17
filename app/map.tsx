import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Animated, { 
  FadeInDown,
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing 
} from 'react-native-reanimated';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundService } from '../services/sounds';
import { useTheme } from '../hooks/useTheme';
import { SafeBlurView } from '../components/SafeBlurView';
import { FullScreenLoader } from '../components/FullScreenLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useChallenges, Challenge } from '../hooks/useChallenges';
import { usePlayerCityProgress } from '../hooks/usePlayerCityProgress';
import { useGameStore } from '../stores/gameStore';
import { AVATARS } from '../constants/Avatars';

const { width, height } = Dimensions.get('window');

const ASSETS_URL = 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets';

// Mapping des IDs de ville vers leurs icônes de monuments
const CITY_LANDMARKS: Record<string, any> = {
  rabat:       require('../assets/images/landmarks/rabat.png'),
  marrakech:   require('../assets/images/landmarks/marrakech.png'),
  fes:         require('../assets/images/landmarks/fes.png'),
  chefchaouen: require('../assets/images/landmarks/chefchaouen.png'),
  laayoune:    require('../assets/images/landmarks/laayoune.png'),
  dakhla:      require('../assets/images/landmarks/dakhla.png'),
};

// ─── Composant CityIcon pour gérer les différents types d'icônes ─────────────
const CityIcon = ({ iconName, cityId, size = 40, color }: { iconName?: string | null, cityId: string, size?: number, color: string }) => {
  const icon = iconName || cityId;

  // 1. Image distante (URL Supabase/HTTP)
  if (icon.startsWith('http')) {
    return (
      <Image 
        source={{ uri: icon }} 
        style={{ width: size, height: size, borderRadius: size / 8 }} 
        resizeMode="contain"
        tintColor={color.includes('rgba') || color === 'transparent' ? undefined : color}
      />
    );
  }

  // 2. Landmark (Image PNG locale)
  if (CITY_LANDMARKS[icon]) {
    return (
      <Image 
        source={CITY_LANDMARKS[icon]} 
        style={{ width: size * 1.35, height: size * 1.35, resizeMode: 'contain' }} 
        tintColor={color}
      />
    );
  }

  // 3. Emoji (préfixe dashboard 'emoji:')
  if (icon.startsWith('emoji:')) {
    const emoji = icon.split(':')[1];
    return <Text style={{ fontSize: size * 1.1, textAlign: 'center', opacity: color === 'transparent' ? 0.4 : 1 }}>{emoji}</Text>;
  }

  // 4. MaterialIcon (préfixe dashboard 'material:')
  if (icon.startsWith('material:')) {
    const name = icon.split(':')[1] as any;
    return <MaterialIcons name={name} size={size} color={color} />;
  }

  // 5. Fallback - Icône par défaut
  return <MaterialIcons name="location-city" size={size} color={color} />;
};



// ─── Lantern extrait comme composant mémoïsé (hors du render de MapScreen) ──
// OPTIMISATION: Défini en dehors du composant parent pour éviter les re-créations
// sur chaque render de MapScreen qui causaient des remontages inutiles.
interface LanternProps {
  delay: number;
  style: any;
  color: string;
}

const Lantern = React.memo(({ delay, style, color }: LanternProps) => {
  const opacity = useSharedValue(0.4);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.8, { duration: 3000 }),
        withTiming(0.4, { duration: 3000 })
      ), -1, true
    ));
    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View 
      style={[
        lanternStyles.lantern, 
        { backgroundColor: color, shadowColor: color },
        style, 
        animatedStyle
      ]} 
    />
  );
});

Lantern.displayName = 'Lantern';

const lanternStyles = StyleSheet.create({
  lantern: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});
// ────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, s } = useTheme();
  const uiScale = useGameStore(state => state.uiScale);
  const dynamics = getStyles(colors, s, isDark);

  const { challenges, loading: loadingChallenges, error: errorChallenges, refresh } = useChallenges();
  const { progress, loading: loadingProgress, error: errorProgress, refresh: refreshProgress } = usePlayerCityProgress();
  const scrollViewRef = useRef<ScrollView>(null);

  // Constants for the map layout
  const NODE_SIZE = 90;
  const VERTICAL_GAP = 160;
  const HORIZONTAL_OFFSET = width * 0.15; // Zig-zag offset
  
  // Convert challenges map to sorted array (Rabat is index 0)
  const sortedCities = Object.values(challenges).sort((a, b) => a.sort_order - b.sort_order);
  
  // Total height calculation
  const mapHeight = (sortedCities.length * VERTICAL_GAP) + 400;

  const activeCityProgress = Object.values(progress).find(p => p.status === 'current');
  const ACTIVE_CITY_ID = activeCityProgress?.city_id ?? 
    (sortedCities.find(c => !progress[c.city_id] || progress[c.city_id].status === 'locked')?.city_id || sortedCities[0]?.city_id || 'rabat');
  
  const [selectedCityId, setSelectedCityId] = React.useState<string | null>(null);
  const [showBottomCard, setShowBottomCard] = React.useState(false);

  // Auto-select the active city and show its card
  useEffect(() => {
    if (!loadingChallenges && sortedCities.length > 0 && !selectedCityId) {
      const t = setTimeout(() => {
        setSelectedCityId(ACTIVE_CITY_ID);
        setShowBottomCard(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [loadingChallenges, sortedCities.length]);

  // Helper to get node position
  const getNodePos = (index: number) => {
    // index 0 (Rabat) is at the bottom in the visual layout, but first in array
    // We want Rabat (index 0) at the bottom, so index length-1 is at the top.
    const reverseIndex = (sortedCities.length - 1) - index;
    const isRight = index % 2 === 1;
    return {
      x: width / 2 + (isRight ? HORIZONTAL_OFFSET : -HORIZONTAL_OFFSET),
      y: 200 + (reverseIndex * VERTICAL_GAP)
    };
  };

  const activeChallenge = selectedCityId ? challenges[selectedCityId] : null;
  const activeColor = activeChallenge?.city_color ?? colors.gold;

  // Animations
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.2);
  const wave1Scale = useSharedValue(1);
  const wave1Opacity = useSharedValue(0.5);
  const wave2Scale = useSharedValue(1);
  const wave2Opacity = useSharedValue(0.5);

  useEffect(() => {
    pulseScale.value = withRepeat(withTiming(1.3, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    pulseOpacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    
    wave1Scale.value = withRepeat(withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false);
    wave1Opacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false);
    
    const t = setTimeout(() => {
      wave2Scale.value = withRepeat(withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false);
      wave2Opacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }], opacity: pulseOpacity.value }));
  const wave1Style = useAnimatedStyle(() => ({ transform: [{ scale: wave1Scale.value }], opacity: wave1Opacity.value }));
  const wave2Style = useAnimatedStyle(() => ({ transform: [{ scale: wave2Scale.value }], opacity: wave2Opacity.value }));

  // Auto-scroll to Rabat (bottom)
  useEffect(() => {
    if (!loadingChallenges && !loadingProgress && sortedCities.length > 0) {
      const t = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [loadingChallenges, loadingProgress]);

  const handleCityPress = (cityId: string) => {
    setSelectedCityId(cityId);
    setShowBottomCard(true);
    SoundService.getInstance().playSound('click');
    SoundService.getInstance().triggerHaptic('medium');
  };

  return (
    <View style={dynamics.mainContainer}>
      <SafeBlurView 
        intensity={80} 
        tint={isDark ? "dark" : "light"} 
        style={[dynamics.header, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={dynamics.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/profil')}>
            <Image source={AVATARS.explorer} style={dynamics.avatar} />
          </TouchableOpacity>
          <View>
            <Text style={dynamics.headerTitle}>Le Voyage</Text>
            <Text style={dynamics.headerSubtitle}>الرحلة</Text>
          </View>
        </View>

        <View style={dynamics.progressHeader}>
          <View style={dynamics.progressTrack}>
            <View style={[dynamics.progressFill, { 
              width: `${Math.round(Object.values(progress).reduce((acc, p) => acc + (p.missions_completed / (p.missions_total || 5)), 0) / (Object.keys(challenges).length || 1) * 100)}%` 
            }]} />
          </View>
        </View>

        <TouchableOpacity style={dynamics.menuBtn} onPress={() => router.push('/settings')}>
          <MaterialIcons name="settings" size={s(24)} color={colors.onSurface} />
        </TouchableOpacity>
      </SafeBlurView>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={[dynamics.scrollContent, { height: mapHeight }]} 
        showsVerticalScrollIndicator={false}
      >
        <Lantern delay={0}    style={{ top: 200, left: 60 }}  color={colors.gold} />
        <Lantern delay={1000} style={{ top: 400, right: 80 }} color={colors.gold} />
        <Lantern delay={2000} style={{ top: 600, left: 100 }} color={colors.gold} />

        {loadingChallenges || loadingProgress ? (
          <FullScreenLoader 
            message="Chargement du voyage..." 
            error={errorChallenges || errorProgress} 
            onRetry={() => { refresh(); refreshProgress(); }} 
          />
        ) : (
          <>
            {/* SVG Path Layer */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <Svg width={width} height={mapHeight}>
                {sortedCities.map((city, index) => {
                  if (index === sortedCities.length - 1) return null;
                  const start = getNodePos(index);
                  const end = getNodePos(index + 1);
                  const midY = (start.y + end.y) / 2;
                  
                  const cityProgress = progress[sortedCities[index+1].city_id];
                  const isLocked = !cityProgress || cityProgress.status === 'locked';
                  
                  return (
                    <Path 
                      key={`path-${city.city_id}`}
                      d={`M ${start.x} ${start.y} C ${start.x} ${midY} ${end.x} ${midY} ${end.x} ${end.y}`} 
                      fill="none" 
                      stroke={colors.gold} 
                      strokeWidth={isLocked ? 4 : 8} 
                      strokeDasharray={progress[city.city_id]?.status === 'current' ? "12 12" : "0"}
                      opacity={isLocked ? 0.15 : 0.6} 
                      strokeLinecap="round" 
                    />
                  );
                })}
              </Svg>
            </View>

            {/* Nodes Layer */}
            {sortedCities.length === 0 ? (
              <View style={{ flex: 1, height: height * 0.7, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <MaterialIcons name="cloud-off" size={64} color={colors.outline} />
                <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
                  Oups ! Le voyage n&apos;a pas pu charger.
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 14, marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
                  Vérifie ta connexion et réessaie de synchroniser les données.
                </Text>
                <TouchableOpacity 
                  style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                  onPress={() => {
                    SoundService.getInstance().playSound('click');
                    refresh();
                  }}
                >
                  <Text style={{ color: colors.white, fontWeight: 'bold' }}>SYNCHRONISER</Text>
                </TouchableOpacity>
              </View>
            ) : (
              sortedCities.map((city, index) => {
                const pos = getNodePos(index);
                const cityProgress = progress[city.city_id];
                let status = cityProgress?.status ?? 'locked';
                if (city.city_id === 'rabat' && status === 'locked') status = 'current';

                const isLocked = status === 'locked';
                const isFirstActive = city.city_id === ACTIVE_CITY_ID;
                
                return (
                  <View 
                    key={city.city_id}
                    style={{ 
                      position: 'absolute', 
                      left: pos.x - 45, 
                      top: pos.y - 45,
                      zIndex: 10
                    }}
                  >
                    <TouchableOpacity 
                      onPress={() => handleCityPress(city.city_id)} 
                      activeOpacity={0.8}
                      style={dynamics.nodeContainer}
                    >
                      {isFirstActive && (
                        <>
                          <Animated.View style={[dynamics.waveRing, { borderColor: city.city_color || colors.gold }, wave1Style]} />
                          <Animated.View style={[dynamics.waveRing, { borderColor: city.city_color || colors.gold }, wave2Style]} />
                        </>
                      )}

                      {status === 'current' && <Animated.View style={[dynamics.pulseRing, pulseStyle]} />}
                      
                      <View style={[
                        dynamics.nodeBase, 
                        isLocked ? dynamics.nodeLocked : 
                        status === 'current' ? [dynamics.nodeActive, { borderColor: city.city_color || colors.gold }] : 
                        dynamics.nodeCompletedB
                      ]}>
                        <View style={isLocked ? { opacity : 0.5 } : {}}>
                          <CityIcon 
                            iconName={city.icon_name} 
                            cityId={city.city_id} 
                            size={40} 
                            color={isLocked ? colors.onSurfaceVariant : (city.city_color || colors.gold)} 
                          />
                          {status === 'done' && (
                            <View style={dynamics.checkBadge}>
                              <MaterialIcons name="verified" size={16} color={city.city_color || colors.gold} />
                            </View>
                          )}
                        </View>
                        
                        {isLocked && (
                          <View style={dynamics.lockIconContainer}>
                             <MaterialIcons name="lock" size={14} color="#fff" />
                          </View>
                        )}

                        {status === 'current' && (
                          <View style={[dynamics.activePill, { backgroundColor: city.city_color || colors.gold }]}>
                            <Text style={dynamics.activePillText}>ACTUEL</Text>
                          </View>
                        )}
                      </View>

                      <View style={dynamics.nodeTextContainer}>
                        <Text style={isLocked ? dynamics.nodeTitleLocked : dynamics.nodeTitle} numberOfLines={1}>
                          {city.city_name_fr}
                        </Text>
                        <Text style={[isLocked ? dynamics.nodeSubtitleLocked : dynamics.nodeSubtitle, { color: isLocked ? colors.onSurfaceVariant + '40' : colors.onSurface }]}>
    {city.city_name_ar}
  </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom info card */}
      {showBottomCard && activeChallenge && (
        <Animated.View 
          entering={FadeInDown.springify()}
          style={dynamics.bottomCard}
        >
          <SafeBlurView intensity={90} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
          
          <TouchableOpacity 
            style={dynamics.closeBtn}
            onPress={() => setShowBottomCard(false)}
          >
            <MaterialIcons name="close" size={s(20)} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={dynamics.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={[dynamics.cardTag, { borderColor: activeColor }]}>
                <Text style={[dynamics.cardTagText, { color: activeColor }]}>
                  {activeChallenge.acte_title ? activeChallenge.acte_title.toUpperCase() : (activeChallenge.step_label || 'DÉCOUVRIR LA VILLE').toUpperCase()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CityIcon iconName={activeChallenge.icon_name} cityId={selectedCityId!} size={s(24)} color={activeColor} />
                <View>
                  <Text style={dynamics.cardTitle}>{activeChallenge.city_name_fr}</Text>
                  <Text style={[dynamics.cardSubtitle, { color: colors.onSurface }]}>{activeChallenge.city_name_ar}</Text>
                </View>
              </View>
            </View>
            <View style={[dynamics.pointsBadge, { borderColor: activeColor }]}>
              <Text style={dynamics.pointsLabel}>Points</Text>
              <Text style={[dynamics.pointsValue, { color: colors.onSurface }]}>450</Text>
            </View>
          </View>
          <Text style={dynamics.cardDesc} numberOfLines={2}>
            {activeChallenge.description_fr}
          </Text>
          <TouchableOpacity 
            style={[dynamics.primaryButton, { backgroundColor: activeColor }]}
            onPress={async () => {
              SoundService.getInstance().triggerHaptic('medium');
              try {
                const hasSeen = await AsyncStorage.getItem(`pedago_seen_${selectedCityId}`);
                if (!hasSeen) {
                  router.push({ pathname: '/pedago' as any, params: { cityId: selectedCityId } });
                  return;
                }
              } catch (e) {
                console.error('Error checking pedago status', e);
              }
              router.push({ pathname: '/intro-defi' as any, params: { city: selectedCityId } });
            }}
          >
            <Text style={dynamics.btnText}>POURSUIVRE LE DÉFI</Text>
            <MaterialIcons name="stars" size={s(22)} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (colors: any, s: (v: number) => number, isDark: boolean) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(24),
    paddingBottom: s(16),
    zIndex: 10,
    overflow: 'hidden',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  avatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    borderWidth: 2,
    borderColor: colors.gold,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: s(18),
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontWeight: 'bold',
    fontSize: s(12),
    color: colors.onSurface,
  },
  progressHeader: {
    flex: 1,
    marginHorizontal: s(16),
    maxWidth: s(120),
  },
  progressTrack: {
    height: s(10),
    backgroundColor: colors.surfaceVariant,
    borderRadius: s(5),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  menuBtn: {
    padding: s(8),
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: s(100),
    paddingBottom: s(240),
  },
  nodeContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  nodeBase: {
    width: s(90),
    height: s(90),
    borderRadius: s(45),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  nodeLocked: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
    borderColor: colors.locked + '40',
    opacity: 0.7,
  },
  nodeActive: {
    backgroundColor: colors.surface,
  },
  nodeCompletedB: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.gold,
  },
  pulseRing: {
    position: 'absolute',
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    backgroundColor: isDark ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.15)',
    top: s(-15),
  },
  nodeLandmarkIcon: {
    width: s(54),
    height: s(54),
    resizeMode: 'contain',
  },
  activePill: {
    position: 'absolute',
    top: s(-10),
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: s(12),
    elevation: 4,
  },
  activePillText: {
    color: colors.white,
    fontSize: s(9),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lockIconContainer: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: colors.locked,
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  waveRing: {
    position: 'absolute',
    width: s(130),
    height: s(130),
    borderRadius: s(65),
    borderWidth: 3,
    top: s(-20),
  },
  checkBadge: {
    position: 'absolute',
    bottom: s(4),
    backgroundColor: colors.surface,
    borderRadius: s(12),
    padding: s(2),
  },
  nodeTextContainer: {
    marginTop: s(12),
    alignItems: 'center',
  },
  nodeTitleLocked: {
    fontWeight: 'bold',
    fontSize: s(14),
    color: colors.onSurface,
    opacity: 0.3,
  },
  nodeSubtitleLocked: {
    fontSize: s(12),
    color: colors.onSurface,
    opacity: 0.3,
  },
  nodeTitle: {
    fontWeight: 'bold',
    fontSize: s(18),
    color: colors.onSurface,
  },
  nodeSubtitle: {
    fontWeight: 'bold',
    fontSize: s(14),
  },
  bottomCard: {
    position: 'absolute',
    bottom: 120,
    left: width * 0.05,
    right: width * 0.05,
    borderRadius: 32,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212,168,67,0.4)',
    zIndex: 100,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTag: {
    backgroundColor: isDark ? 'rgba(212,168,67,0.15)' : 'rgba(212,168,67,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.onSurface,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  pointsBadge: {
    backgroundColor: isDark ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.05)',
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 64,
  },
  pointsLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.onSurfaceVariant,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  cardDesc: {
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 16,
    marginBottom: 16,
    opacity: 0.8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  btnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  lantern: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});
