import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView,
  StatusBar,
  Modal,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Polygon, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { BADGES, Badge } from '../constants/Badges';
import { useAuthStore } from '../stores/authStore';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SafeBlurView } from '../components/SafeBlurView';

const { width, height } = Dimensions.get('window');

const WaveContour = ({ size, color, unlocked }: { size: number, color: string, unlocked: boolean }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (unlocked) {
      scale.value = withRepeat(
        withTiming(1.2, { duration: 2000 }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 2000 }),
        -1,
        false
      );
    }
  }, [unlocked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!unlocked) return null;

  return (
    <Animated.View 
      style={[
        StyleSheet.absoluteFill, 
        animatedStyle, 
        { 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: -1 
        }
      ]}
    >
      <Svg width={size * 1.5} height={size * 1.5} viewBox={`0 0 ${size} ${size}`}>
        <Circle 
          cx={size / 2} 
          cy={size / 2} 
          r={(size / 2) - 2} 
          stroke={color} 
          strokeWidth={1} 
          fill="none" 
        />
      </Svg>
    </Animated.View>
  );
};

const OctagonBadge = ({ badge, size = 80, isLarge = false, onPress }: { badge: Badge, size?: number, isLarge?: boolean, onPress?: () => void }) => {
  const { colors } = useTheme();
  const unlocked = badge.unlocked;
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // Octagon points for SVG
  const half = size / 2;
  const offset = size * 0.28;
  const points = `
    ${offset},0 
    ${size - offset},0 
    ${size},${offset} 
    ${size},${size - offset} 
    ${size - offset},${size} 
    ${offset},${size} 
    0,${size - offset} 
    0,${offset}
  `;

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.1);
    rotation.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withSpring(0)
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const content = (
    <View style={[styles.badgeContainer, { width: size + 20, backgroundColor: 'transparent' }]}>
      <Animated.View style={[{ width: size, height: size, backgroundColor: 'transparent' }, animatedBadgeStyle]}>
        <WaveContour size={size} color={colors.gold} unlocked={unlocked || false} />
        
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}>
          <Defs>
            <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#D4AF37" />
              <Stop offset="50%" stopColor="#F9E29C" />
              <Stop offset="100%" stopColor="#B8860B" />
            </LinearGradient>
          </Defs>
          
          <Polygon
            points={points}
            fill={unlocked ? (isLarge ? 'url(#goldGradient)' : 'transparent') : '#F5F5F5'}
            fillOpacity={unlocked ? (isLarge ? 1 : 0) : 1}
            stroke={unlocked ? '#D4AF37' : '#E0E0E0'}
            strokeWidth={isLarge ? 4 : 2}
          />
        </Svg>

        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'transparent' }]}>
          {(badge.remoteImage || badge.image) ? (
            <Image 
              source={badge.remoteImage || badge.image} 
              style={{ 
                width: size * 0.85, 
                height: size * 0.85, 
                opacity: unlocked ? 1 : 0.25,
                backgroundColor: 'transparent'
              }}
              contentFit="contain"
            />
          ) : (
            <MaterialIcons 
              name={badge.icon as any} 
              size={size * 0.56} 
              color={unlocked ? (isLarge ? '#000000' : colors.onSurface) : '#BDBDBD'} 
            />
          )}
        </View>
      </Animated.View>
      
      {!isLarge && (
        <View style={styles.badgeTextContainer}>
          <Text style={[styles.badgeName, { color: colors.onSurface }]}>{badge.name}</Text>
          <Text style={[styles.badgeArabic, { color: colors.onSurfaceVariant }]}>{badge.arabicName}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const BadgeSection = ({ title, arabicTitle, badges, color, onSelect }: { title: string, arabicTitle: string, badges: Badge[], color: string, onSelect: (b: Badge) => void }) => {
  return (
    <Animated.View 
      entering={FadeInDown.duration(600)}
      style={styles.section}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionLine, { backgroundColor: color }]} />
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{title.toUpperCase()} • {arabicTitle}</Text>
        <View style={[styles.sectionLine, { backgroundColor: color }]} />
      </View>
      
      <View style={styles.badgesGrid}>
        {badges.map((badge) => (
          <OctagonBadge key={badge.id} badge={badge} onPress={() => onSelect(badge)} />
        ))}
      </View>
    </Animated.View>
  );
};

