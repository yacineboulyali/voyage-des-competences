/**
 * services/sync.ts
 * ─────────────────────────────────────────────────────────────────
 * Sync service: fetches data from Supabase and populates the
 * local SQLite database for offline-first support.
 */
import { supabase } from '../lib/supabase';
import { dbService } from './database';

export async function syncChallenges() {
  const { data: challenges, error: cErr } = await supabase
    .from('challenges')
    .select('*')
    .order('sort_order');
  
  if (cErr) throw cErr;
  if (challenges) {
    await dbService.saveChallenges(challenges);
    console.log(`✅ ${challenges.length} challenges synced.`);
  }
  return challenges;
}

export async function syncMissions() {
  const { data: missions, error: mErr } = await supabase
    .from('missions')
    .select('*')
    .order('sort_order');
  
  if (mErr) throw mErr;
  if (missions) {
    await dbService.saveMissions(missions);
    console.log(`✅ ${missions.length} missions synced.`);
  }
  return missions;
}

export async function syncQuestions() {
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .order('sort_order');
  
  if (qErr) throw qErr;
  if (questions) {
    await dbService.saveQuestions(questions);
    console.log(`✅ ${questions.length} questions synced.`);
  }
  return questions;
}

export async function syncAppSettings() {
  const { data: settings, error: sErr } = await supabase
    .from('app_settings')
    .select('*');
  
  if (sErr) throw sErr;
  if (settings) {
    await dbService.saveAppSettings(settings);
    console.log(`✅ ${settings.length} app settings synced.`);
  }
  return settings;
}

export async function syncPlayerProgress(userId: string) {
  const { data: progress, error: pErr } = await supabase
    .from('player_city_progress')
    .select('*')
    .eq('player_id', userId);
  
  if (pErr) throw pErr;
  if (progress) {
    await dbService.savePlayerProgress(progress);
    console.log(`✅ ${progress.length} player city progress synced.`);
  }
  return progress;
}

/** 
 * Main curriculum sync entry point.
 * Populates SQLite with challenges, missions, and questions.
 * Handles each step independently to allow partial success.
 */
export async function syncCurriculum(userId?: string, force: boolean = false) {
  console.log('🔄 Checking curriculum sync status...');
  
  // Anti-flooding: Only sync once every 10 minutes unless forced
  const lastSync = await dbService.getLastSync();
  const now = Date.now();
  if (!force && now - lastSync < 10 * 60 * 1000) {
    console.log('⏳ Sync skipped: recently updated.');
    return true;
  }

  const stats = {
    settings: false,
    challenges: false,
    missions: false,
    questions: false,
    playerProgress: false
  };

  // 1. Sync App Settings
  try {
    await syncAppSettings();
    stats.settings = true;
  } catch (e) {
    console.error('⚠️ App Settings sync failed:', e);
  }

  // 2. Sync Challenges
  try {
    await syncChallenges();
    stats.challenges = true;
  } catch (e) {
    console.error('⚠️ Challenges sync failed:', e);
  }

  // 3. Sync Missions
  try {
    await syncMissions();
    stats.missions = true;
  } catch (e) {
    console.error('⚠️ Missions sync failed:', e);
  }

  // 4. Sync Questions
  try {
    await syncQuestions();
    stats.questions = true;
  } catch (e) {
    console.error('⚠️ Questions sync failed:', e);
  }

  // 5. Sync Player Progress (if userId provided)
  if (userId) {
    try {
      await syncPlayerProgress(userId);
      stats.playerProgress = true;
    } catch (e) {
      console.error('⚠️ Player Progress sync failed:', e);
    }
  }

  const successCount = Object.values(stats).filter(v => v).length;
  const totalSteps = userId ? 5 : 4;
  const isComplete = successCount === totalSteps;

  if (isComplete) {
    console.log('🎉 Curriculum sync complete!');
    await dbService.setLastSync(now);
  } else if (successCount > 0) {
    console.warn(`🌗 Curriculum sync partially complete (${successCount}/${totalSteps}).`);
    // Still update timestamp if we got some data to avoid infinite retries on small errors
    await dbService.setLastSync(now);
  } else {
    console.error('❌ Curriculum sync failed completely.');
  }

  return isComplete;
}

/** Placeholder for fullSync if referenced elsewhere */
export const fullSync = syncCurriculum;
