import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CompetencyRadar } from '../components/CompetencyRadar';
import { AVATARS } from '../constants/Avatars';
import { BADGES } from '../constants/Badges';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { ProfileService } from '../services/ProfileService';
import { DEMO_PLAYER_ID } from '../lib/supabase';

const { width } = Dimensions.get('window');



export default function ProfilClassiqueScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { colors: COLORS, uiScale, s } = useTheme();
  const setUiScale = useGameStore((state) => state.setUiScale);

  React.useEffect(() => {
    // S'assurer qu'on a les données réelles au chargement
    const userId = user?.id || DEMO_PLAYER_ID;
    ProfileService.fetchFullProfile(userId);
  }, []);

  const styles = getStyles(COLORS, s);
  
  // Utilisation des données réelles ou fallback
  const displayName = user?.full_name || 'Voyageur';
  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const userSkills = user?.skills || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: COLORS.background }]}>
      {/* TopAppBar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="menu" size={s(24)} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.primary }]}>Le Voyage</Text>
        </View>
        <View style={[styles.headerAvatarContainer, { borderColor: COLORS.primaryLight }]}>
          <Image 
            source={AVATARS.explorer} 
            style={styles.headerAvatar} 
            contentFit="cover" 
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Section */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.profileSection}>
          <View style={styles.mainAvatarWrapper}>
            <View style={[styles.mainAvatarBorder, { backgroundColor: COLORS.primary }]}>
              <Image 
                source={AVATARS.explorer} 
                style={[styles.mainAvatar, { borderColor: COLORS.background }]} 
                contentFit="cover" 
              />
            </View>
            <View style={[styles.levelBadge, { backgroundColor: COLORS.gold, borderColor: COLORS.background }]}>
              <Text style={[styles.levelBadgeText, { color: COLORS.white }]}>NIVEAU {userLevel}</Text>
            </View>
          </View>
          <Text style={[styles.profileName, { color: COLORS.onSurface }]}>{displayName}</Text>
          <Text style={[styles.profileRole, { color: COLORS.onSurfaceVariant }]}>{userXP} XP • Explorateur de Savoir</Text>
        </Animated.View>

        {/* Soft Skills Radar Card */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.radarSection}>
          <View style={[styles.radarCard, { backgroundColor: COLORS.surfaceVariant }]}>
            <MaterialIcons name="architecture" size={s(60)} color={COLORS.primary} style={styles.bgIcon} />
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="psychology" size={s(24)} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.onSurface }]}>Majlis des Soft Skills</Text>
            </View>

            {/* Animated 3-axis radar with real data */}
            <CompetencyRadar skills={userSkills} />
          </View>
        </Animated.View>

        {/* Horizontal Badge Gallery */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.badgesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: COLORS.onSurface }]}>Coffre aux Bijoux</Text>
            <TouchableOpacity onPress={() => router.push('/badges')}>
              <Text style={[styles.seeAllText, { color: COLORS.accent }]}>VOIR TOUT</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            {BADGES.slice(0, 6).map((badge) => {
              const unlocked = user?.badges?.includes(badge.id);
              return (
                <TouchableOpacity 
                  key={badge.id} 
                  style={[styles.badgeCard, { backgroundColor: COLORS.surface }, !unlocked && { opacity: 0.5 }]}
                  onPress={() => router.push('/badges')}
                >
                  <View style={[styles.badgeIconBg, { backgroundColor: unlocked ? COLORS.primaryLight : COLORS.surfaceVariant }]}>
                    {badge.remoteImage ? (
                      <Image 
                        source={badge.remoteImage} 
                        style={{ width: s(44), height: s(44) }}
                        contentFit="contain"
                      />
                    ) : (
                      <MaterialIcons name={badge.icon as any} size={s(32)} color={unlocked ? COLORS.primary : COLORS.outline} />
                    )}
                  </View>
                  <Text style={[styles.badgeName, { color: COLORS.onSurface }]}>{badge.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Family Leaderboard */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.leaderboardSection}>
          <View style={[styles.leaderboardCard, { backgroundColor: COLORS.surfaceVariant }]}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="groups" size={s(24)} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.onSurface }]}>Cercle Familial</Text>
            </View>

            <View style={styles.leaderboardList}>
              <View style={[styles.lbItem, { backgroundColor: COLORS.surface }]}>
                <View style={styles.lbItemLeft}>
                  <Text style={[styles.lbRankTertiary, { color: COLORS.gold }]}>1</Text>
                  <Image source={AVATARS.mentor} style={[styles.lbAvatar, { borderColor: COLORS.gold }]} />
                  <View>
                    <Text style={[styles.lbName, { color: COLORS.onSurface }]}>Oncle Youssef</Text>
                    <Text style={[styles.lbRole, { color: COLORS.onSurfaceVariant }]}>Savant de la Famille</Text>
                  </View>
                </View>
                <Text style={[styles.lbScorePrimary, { color: COLORS.primary }]}>4850 XP</Text>
              </View>

              <View style={[styles.lbItemActive, { backgroundColor: COLORS.primary }]}>
                <View style={styles.lbItemLeft}>
                  <Text style={[styles.lbRankActive, { color: COLORS.primaryLight }]}>2</Text>
                  <Image source={AVATARS.explorer} style={[styles.lbAvatar, { borderColor: COLORS.primaryLight }]} />
                  <View>
                    <Text style={[styles.lbNameActive, { color: COLORS.white }]}>Moi ({displayName})</Text>
                    <Text style={[styles.lbRoleActive, { color: COLORS.primaryLight }]}>En pleine ascension</Text>
                  </View>
                </View>
                <Text style={[styles.lbScoreActive, { color: COLORS.white }]}>{userXP} XP</Text>
              </View>

              <View style={[styles.lbItem, { backgroundColor: COLORS.surface }]}>
                <View style={styles.lbItemLeft}>
                  <Text style={[styles.lbRankOutline, { color: COLORS.outline }]}>3</Text>
                  <Image source={AVATARS.girl} style={[styles.lbAvatar, { borderColor: COLORS.outline }]}/>
                  <View>
                    <Text style={[styles.lbName, { color: COLORS.onSurface }]}>Cousin Amira</Text>
                    <Text style={[styles.lbRole, { color: COLORS.onSurfaceVariant }]}>Voyageuse Curieuse</Text>
                  </View>
                </View>
                <Text style={[styles.lbScorePrimary, { color: COLORS.primary }]}>3980 XP</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* UI Scaling Control */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.scaleSection}>
          <View style={[styles.scaleCard, { backgroundColor: COLORS.surfaceVariant }]}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="format-size" size={s(24)} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.onSurface }]}>Taille du jeu</Text>
            </View>
            <View style={styles.scaleOptions}>
              {[
                { label: 'Petit', scale: 0.85, icon: 'text-fields' },
                { label: 'Normal', scale: 1.0, icon: 'text-fields' },
                { label: 'Grand', scale: 1.15, icon: 'text-fields' }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.scaleBtn,
                    { backgroundColor: uiScale === opt.scale ? COLORS.primary : COLORS.surface }
                  ]}
                  onPress={() => setUiScale(opt.scale)}
                >
                  <Text style={[styles.scaleBtnText, { color: uiScale === opt.scale ? COLORS.white : COLORS.onSurface }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
        
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS: any, s: (v: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    height: s(64),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(16),
  },
  headerTitle: {
    fontSize: s(20),
    fontWeight: '900',
  },
  headerAvatarContainer: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    borderWidth: 2,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: s(24),
    paddingTop: s(16),
    paddingBottom: s(120),
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: s(40),
  },
  mainAvatarWrapper: {
    position: 'relative',
    marginBottom: s(16),
  },
  mainAvatarBorder: {
    width: s(112),
    height: s(112),
    borderRadius: s(56),
    padding: s(4),
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: s(50),
    borderWidth: 4,
  },
  levelBadge: {
    position: 'absolute',
    bottom: s(-8),
    right: 0,
    paddingHorizontal: s(12),
    paddingVertical: s(4),
    borderRadius: s(50),
    borderWidth: 2,
  },
  levelBadgeText: {
    fontSize: s(12),
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: s(24),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  profileRole: {
    fontSize: s(14),
    fontWeight: '500',
    marginTop: s(4),
  },
  radarSection: {
    marginBottom: s(32),
  },
  radarCard: {
    borderRadius: s(24),
    padding: s(24),
    position: 'relative',
    overflow: 'hidden',
  },
  bgIcon: {
    position: 'absolute',
    top: s(16),
    right: s(16),
    opacity: 0.1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: s(24),
  },
  cardTitle: {
    fontSize: s(18),
    fontWeight: 'bold',
  },
  radarVisualization: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(16),
    position: 'relative',
    height: s(200),
  },
  radarSvg: {
    width: s(180),
    height: s(180),
    transform: [{ rotate: '-18deg' }],
  },
  radarLabel: {
    position: 'absolute',
    fontSize: s(10),
    fontWeight: 'bold',
  },
  badgesSection: {
    marginBottom: s(40),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: s(16),
  },
  sectionTitle: {
    fontSize: s(18),
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: s(12),
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgesScroll: {
    gap: s(16),
  },
  badgeCard: {
    width: s(112),
    borderRadius: s(24),
    padding: s(16),
    alignItems: 'center',
  },
  badgeIconBg: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(8),
  },
  badgeName: {
    fontSize: s(10),
    fontWeight: '900',
    textAlign: 'center',
  },
  leaderboardSection: {
    marginBottom: s(16),
  },
  leaderboardCard: {
    borderRadius: s(24),
    padding: s(24),
  },
  leaderboardList: {
    gap: s(12),
  },
  lbItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(12),
    borderRadius: s(16),
  },
  lbItemActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(12),
    borderRadius: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  lbItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  lbRankTertiary: {
    width: s(16),
    textAlign: 'center',
    fontSize: s(16),
    fontWeight: 'bold',
  },
  lbRankActive: {
    width: s(16),
    textAlign: 'center',
    fontSize: s(16),
    fontWeight: 'bold',
  },
  lbRankOutline: {
    width: s(16),
    textAlign: 'center',
    fontSize: s(16),
    fontWeight: 'bold',
  },
  lbAvatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    borderWidth: 2,
  },
  lbName: {
    fontSize: s(14),
    fontWeight: 'bold',
  },
  lbNameActive: {
    fontSize: s(14),
    fontWeight: 'bold',
  },
  lbRole: {
    fontSize: s(10),
  },
  lbRoleActive: {
    fontSize: s(10),
    opacity: 0.8,
  },
  lbScorePrimary: {
    fontSize: s(14),
    fontWeight: '900',
  },
  lbScoreActive: {
    fontSize: s(14),
    fontWeight: '900',
  },
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  scaleSection: {
    marginTop: s(24),
    marginBottom: s(40),
  },
  scaleCard: {
    borderRadius: s(24),
    padding: s(24),
  },
  scaleOptions: {
    flexDirection: 'row',
    gap: s(12),
    marginTop: s(8),
  },
  scaleBtn: {
    flex: 1,
    paddingVertical: s(12),
    borderRadius: s(16),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scaleBtnText: {
    fontSize: s(14),
    fontWeight: '700',
  },
});
