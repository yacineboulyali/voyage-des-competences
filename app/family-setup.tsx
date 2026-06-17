import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/useTheme';
import { SoundService } from '../services/sounds';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const ROLES = [
  { id: 'father', label: 'Père', labelAr: 'الأب', icon: 'face' },
  { id: 'mother', label: 'Mère', labelAr: 'الأم', icon: 'face-retouching-natural' },
  { id: 'son', label: 'Fils', labelAr: 'الابن', icon: 'child-care' },
  { id: 'daughter', label: 'Fille', labelAr: 'الابنة', icon: 'child-friendly' },
  { id: 'grandfather', label: 'Grand-père', labelAr: 'الجد', icon: 'elderly' },
  { id: 'grandmother', label: 'Grand-mère', labelAr: 'الجدة', icon: 'elderly-woman' },
];

export default function FamilySetupScreen() {
  const { user } = useAuthStore();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [familyName, setFamilyName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      const nameParts = user.full_name.split(' ');
      const lastName = nameParts[nameParts.length - 1];
      setFamilyName(`Famille ${lastName}`);
    } else {
      setFamilyName('Famille Boulyali');
    }
  }, [user]);

  const handleSelectRole = (roleId: string) => {
    setSelectedRole(roleId);
    SoundService.getInstance().triggerHaptic('medium');
    SoundService.getInstance().playSound('click');
  };

  const handleContinue = async () => {
    if (!familyName.trim() || !selectedRole || !user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('app_users')
        .update({
          family_name: familyName.trim(),
          family_role: selectedRole
        })
        .eq('id', user.id);

      if (error) throw error;

      SoundService.getInstance().playSound('success');
      router.push('/map');
    } catch (err) {
      console.error('Error saving family setup:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Background Zellige Pattern */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width={width} height={height} opacity={0.03}>
          {Array.from({ length: 15 }).map((_, i) =>
            Array.from({ length: 25 }).map((_, j) => (
              <MaterialIcons 
                key={`${i}-${j}`} 
                name="grid-view" 
                size={20} 
                style={{ position: 'absolute', left: i * 40, top: j * 40 }}
                color={colors.primary}
              />
            ))
          )}
        </Svg>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.topNavTitle, { color: colors.onSurface }]}>Configuration</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
              <Text style={[styles.title, { color: colors.onSurface }]}>Crée ta Famille</Text>
              <Text style={[styles.arabicHeader, { color: colors.onSurface }]}>أنشئ عائلتك</Text>
              <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                Personnalisez votre identité de groupe pour ce voyage à travers le Maroc.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Nom de la Famille</Text>
                <Text style={styles.arabicLabel}>اسم العائلة</Text>
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.inputIconBox, { backgroundColor: colors.primary + '10' }]}>
                  <MaterialIcons name="groups" size={24} color={colors.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.onSurface }]}
                  value={familyName}
                  onChangeText={setFamilyName}
                  placeholder="Ex: Famille Boulyali"
                  placeholderTextColor={colors.outline}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Ton Rôle dans l&apos;Aventure</Text>
                <Text style={styles.arabicLabel}>دورك في المغامرة</Text>
              </View>
              <View style={styles.rolesGrid}>
                {ROLES.map((role, index) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      { 
                        backgroundColor: colors.surface,
                      },
                      selectedRole === role.id && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '05',
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => handleSelectRole(role.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.iconWrapper, 
                      { backgroundColor: selectedRole === role.id ? colors.primary : colors.surfaceVariant }
                    ]}>
                      <MaterialIcons 
                        name={role.icon as any} 
                        size={32} 
                        color={selectedRole === role.id ? colors.onPrimary : colors.onSurfaceVariant} 
                      />
                    </View>
                    <Text style={[
                      styles.roleLabel, 
                      { color: selectedRole === role.id ? colors.onSurface : colors.onSurface }
                    ]}>
                      {role.label}
                    </Text>
                    <Text style={[
                      styles.roleLabelAr, 
                      { color: selectedRole === role.id ? colors.onSurface : colors.outline }
                    ]}>
                      {role.labelAr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          <Animated.View entering={FadeInUp.delay(600)} style={styles.footer}>
            <LinearGradient
              colors={['transparent', colors.background]}
              style={styles.footerGradient}
              pointerEvents="none"
            />
            <TouchableOpacity
              style={[
                styles.continueButton, 
                { backgroundColor: colors.primary },
                (!familyName.trim() || !selectedRole || loading) && { opacity: 0.5 }
              ]}
              onPress={handleContinue}
              disabled={!familyName.trim() || !selectedRole || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={[styles.continueText, { color: colors.onPrimary }]}>Valider et Partir</Text>
                  <View style={[styles.btnIcon, { backgroundColor: colors.onPrimary + '20' }]}>
                    <MaterialIcons name="chevron-right" size={24} color={colors.onPrimary} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  topNavTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 10,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  arabicHeader: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 28,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  arabicLabel: {
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 12,
  },
  inputIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleCard: {
    width: (width - 48 - 12) / 2,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  roleLabelAr: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  footerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  continueButton: {
    height: 68,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  continueText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
