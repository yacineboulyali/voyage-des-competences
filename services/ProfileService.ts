import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { UserProfile, SkillScore } from '../types';

export const ProfileService = {
  /**
   * Récupère le profil complet de l'utilisateur depuis Supabase
   */
  async fetchFullProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log(`🔄 Récupération du profil pour: ${userId}`);

      // 1. Infos de base
      const { data: profile, error: pErr } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (pErr) throw pErr;

      // 2. Scores de compétences (Radar)
      const { data: skills, error: sErr } = await supabase
        .from('player_skill_scores')
        .select('*')
        .eq('player_id', userId);

      if (sErr) {
        console.warn('⚠️ Impossible de récupérer les skills:', sErr.message);
      }

      // 3. Badges
      const { data: badges, error: bErr } = await supabase
        .from('player_earned_badges')
        .select('badge_id')
        .eq('player_id', userId);

      if (bErr) {
        console.warn('⚠️ Impossible de récupérer les badges:', bErr.message);
      }

      const fullProfile: UserProfile = {
        id: profile.id,
        full_name: profile.display_name || 'Voyageur',
        display_name: profile.display_name,
        avatar_id: profile.avatar_id,
        xp: profile.xp || 0,
        level: profile.level || 1,
        badges: badges?.map(b => b.badge_id) || [],
        skills: skills as SkillScore[] || [],
        created_at: profile.created_at,
      };

      // Mettre à jour le store local
      useAuthStore.getState().setUser(fullProfile);

      return fullProfile;
    } catch (error) {
      console.error('❌ Erreur ProfileService:', error);
      return null;
    }
  },

  /**
   * Met à jour l'XP et le niveau (exemple de synchronisation montante)
   */
  async addXP(userId: string, amount: number) {
    const current = useAuthStore.getState().user;
    if (!current) return;

    const newXP = (current.xp || 0) + amount;
    // Logique simple de montée de niveau : 1000 XP par niveau
    const newLevel = Math.floor(newXP / 1000) + 1;

    const { error } = await supabase
      .from('player_profiles')
      .update({ xp: newXP, level: newLevel, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (!error) {
      useAuthStore.getState().updateProfile({ xp: newXP, level: newLevel });
    }
  }
};
