import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useMissions } from '../hooks/useMissions';
import { useChallenges } from '../hooks/useChallenges';
import { SafeBlurView } from '../components/SafeBlurView';
import Animated, { 
  FadeInDown, 
  FadeInRight,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const PrincipleItem = ({ icon, title, arabicTitle, delay, colors: COLORS, styles, s }: { icon: any, title: string, arabicTitle: string, delay: number, colors: any, styles: any, s: any }) => (
  <Animated.View 
    entering={FadeInRight.delay(delay).duration(600)}
    style={[styles.principleCard, { backgroundColor: COLORS.surface }]}
  >
    <View style={[styles.principleIconContainer, { backgroundColor: COLORS.surfaceVariant }]}>
      <MaterialIcons name={icon} size={s(28)} color={COLORS.gold || '#cca72f'} />
    </View>
    <View style={styles.principleTextContainer}>
      <Text style={[styles.principleTitle, { color: COLORS.onSurface }]}>{title}</Text>
      <Text style={[styles.principleArabic, { color: COLORS.onSurfaceVariant }]}>{arabicTitle}</Text>
    </View>
  </Animated.View>
);

export default function PedagoScreen() {
  const { colors: COLORS, themeMode, s } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const cityId = params.cityId as string;
  const targetCity = cityId || 'rabat';

  const { missions, loading: loadingMissions } = useMissions(targetCity);
  const { challenges } = useChallenges();
  const cityData = challenges[targetCity];
  const cityColor = cityData?.city_color ?? COLORS.gold;
  const styles = getStyles(COLORS, s);

  const handleContinue = async () => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(`pedago_seen_${targetCity}`, 'true');
    } catch (e) {
      console.error('Error saving pedago status', e);
    }

    if (params.nextPath && params.nextMissionId) {
      router.push({
        pathname: params.nextPath as any,
        params: { 
          missionId: params.nextMissionId as string,
          cityId: targetCity 
        }
      });
    } else if (params.fromChallenge === 'true') {
      router.back();
    } else {
      router.push({ pathname: '/intro-defi' as any, params: { city: targetCity } });
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: COLORS.background }]}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceVariant]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(800)}>
          <View style={styles.imageWrapper}>
            <Image 
              source={{ uri: cityData?.illustration_url || 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/pedago-marrakech.png?v=1775991607482' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.imageOverlay}
            />
            <TouchableOpacity 
              style={[styles.backButton, { top: insets.top + s(10) }]}
              onPress={() => router.back()}
            >
              <SafeBlurView intensity={30} tint="light" style={styles.blurBtn}>
                <Ionicons name="chevron-back" size={s(24)} color={COLORS.white} />
              </SafeBlurView>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.contentPadding}>
          <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.expertSection}>
            <View style={styles.expertHeader}>
              <View style={[styles.vLine, { backgroundColor: cityColor }]} />
              <View>
                <Text style={[styles.expertName, { color: COLORS.onSurface }]}>{cityData?.city_name_fr || 'Rabat'} : Objectifs</Text>
                <Text style={[styles.expertTitle, { color: COLORS.onSurfaceVariant }]}>Préparez votre voyage de compétences</Text>
              </View>
            </View>
            
            <View style={[styles.quoteCard, { backgroundColor: COLORS.surface }]}>
              <MaterialIcons name="info" size={s(32)} color={cityColor} style={styles.quoteIcon} />
              <Text style={[styles.quoteText, { color: COLORS.onSurface }]}>
                {cityData?.description_fr || "Découvrez les secrets de cette ville à travers des missions culturelles et professionnelles."}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: cityColor }]}>{cityData?.missions_title_fr || "Missions à accomplir"}</Text>
            <View style={[styles.analysisCard, { backgroundColor: 'rgba(255,255,255,0.6)', borderColor: COLORS.border }]}>
              {loadingMissions ? (
                <ActivityIndicator color={cityColor} />
              ) : missions.length === 0 ? (
                <Text style={[styles.emptyText, { color: COLORS.onSurfaceVariant }]}>Aucune mission disponible pour le moment.</Text>
              ) : (
                missions.map((mission, idx) => (
                  <View key={mission.id} style={[styles.analysisRow, idx > 0 && { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: cityColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.analysisOption, { color: COLORS.onSurface }]}>{mission.title_fr}</Text>
                      <Text style={[styles.analysisResult, { color: COLORS.onSurfaceVariant }]}>
                        {mission.description_fr || "Relevez le défi pour maîtriser cette facette du patrimoine."}
                      </Text>
                      {mission.soft_skill_dominant && (
                        <View style={styles.softSkillBadge}>
                          <MaterialIcons name="star" size={s(12)} color={cityColor} />
                          <Text style={[styles.softSkillText, { color: cityColor }]}>{mission.soft_skill_dominant}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </Animated.View>
          
          {/* Learning Outcomes Section */}
          {cityData?.learning_outcomes && cityData.learning_outcomes.length > 0 && (
            <Animated.View entering={FadeInDown.delay(500).duration(800)} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: cityColor }]}>🎯 CE QUE VOUS ALLEZ APPRENDRE :</Text>
              <View style={[styles.analysisCard, { backgroundColor: 'rgba(255,255,255,0.6)', borderColor: COLORS.border }]}>
                {cityData.learning_outcomes.map((outcome, idx) => (
                  <View key={idx} style={[styles.outcomeRow, idx > 0 && { marginTop: s(12) }]}>
                    <MaterialIcons name="check-circle" size={s(18)} color={cityColor} />
                    <Text style={[styles.outcomeText, { color: COLORS.onSurface }]}>{outcome}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: cityColor }]}>Compétences Clés</Text>
            <PrincipleItem 
              icon="hearing" 
              title="Intelligence Culturelle" 
              arabicTitle="الذكاء الثقافي" 
              delay={700}
              colors={COLORS}
              styles={styles}
              s={s}
            />
            <PrincipleItem 
              icon="security" 
              title="Communication Assertive" 
              arabicTitle="التواصل الفعال" 
              delay={850}
              colors={COLORS}
              styles={styles}
              s={s}
            />
          </Animated.View>
        </View>
      </ScrollView>

      <SafeBlurView intensity={80} tint={themeMode === 'dark' ? 'dark' : 'light'} style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        <TouchableOpacity 
          style={[styles.continueBtn, { backgroundColor: cityColor }]}
          onPress={handleContinue}
        >
          <Text style={[styles.continueText, { color: COLORS.white }]}>POURSUIVRE LE DÉFI</Text>
          <MaterialIcons 
            name={params.fromChallenge === 'true' ? 'assignment-return' : 'play-arrow'} 
            size={s(24)} 
            color={COLORS.white} 
          />
        </TouchableOpacity>
      </SafeBlurView>
    </View>
  );
}

const getStyles = (COLORS: any, s: (v: number) => number) => StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageWrapper: {
    width: '100%',
    height: s(120),
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: s(20),
    zIndex: 10,
  },
  blurBtn: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  contentPadding: {
    paddingHorizontal: s(24),
    paddingTop: s(16),
  },
  expertSection: {
    marginBottom: s(16),
  },
  expertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(16),
  },
  vLine: {
    width: s(4),
    height: s(40),
    backgroundColor: COLORS.gold || '#cca72f',
    marginRight: s(12),
    borderRadius: s(2),
  },
  expertName: {
    fontSize: s(20),
    fontWeight: '800',
    color: COLORS.onSurface,
  },
  expertTitle: {
    fontSize: s(14),
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  quoteCard: {
    backgroundColor: COLORS.white,
    borderRadius: s(20),
    padding: s(24),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: s(10),
    left: s(10),
    opacity: 0.1,
  },
  quoteText: {
    fontSize: s(18),
    fontStyle: 'italic',
    color: COLORS.onSurface,
    lineHeight: s(28),
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: s(32),
  },
  sectionLabel: {
    fontSize: s(14),
    fontWeight: '900',
    color: COLORS.gold || '#cca72f',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: s(16),
  },
  analysisCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: s(24),
    padding: s(20),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(8),
  },
  statusDot: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    marginRight: s(10),
  },
  analysisOption: {
    fontSize: s(15),
    fontWeight: '700',
    color: COLORS.onSurface,
    flex: 1,
  },
  analysisResult: {
    fontSize: s(14),
    color: COLORS.onSurface,
    lineHeight: s(22),
    paddingLeft: 0,
    marginTop: s(4),
  },
  softSkillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(6),
    gap: s(4),
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignSelf: 'flex-start',
    paddingHorizontal: s(8),
    paddingVertical: s(2),
    borderRadius: s(10),
  },
  softSkillText: {
    fontSize: s(10),
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  principleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: s(16),
    borderRadius: s(16),
    marginBottom: s(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  principleIconContainer: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(16),
  },
  principleTextContainer: {
    flex: 1,
  },
  principleTitle: {
    fontSize: s(16),
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  principleArabic: {
    fontSize: s(14),
    color: COLORS.onSurface,
    opacity: 0.6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: s(24),
    paddingTop: s(16),
    borderTopLeftRadius: s(32),
    borderTopRightRadius: s(32),
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
    height: s(64),
    borderRadius: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(12),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  continueText: {
    color: COLORS.white,
    fontSize: s(18),
    fontWeight: '800',
  },
  emptyText: {
    fontSize: s(14),
    color: COLORS.onSurface,
    opacity: 0.6,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: s(20),
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  outcomeText: {
    fontSize: s(14),
    fontWeight: '500',
    lineHeight: s(20),
    flex: 1,
  },
});