export default function BadgesScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const shakeX = useSharedValue(0);

  // Map user earned badges to the global constant
  const userBadges = BADGES.map(b => ({
    ...b,
    unlocked: user?.badges?.includes(b.id) || false
  }));

  const cities = ['rabat', 'chefchaouen', 'fes', 'marrakech', 'laayoune', 'dakhla'];
  const cityNames: Record<string, { fr: string, ar: string, color: string }> = {
    rabat: { fr: 'Rabat', ar: 'الرباط', color: '#6366f1' },
    chefchaouen: { fr: 'Chefchaouen', ar: 'شفشاون', color: '#3b82f6' },
    fes: { fr: 'Fès', ar: 'فاس', color: '#b45309' },
    marrakech: { fr: 'Marrakech', ar: 'مراكش', color: '#ef4444' },
    laayoune: { fr: 'Laâyoune', ar: 'العيون', color: '#10b981' },
    dakhla: { fr: 'Dakhla', ar: 'الداخلة', color: '#0ea5e9' }
  };

        const finalBadge = userBadges.find(b => b.id === 'tabraat_final');

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/match.mp3')
      );
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing sound', e);
    }
  };

  const handleSelect = (badge: Badge) => {
    setSelectedBadge(badge);
    playSound();
    
    if (Platform.OS !== 'web') {
      if (badge.unlocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    // Start shake/vibration animation
    shakeX.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      ),
      3
    );
  };

  const reflexX = useSharedValue(0);
  const reflexY = useSharedValue(0);

  useEffect(() => {
    if (selectedBadge) {
      reflexX.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1500 }),
          withTiming(-5, { duration: 1500 })
        ),
        -1,
        true
      );
      reflexY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 2000 }),
          withTiming(5, { duration: 2000 })
        ),
        -1,
        true
      );
    } else {
      reflexX.value = 0;
      reflexY.value = 0;
    }
  }, [selectedBadge]);

  const animatedPopupStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value + reflexX.value },
      { translateY: reflexY.value }
    ]
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Collection de Badges</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>مجموعة الشارات</Text>
          <View style={[styles.titleUnderline, { backgroundColor: colors.gold }]} />
        </Animated.View>

        {cities.map((cityId) => {
          const cityBadges = userBadges.filter(b => b.city === cityId);
          const cityInfo = cityNames[cityId];
          return (
            <BadgeSection 
              key={cityId}
              title={cityInfo.fr}
              arabicTitle={cityInfo.ar}
              badges={cityBadges}
              color={cityInfo.color}
              onSelect={handleSelect}
            />
          );
        })}

        {/* Quest/Special Badges Section */}
        {userBadges.filter(b => b.type === 'quest').length > 0 && (
           <BadgeSection 
              title="Quêtes"
              arabicTitle="مهام"
              badges={userBadges.filter(b => b.type === 'quest')}
              color={colors.gold}
              onSelect={handleSelect}
            />
        )}

        {finalBadge && (
          <Animated.View 
            entering={FadeInUp.delay(400).duration(800)}
            style={styles.finalSection}
          >
            <OctagonBadge badge={finalBadge} size={180} isLarge onPress={() => handleSelect(finalBadge)} />
            <Text style={[styles.finalBadgeTitle, { color: colors.onSurface }]}>TABRAAT</Text>
            <Text style={[styles.finalBadgeArabic, { color: colors.onSurfaceVariant }]}>تبرات - الشارة العليا</Text>
            
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <MaterialIcons key={s} name="star" size={24} color={colors.gold} />
              ))}
            </View>
            
            <Text style={[styles.finalBadgeDesc, { color: colors.onSurfaceVariant }]}>
              Le Maître Artisan des Savoirs Traversants
            </Text>
          </Animated.View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Detail Popup */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.modalOverlay}
          onPress={() => setSelectedBadge(null)}
        >
          <SafeBlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
          
          <Animated.View 
            entering={FadeInUp.springify()}
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedBadge(null)}
            >
              <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <Animated.View style={[styles.popupBadgeWrapper, animatedPopupStyle]}>
              <OctagonBadge badge={selectedBadge!} size={160} isLarge />
            </Animated.View>

            <Text style={[styles.popupTitle, { color: colors.onSurface }]}>{selectedBadge?.name}</Text>
            <Text style={[styles.popupSubtitle, { color: colors.onSurfaceVariant }]}>{selectedBadge?.arabicName}</Text>
            
            <View style={styles.rarityBadge}>
              <MaterialIcons name="workspace-premium" size={16} color={colors.gold} />
              <Text style={styles.rarityText}>{selectedBadge?.rarity.toUpperCase() || 'COMMON'}</Text>
            </View>

            {selectedBadge?.pointsRequired !== undefined && (
              <View style={[styles.pointsBadge, { backgroundColor: colors.gold + '20' }]}>
                <MaterialIcons name="stars" size={18} color={colors.gold} />
                <Text style={[styles.pointsText, { color: colors.gold }]}>
                  {selectedBadge.pointsRequired} points requis
                </Text>
              </View>
            )}

            <Text style={[styles.popupDesc, { color: colors.onSurfaceVariant }]}>
              {selectedBadge?.description}
            </Text>

            {!selectedBadge?.unlocked && (
               <View style={[styles.lockedTag, { backgroundColor: '#F5F5F5' }]}>
                <MaterialIcons name="lock" size={16} color="#BDBDBD" />
                <Text style={[styles.lockedText, { color: '#BDBDBD' }]}>VERROUILLÉ</Text>
              </View>
            )}

            <View style={[styles.cityTag, { backgroundColor: colors.primary + '15', marginTop: 10 }]}>
              <MaterialIcons name="location-city" size={16} color={colors.primary} />
              <Text style={[styles.cityText, { color: colors.primary }]}>
                {selectedBadge?.city?.toUpperCase() || 'SPÉCIAL'}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    marginTop: 4,
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
  },
  titleUnderline: {
    width: 60,
    height: 3,
    borderRadius: 2,
    marginTop: 15,
  },
  section: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  sectionLine: {
    height: 1,
    flex: 1,
    opacity: 0.3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 15,
    letterSpacing: 1.5,
  },
  badgesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeTextContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeArabic: {
    fontSize: 10,
    marginTop: 2,
  },
  finalSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 40,
  },
  finalBadgeTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: 20,
  },
  finalBadgeArabic: {
    fontSize: 18,
    marginTop: 5,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 5,
  },
  finalBadgeDesc: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: width * 0.85,
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
  },
  popupBadgeWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  popupSubtitle: {
    fontSize: 18,
    marginTop: 2,
    marginBottom: 15,
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    marginBottom: 20,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4AF37',
  },
  popupDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
    fontStyle: 'italic',
  },
  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  cityText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    gap: 8,
    marginBottom: 20,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    marginBottom: 20,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
