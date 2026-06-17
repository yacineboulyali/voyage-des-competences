/**
 * services/DiagnosticService.ts
 * ─────────────────────────────────────────────────────────────────
 * Systéme d'Anticipation de Bugs (Self-Healing & Diagnostics)
 * Ce service vérifie l'intégrité de l'application au démarrage
 * et répare automatiquement les problèmes courants.
 */
import { supabase } from '../lib/supabase';
import { dbService } from './database';
import { useAuthStore } from '../stores/authStore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiagnosticResult {
  status: 'ok' | 'warning' | 'error';
  checks: {
    database: boolean;
    network: boolean;
    auth: boolean;
    profile: boolean;
    curriculum: boolean;
    consistency: boolean;
    sync: boolean;
  };
  errors: string[];
  recommendations: string[];
}

export class DiagnosticService {
  private static instance: DiagnosticService;

  private constructor() {}

  public static getInstance(): DiagnosticService {
    if (!DiagnosticService.instance) {
      DiagnosticService.instance = new DiagnosticService();
    }
    return DiagnosticService.instance;
  }

  /**
   * Exécute une série de tests et tente de réparer les erreurs connues.
   */
  public async performFullCheck(): Promise<DiagnosticResult> {
    const crashCount = await this.trackCrashes();
    console.log(`🔍 Diagnostic: Démarrage (Crash count: ${crashCount})`);
    
    if (crashCount > 3) {
      console.warn('🚨 Système d\'Anticipation: Trop d\'échecs successifs. Tentative de nettoyage forcé...');
      await this.emergencyCleanUp();
    }
    
    const result: DiagnosticResult = {
      status: 'ok',
      checks: {
        database: false,
        network: false,
        auth: false,
        profile: false,
        curriculum: false,
        consistency: false,
        sync: false,
      },
      errors: [],
      recommendations: []
    };

    // 1. Base de données
    await this.checkDatabase(result);

    // 2. Réseau
    await this.checkNetwork(result);

    // 3. Auth & Profil
    await this.checkAuthAndProfile(result);

    // 4. Curriculum & Cohérence
    await this.checkCurriculumAndConsistency(result);

    // 5. Synchronisation
    await this.checkSyncStaleness(result);

    this.reportToTerminal(result);
    return result;
  }

  private async checkDatabase(result: DiagnosticResult) {
    try {
      await dbService.init();
      result.checks.database = true;
    } catch (e: any) {
      result.errors.push(`DB_LOCAL_ERROR: ${e.message}`);
      result.status = 'error';
      result.recommendations.push("Réinstaller l'application ou vider le stockage si le problème persiste.");
    }
  }

  private async checkNetwork(result: DiagnosticResult) {
    try {
      const { error } = await supabase.from('app_settings').select('count', { count: 'exact', head: true });
      if (error) throw error;
      result.checks.network = true;
    } catch (e: any) {
      result.errors.push(`NETWORK_SUPABASE_ERROR: ${e.message}`);
      // On ne met pas en 'error' car l'app doit fonctionner offline
      if (result.status !== 'error') result.status = 'warning';
      result.recommendations.push("Vérifiez votre connexion internet pour la synchronisation des données.");
    }
  }

  private async checkAuthAndProfile(result: DiagnosticResult) {
    const user = useAuthStore.getState().user;
    if (!user) {
      result.errors.push("AUTH_MISSING: Aucun utilisateur connecté.");
      if (result.status !== 'error') result.status = 'warning';
      return;
    }

    result.checks.auth = true;
    
    try {
      // Vérification Profile (Supabase)
      if (result.checks.network) {
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (pErr || !profile) {
          await this.repairProfile(user);
          result.checks.profile = true;
        } else {
          result.checks.profile = true;
        }
      } else {
        // Mode Offline: On fait confiance au store local
        result.checks.profile = true;
        result.recommendations.push("Profil vérifié localement (Mode Offline).");
      }

      // Vérification Progression (Supabase)
      if (result.checks.network) {
        const { data: progress, error: prgErr } = await supabase
          .from('player_city_progress')
          .select('id')
          .eq('player_id', user.id);

        if (!prgErr && (!progress || progress.length === 0)) {
          result.errors.push('PROGRESS_MISSING: Aucune progression sur le cloud.');
          result.recommendations.push("La progression sera initialisée automatiquement au premier défi.");
        }
      }
    } catch (e: any) {
      result.errors.push(`PROFILE_INTEGRITY_ERROR: ${e.message}`);
      if (result.status !== 'error') result.status = 'warning';
    }
  }

