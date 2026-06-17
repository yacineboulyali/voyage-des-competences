import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
 ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';

import { supabase } from '../../lib/supabase';

const TEST_ACCOUNTS = [
  { name: 'Yassine', email: 'yassine.test@voyage-ista.ma' },
  { name: 'Fatima', email: 'fatima.test@voyage-ista.ma' },
  { name: 'Mehdi', email: 'mehdi.test@voyage-ista.ma' },
  { name: 'Démo', email: 'demo@voyage-ista.ma' },
];

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const { unlockCity, addXP } = useGameStore();
  
  const COLORS = THEME.light;

  const quickLogin = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('Test1234!');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // En vrai ici on récupérerait le profil depuis la table "profiles"
        // Pour le MVP on mocke les données de jeu
        console.log('Login success:', data.user.id);
        const isMehdi = data.user.email === 'mehdi.test@voyage-ista.ma';

        setUser({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || 'Utilisateur',
          xp: isMehdi ? 5000 : 0,
          level: isMehdi ? 10 : 1,
          badges: isMehdi ? ['mniqqa', 'tabraat', 'khmissa', 'taj_skills', 'sarout'] : [],
          created_at: new Date().toISOString(),
        });

        if (isMehdi) {
          // Débloquer toutes les villes pour Mehdi
          const allCities: any[] = ['casablanca', 'rabat', 'marrakech', 'fes', 'tanger', 'chefchaouen'];
          allCities.forEach(city => unlockCity(city));
          addXP(5000);
        }

        router.replace('/map');
      }
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surfaceVariant]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="account-circle" size={60} color={COLORS.gold} />
          </View>
          <Text style={styles.title}>Me connecter</Text>
          <Text style={styles.subtitle}>Ravis de vous revoir parmi nous !</Text>
        </View>

        <View style={styles.testAccounts}>
          <Text style={styles.testTitle}>COMPTES DE TEST (1-TAP)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testList}>
            {TEST_ACCOUNTS.map((acc) => (
              <TouchableOpacity 
                key={acc.email} 
                style={styles.testBadge}
                onPress={() => quickLogin(acc.email)}
              >
                <Text style={styles.testBadgeText}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={20} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={20} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Se connecter</Text>
                <MaterialIcons name="login" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerLinkText}>
              Vous n’avez pas de compte ? <Text style={styles.registerLinkBold}>S’inscrire</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.light.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.light.onSurfaceVariant,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.light.onSurface,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.light.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: THEME.light.onSurface,
  },
  loginButton: {
    backgroundColor: THEME.light.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    elevation: 4,
    shadowColor: THEME.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: THEME.light.white,
    fontSize: 18,
    fontWeight: '700',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  registerLinkText: {
    fontSize: 14,
    color: THEME.light.onSurfaceVariant,
  },
  registerLinkBold: {
    color: THEME.light.onSurface,
    fontWeight: '700',
  },
  testAccounts: {
    marginBottom: 32,
  },
  testTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.light.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  testList: {
    gap: 8,
    paddingRight: 20,
  },
  testBadge: {
    backgroundColor: 'rgba(44, 78, 62, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(44, 78, 62, 0.1)',
  },
  testBadgeText: {
    color: THEME.light.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },
});
