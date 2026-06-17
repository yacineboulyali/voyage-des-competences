import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useGameStore } from '../stores/gameStore';
import { diagnosticService, DiagnosticResult } from '../services/DiagnosticService';
import { dbService } from '../services/database';
import { syncCurriculum } from '../services/sync';
import { Alert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/authStore';

const { width } = Dimensions.get('window');

interface SettingSectionProps {
  title: string;
  arabicTitle: string;
  color: string;
  children: React.ReactNode;
  styles: any;
}

const SettingSection = ({ title, arabicTitle, color, children, styles }: SettingSectionProps) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>
        {title} <Text style={styles.sectionArabic}>{arabicTitle}</Text>
      </Text>
    </View>
    {children}
  </View>
);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('Ahmed_AlMaghribi');
  const [language, setLanguage] = useState('fr');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<DiagnosticResult | null>(null);
  const { user } = useAuthStore();
  
  const styles = getStyles(COLORS, s);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceVariant]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: 'transparent' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerBtn}
            onPress={() => router.back()}
          >
            <MaterialIcons name="menu" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.primary }]}>Zellige Odyssey</Text>
          <View style={[styles.headerAvatarContainer, { borderColor: COLORS.primaryLight }]}>
            <Image
               source={{ uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/settings-avatar.png?v=1775991607489' }}
               style={styles.headerAvatar}
            />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Edit Section */}
        <View style={styles.profileEditSection}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCard, { backgroundColor: COLORS.surface, borderColor: COLORS.surfaceVariant }]}>
              <Image
                source={{ uri: 'https://rydmefudpczpxrresflx.supabase.co/storage/v1/object/public/app-assets/settings-avatar.png?v=1775991607489' }}
                style={styles.profileAvatar}
              />
            </View>
            <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: COLORS.primary }]}>
              <MaterialIcons name="edit" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.pageTitle, { color: COLORS.primary }]}>Paramètres du profil</Text>
          <Text style={[styles.pageSubtitle, { color: COLORS.onSurfaceVariant }]}>إعدادات الملف الشخصي</Text>
          
          <View style={[styles.inputCard, { backgroundColor: COLORS.surface }]}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabel, { color: COLORS.onSurfaceVariant }]}>Nom d’utilisateur</Text>
              <Text style={[styles.inputLabelArabic, { color: COLORS.primary }]}>اسم المستخدم</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: COLORS.surfaceVariant, color: COLORS.onSurface }]}
              value={username}
              onChangeText={setUsername}
            />
          </View>
        </View>

        {/* UI Scaling Settings */}
        <SettingSection 
          title="Taille de l'interface" 
          arabicTitle="حجم الواجهة" 
          color={COLORS.primary || '#2E5A31'}
          styles={styles}
        >
          <View style={styles.modeGrid}>
            <TouchableOpacity 
              style={[
                styles.modeBtn, 
                { backgroundColor: uiScale === 0.85 ? COLORS.primary : COLORS.surfaceVariant }
              ]}
              onPress={() => setUiScale(0.85)}
            >
              <MaterialIcons 
                name="format-size" 
                size={18} 
                color={uiScale === 0.85 ? COLORS.white : COLORS.onSurfaceVariant} 
              />
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeText, { color: uiScale === 0.85 ? COLORS.white : COLORS.onSurfaceVariant }]}>Petit</Text>
                <Text style={[styles.modeTextArabic, { color: uiScale === 0.85 ? COLORS.white : COLORS.onSurfaceVariant }]}>صغير</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeBtn,
                { backgroundColor: uiScale === 1.0 ? COLORS.primary : COLORS.surfaceVariant }
              ]}
              onPress={() => setUiScale(1.0)}
            >
              <MaterialIcons 
                name="format-size" 
                size={24} 
                color={uiScale === 1.0 ? COLORS.white : COLORS.onSurfaceVariant} 
              />
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeText, { color: uiScale === 1.0 ? COLORS.white : COLORS.onSurfaceVariant }]}>Moyen</Text>
                <Text style={[styles.modeTextArabic, { color: uiScale === 1.0 ? COLORS.white : COLORS.onSurfaceVariant }]}>متوسط</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeBtn,
                { backgroundColor: uiScale === 1.15 ? COLORS.primary : COLORS.surfaceVariant }
              ]}
              onPress={() => setUiScale(1.15)}
            >
              <MaterialIcons 
                name="format-size" 
                size={30} 
                color={uiScale === 1.15 ? COLORS.white : COLORS.onSurfaceVariant} 
              />
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeText, { color: uiScale === 1.15 ? COLORS.white : COLORS.onSurfaceVariant }]}>Grand</Text>
                <Text style={[styles.modeTextArabic, { color: uiScale === 1.15 ? COLORS.white : COLORS.onSurfaceVariant }]}>كبير</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Display Settings */}
        <SettingSection 
          title="Mode d'affichage" 
          arabicTitle="وضع العرض" 
          color={COLORS.gold || '#cca72f'}
          styles={styles}
        >
          <View style={styles.modeGrid}>
            <TouchableOpacity 
              style={[
                styles.modeBtn, 
                { backgroundColor: themeMode === 'light' ? COLORS.primary : COLORS.surfaceVariant }
              ]}
              onPress={() => setTheme('light')}
            >
              <MaterialIcons 
                name="light-mode" 
                size={24} 
                color={themeMode === 'light' ? COLORS.white : COLORS.onSurfaceVariant} 
              />
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeText, { color: themeMode === 'light' ? COLORS.white : COLORS.onSurfaceVariant }]}>Clair</Text>
                <Text style={[styles.modeTextArabic, { color: themeMode === 'light' ? COLORS.white : COLORS.onSurfaceVariant }]}>مضيء</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeBtn,
                { backgroundColor: themeMode === 'dark' ? COLORS.primary : COLORS.surfaceVariant }
              ]}
              onPress={() => setTheme('dark')}
            >
              <MaterialIcons 
                name="dark-mode" 
                size={24} 
                color={themeMode === 'dark' ? COLORS.white : COLORS.onSurfaceVariant} 
              />
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeText, { color: themeMode === 'dark' ? COLORS.white : COLORS.onSurfaceVariant }]}>Sombre</Text>
                <Text style={[styles.modeTextArabic, { color: themeMode === 'dark' ? COLORS.white : COLORS.onSurfaceVariant }]}>مظلم</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeBtn,
                { backgroundColor: themeMode === 'system' ? COLORS.primary : COLORS.surfaceVariant }
              ]}
              onPress={() => setTheme('system')}
            >
              <MaterialIcons 
                name="settings-brightness" 
                size={24} 
                color={themeMode === 'system' ? COLORS.white : COLORS.onSurfaceVariant} 
              />
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeText, { color: themeMode === 'system' ? COLORS.white : COLORS.onSurfaceVariant }]}>Système</Text>
                <Text style={[styles.modeTextArabic, { color: themeMode === 'system' ? COLORS.white : COLORS.onSurfaceVariant }]}>النظام</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Language Settings */}
        <SettingSection 
          title="Langue d'affichage" 
          arabicTitle="لغة العرض" 
          color={COLORS.secondaryContainer || '#ffab69'}
          styles={styles}
        >
          <View style={[styles.languageCard, { backgroundColor: COLORS.surfaceVariant }]}>
            <TouchableOpacity 
              style={[
                styles.langBtn, 
                { backgroundColor: language === 'fr' ? COLORS.primaryLight : 'transparent' }
              ]}
              onPress={() => setLanguage('fr')}
            >
              <Text style={[styles.langBtnText, { color: language === 'fr' ? COLORS.white : COLORS.onSurfaceVariant }]}>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.langBtn, 
                { backgroundColor: language === 'ar' ? COLORS.primaryLight : 'transparent' }
              ]}
              onPress={() => setLanguage('ar')}
            >
              <Text style={[styles.langBtnText, { color: language === 'ar' ? COLORS.white : COLORS.onSurfaceVariant }]}>العربية</Text>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Maintenance & Diagnostics */}
        <SettingSection 
          title="Maintenance & Diagnostic" 
          arabicTitle="الصيانة والتشخيص" 
          color={COLORS.error || '#ea2b2b'}
          styles={styles}
        >
          <View style={styles.maintenanceCard}>
            <TouchableOpacity 
              style={[styles.maintenanceBtn, { borderColor: COLORS.outline }]}
              onPress={async () => {
                setIsDiagnosing(true);
                try {
                  const res = await diagnosticService.performFullCheck();
                  setLastResult(res);
                  Alert.alert(
                    res.status === 'ok' ? "Tout va bien !" : "Diagnostic terminé",
                    res.status === 'ok' 
                      ? "Aucun problème majeur détecté." 
                      : `Détecté : ${res.errors.length} erreur(s). Voir les recommandations.`
                  );
                } finally {
                  setIsDiagnosing(false);
                }
              }}
              disabled={isDiagnosing}
            >
              {isDiagnosing ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <MaterialIcons name="health-and-safety" size={24} color={COLORS.primary} />
              )}
              <Text style={[styles.maintenanceBtnText, { color: COLORS.onSurface }]}>Analyser l'application</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.maintenanceBtn, { borderColor: COLORS.outline }]}
              onPress={async () => {
                setIsSyncing(true);
                try {
                  const success = await syncCurriculum(user?.id, true);
                  Alert.alert(
                    success ? "Sync réussie" : "Sync partielle",
                    success ? "Toutes les données sont à jour." : "Certaines données n'ont pas pu être récupérées."
                  );
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <MaterialIcons name="sync" size={24} color={COLORS.primary} />
              )}
              <Text style={[styles.maintenanceBtnText, { color: COLORS.onSurface }]}>Forcer la synchronisation</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.maintenanceBtn, { borderColor: COLORS.outline }]}
              onPress={() => {
                Alert.alert(
                  "Réinitialisation",
                  "Voulez-vous vider le cache de synchronisation ? Cela forcera une mise à jour au prochain démarrage.",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "Vider", onPress: () => diagnosticService.emergencyCleanUp() }
                  ]
                );
              }}
            >
              <MaterialIcons name="sync-disabled" size={24} color={COLORS.gold} />
              <Text style={[styles.maintenanceBtnText, { color: COLORS.onSurface }]}>Vider le cache de sync</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.maintenanceBtn, { borderColor: COLORS.error, backgroundColor: COLORS.errorContainer + '20' }]}
              onPress={() => {
                Alert.alert(
                  "ZONE DANGEREUSE",
                  "Voulez-vous réinitialiser TOUTE la base de données locale ? Cette action est irréversible et supprimera votre progression non synchronisée.",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "RÉINITIALISER", style: "destructive", onPress: async () => {
                      await dbService.reset();
                      router.replace('/accueil');
                    }}
                  ]
                );
              }}
            >
              <MaterialIcons name="delete-forever" size={24} color={COLORS.error} />
              <Text style={[styles.maintenanceBtnText, { color: COLORS.error }]}>Réinitialiser la base de données</Text>
            </TouchableOpacity>

            {lastResult && (
              <View style={[styles.diagnosticSummary, { backgroundColor: COLORS.surfaceVariant }]}>
                <Text style={[styles.summaryTitle, { color: COLORS.onSurface }]}>Dernier résultat : {lastResult.status.toUpperCase()}</Text>
                {lastResult.recommendations.map((rec, i) => (
                  <Text key={i} style={[styles.summaryText, { color: COLORS.onSurfaceVariant }]}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>
        </SettingSection>

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.primary }]} activeOpacity={0.9}>
            <View style={styles.saveBtnContent}>
              <Text style={[styles.saveBtnText, { color: COLORS.white }]}>Enregistrer les modifications</Text>
              <Text style={[styles.saveBtnTextArabic, { color: COLORS.white }]}>حفظ التغييرات</Text>
            </View>
            <MaterialIcons name="save" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const getStyles = (COLORS: any, s: (v: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fdf9f3',
    zIndex: 40,
  },
  headerContent: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: s(18),
    fontWeight: '900',
    color: COLORS.onSurface,
    fontFamily: 'Plus Jakarta Sans',
    letterSpacing: -0.5,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 99,
  },
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 160,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  profileEditSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarCard: {
    width: 128,
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: COLORS.surfaceVariant,
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  pageTitle: {
    fontSize: s(24),
    fontWeight: '700',
    color: COLORS.onSurface,
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: s(16),
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: s(4),
    marginBottom: s(24),
  },
  inputCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  inputLabelArabic: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurface,
    opacity: 0.6,
  },
  input: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIndicator: {
    width: 40,
    height: 4,
    borderRadius: 99,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.onSurface,
  },
  sectionArabic: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.onSurface,
    opacity: 0.7,
    marginLeft: 8,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
  },
  modeTextContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  modeTextArabic: {
    fontSize: 10,
    opacity: 0.8,
    color: COLORS.onSurfaceVariant,
  },
  languageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  maintenanceCard: {
    gap: 12,
  },
  maintenanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  maintenanceBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diagnosticSummary: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 18,
  },
  saveContainer: {
    marginTop: 20,
  },
  saveBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  saveBtnContent: {
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  saveBtnTextArabic: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
});