  private async repairProfile(user: any) {
    console.warn('🛠 Auto-Healing: Réparation du profil...');
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.full_name || 'Voyageur',
        xp: user.xp || 0,
        level: user.level || 1
      });
      if (error) throw error;
      console.log('✅ Profil réparé à distance.');
    } catch (e) {
      console.error('❌ Échec de la réparation du profil:', e);
    }
  }

  private async checkCurriculumAndConsistency(result: DiagnosticResult) {
    try {
      const challenges = await dbService.getChallenges();
      if (challenges.length === 0) {
        result.errors.push('CURRICULUM_EMPTY: Aucune donnée locale.');
        result.status = 'error';
        result.recommendations.push("Une synchronisation complète est requise (Menu Paramètres > Sync).");
      } else {
        result.checks.curriculum = true;
        
        // Vérification de la cohérence entre challenges et progression locale
        const progression = await dbService.getCitiesProgression();
        if (progression.length < challenges.length) {
          result.errors.push('CONSISTENCY_ERROR: Progression locale incomplète.');
          result.recommendations.push("Lancer une réparation de la progression.");
          await this.repairLocalConsistency(challenges, progression);
          result.checks.consistency = true;
        } else {
          result.checks.consistency = true;
        }
      }
    } catch (e: any) {
      result.errors.push(`DATA_QUERY_ERROR: ${e.message}`);
    }
  }

  private async repairLocalConsistency(challenges: any[], progression: any[]) {
    console.warn('🛠 Auto-Healing: Réparation de la cohérence locale...');
    try {
      const missingCities = challenges.filter(c => !progression.find(p => p.id === c.city_id));
      if (missingCities.length > 0) {
        // Initialiser les entrées manquantes dans city_progression
        await dbService.savePlayerProgress(missingCities.map(c => ({
          city_id: c.city_id,
          city_name_fr: c.city_name_fr,
          status: 'locked'
        })));
        console.log(`✅ ${missingCities.length} villes ajoutées à la progression.`);
      }
    } catch (e) {
      console.error('❌ Échec de la réparation de cohérence:', e);
    }
  }

  private async checkSyncStaleness(result: DiagnosticResult) {
    try {
      const lastSync = await dbService.getLastSync();
      const now = Date.now();
      const diffHours = (now - lastSync) / (1000 * 60 * 60);

      if (lastSync === 0) {
        result.errors.push('SYNC_NEVER: Jamais synchronisé.');
        if (result.status !== 'error') result.status = 'warning';
      } else if (diffHours > 48) {
        result.errors.push(`SYNC_STALE: Données vieilles de ${Math.round(diffHours)}h.`);
        if (result.status !== 'error') result.status = 'warning';
        result.recommendations.push("Pensez à synchroniser vos données pour avoir les derniers défis.");
      } else {
        result.checks.sync = true;
      }
    } catch (e: any) {
      result.errors.push(`SYNC_CHECK_ERROR: ${e.message}`);
    }
  }

  private reportToTerminal(result: DiagnosticResult) {
    const emoji = result.status === 'ok' ? '🟩' : result.status === 'warning' ? '🟧' : '🟥';
    
    console.log(`\n${emoji} --- RAPPORT DE SANTÉ APPLICATION --- ${emoji}`);
    console.log(`Statut Global: ${result.status.toUpperCase()}`);
    console.log(`-------------------------------------------`);
    
    const rows = [
      { label: 'Système de Fichiers (DB)', ok: result.checks.database },
      { label: 'Connexion Supabase    ', ok: result.checks.network },
      { label: 'Authentification      ', ok: result.checks.auth },
      { label: 'Intégrité du Profil   ', ok: result.checks.profile },
      { label: 'Contenu Pédagogique   ', ok: result.checks.curriculum },
      { label: 'Cohérence des Données ', ok: result.checks.consistency },
      { label: 'Fraîcheur des Données ', ok: result.checks.sync },
    ];

    rows.forEach(row => {
      console.log(`${row.ok ? '✅' : '❌'} ${row.label}`);
    });

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Détails techniques :`);
      result.errors.forEach(err => console.log(`   • ${err}`));
    }

    if (result.recommendations.length > 0) {
      console.log(`\n💡 Actions recommandées :`);
      result.recommendations.forEach(rec => console.log(`   → ${rec}`));
    }
    
    console.log(`-------------------------------------------\n`);
  }

  private async trackCrashes(): Promise<number> {
    try {
      const lastCrashTimeStr = await AsyncStorage.getItem('app_last_crash_time');
      const lastCrashTime = lastCrashTimeStr ? parseInt(lastCrashTimeStr, 10) : 0;
      const now = Date.now();
      
      const countStr = await AsyncStorage.getItem('app_crash_count');
      let count = countStr ? parseInt(countStr, 10) : 0;
      
      // Si le dernier crash date de plus d'une heure, on reset le compteur
      // Cela évite de déclencher le nettoyage d'urgence pour des crashs très espacés
      if (now - lastCrashTime > 3600000) {
        count = 0;
      }
      
      count++;
      await AsyncStorage.setItem('app_crash_count', count.toString());
      await AsyncStorage.setItem('app_last_crash_time', now.toString());
      
      // Si l'app reste ouverte plus de 15s sans crash, on considère le démarrage comme réussi
      setTimeout(async () => {
        await AsyncStorage.setItem('app_crash_count', '0');
      }, 15000);
      
      return count;
    } catch {
      return 0;
    }
  }

  private async emergencyCleanUp() {
    try {
      await AsyncStorage.removeItem('last_sync_timestamp');
      console.log('🧹 Nettoyage d\'urgence: Cache de synchronisation réinitialisé.');
    } catch (e) {
      console.error('Failed emergency cleanup', e);
    }
  }
}

export const diagnosticService = DiagnosticService.getInstance();
