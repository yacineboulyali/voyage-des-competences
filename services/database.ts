import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'voyage_competences.db';

function sanitizeArgs(args: any[]): any[] {
  return args.map(arg => arg === undefined ? null : arg);
}

export interface UserStats {
  id: number;
  username: string;
  xp: number;
  level: number;
  badges_count: number;
  show_dev_nav: number; // 0 or 1
}

export interface CityProgression {
  id: string;
  name: string;
  unlocked: number; // 0 or 1
  completed: number; // 0 or 1
  score: number;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private writeQueue: Promise<any> = Promise.resolve();

  /**
   * Serializes all write operations to prevent concurrent transaction errors
   */
  private async enqueueWrite<T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const previousTask = this.writeQueue;
    let resolveTask: (value: T) => void;
    let rejectTask: (reason?: any) => void;

    this.writeQueue = new Promise((resolve, reject) => {
      resolveTask = resolve;
      rejectTask = reject;
    });

    try {
      await previousTask;
      const db = await this.ensureDb();
      const result = await task(db);
      resolveTask!(result);
      return result;
    } catch (error) {
      rejectTask!(error);
      throw error;
    }
  }

  /**
   * Helper to execute a function within a transaction with safe error handling
   */
  private async runInTransaction<T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const db = await this.ensureDb();
    return await this.enqueueWrite(async () => {
      try {
        return await db.withTransactionAsync(async () => {
          return await task(db);
        });
      } catch (error) {
        console.error("Transaction Error:", error);
        throw error;
      }
    });
  }

  async init() {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log("📂 Opening database...");
        this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        
        // ─── Enqueue the setup tasks ──────────────────────────────────
        await this.enqueueWrite(async (db) => {
          // ─── Enable Foreign Keys ──────────────────────────────────────
          await db.execAsync('PRAGMA foreign_keys = ON;');

          // ─── Base Tables & Migrations Tracker ─────────────────────────
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS _migrations (
              id INTEGER PRIMARY KEY NOT NULL,
              name TEXT UNIQUE NOT NULL,
              applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_stats (
              id INTEGER PRIMARY KEY NOT NULL,
              username TEXT DEFAULT 'Ahmed_AlMaghribi',
              xp INTEGER DEFAULT 0,
              level INTEGER DEFAULT 1,
              badges_count INTEGER DEFAULT 0,
              show_dev_nav INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS city_progression (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              unlocked INTEGER DEFAULT 0,
              completed INTEGER DEFAULT 0,
              score INTEGER DEFAULT 0
            );
          `);

          // ─── Migration Engine ─────────────────────────────────────────
          await this.applyMigrations();

          // ─── Seed Initial Data ────────────────────────────────────────
          await this.seedInitialData();
          console.log("✅ Database initialized and seeded.");
        });

      } catch (error) {
        console.error("❌ Database initialization error:", error);
        this.db = null; // Reset so next attempt can retry
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async applyMigrations() {
    if (!this.db) return;

    const migrations = [
      {
        name: 'create_challenges_v1',
        sql: `CREATE TABLE IF NOT EXISTS challenges (
          id TEXT PRIMARY KEY NOT NULL,
          city_id TEXT NOT NULL,
          city_name_fr TEXT NOT NULL,
          city_name_ar TEXT,
          city_color TEXT,
          headline_fr TEXT,
          headline_ar TEXT,
          description_fr TEXT,
          description_ar TEXT,
          focus_fr TEXT,
          step_label TEXT,
          progress REAL,
          illustration_url TEXT,
          sort_order INTEGER,
          is_published INTEGER,
          missions_title_fr TEXT,
          missions_title_ar TEXT,
          icon_name TEXT,
          acte_title TEXT,
          learning_outcomes TEXT
        );`
      },
      {
        name: 'create_missions_v1',
        sql: `CREATE TABLE IF NOT EXISTS missions (
          id TEXT PRIMARY KEY NOT NULL,
          challenge_id TEXT,
          city_id TEXT,
          title_fr TEXT NOT NULL,
          title_ar TEXT,
          description_fr TEXT,
          description_ar TEXT,
          mission_type TEXT,
          xp_reward INTEGER,
          sort_order INTEGER,
          is_published INTEGER,
          narration TEXT,
          profils TEXT,
          metadata TEXT,
          soft_skill_dominant TEXT,
          bloom_level INTEGER
        );`
      },
      {
        name: 'create_questions_v1',
        sql: `CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY NOT NULL,
          mission_id TEXT,
          question_fr TEXT NOT NULL,
          question_ar TEXT,
          title_fr TEXT,
          title_ar TEXT,
          question_type TEXT,
          options TEXT,
          correct_answer TEXT,
          score_decision INTEGER,
          score_equipe INTEGER,
          score_stress INTEGER,
          xp_reward INTEGER,
          time_limit_sec INTEGER,
          sort_order INTEGER,
          hint_fr TEXT,
          hint_ar TEXT,
          explanation_fr TEXT,
          explanation_ar TEXT,
          is_published INTEGER,
          soft_skills_impact TEXT,
          context_dialogue TEXT,
          presentation_fr TEXT,
          presentation_ar TEXT,
          audio_url TEXT,
          character_id TEXT,
          feedback_positive_fr TEXT,
          feedback_positive_ar TEXT,
          feedback_negative_fr TEXT,
          feedback_negative_ar TEXT
        );`
      },
      {
        name: 'create_app_settings_v1',
        sql: `CREATE TABLE IF NOT EXISTS app_settings (
          id TEXT PRIMARY KEY NOT NULL,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          description TEXT,
          updated_at TEXT
        );`
      },
      {
        name: 'update_city_progression_v2',
        sql: `ALTER TABLE city_progression ADD COLUMN missions_completed INTEGER DEFAULT 0;
              ALTER TABLE city_progression ADD COLUMN missions_total INTEGER DEFAULT 5;
              ALTER TABLE city_progression ADD COLUMN status TEXT DEFAULT 'locked';`
      }
    ];

    for (const m of migrations) {
      const exists = await this.db.getFirstAsync<{id: number}>('SELECT id FROM _migrations WHERE name = ?', [m.name]);
      if (!exists) {
        console.log(`🛠 Applying migration: ${m.name}`);
        try {
          await this.db.execAsync(m.sql);
          await this.db.runAsync('INSERT INTO _migrations (name) VALUES (?)', [m.name]);
        } catch (e) {
          console.error(`❌ Migration ${m.name} failed:`, e);
          // Non-critical migrations can continue, but better to stop if schema is broken
        }
      }
    }
  }

  private async seedInitialData() {
    if (!this.db) return;
    
    // Initialize default user
    const user = await this.getUserStats();
    if (!user) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO user_stats (id, username, xp, level, badges_count) VALUES (1, ?, ?, ?, ?)',
        ['Ahmed_AlMaghribi', 0, 1, 0]
      );
    }

    // Initialize cities
    const citiesCount = await this.db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM city_progression');
    if (citiesCount?.count === 0) {
      const defaultCities = [
        ['rabat', 'Rabat', 1, 0, 0],
        ['chefchaouen', 'Chefchaouen', 0, 0, 0],
        ['fes', 'Fès', 0, 0, 0],
        ['marrakech', 'Marrakech', 0, 0, 0],
        ['laayoune', 'Laâyoune', 0, 0, 0],
        ['dakhla', 'Dakhla', 0, 0, 0]
      ];
      
      for (const city of defaultCities) {
        await this.db.runAsync(
          'INSERT OR IGNORE INTO city_progression (id, name, unlocked, completed, score) VALUES (?, ?, ?, ?, ?)',
          city
        );
      }
    }
  }

  // ─── HELPERS ──────────────────────────────────────────────────────

  private async ensureDb() {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  private safeParse(json: string | null, fallback: any = null): any {
    if (!json) return fallback;
    try {
      return JSON.parse(json);
    } catch (e) {
      console.warn("JSON Parse Error:", e, "Content:", json);
      return fallback;
    }
  }

  // ─── USER STATS ───────────────────────────────────────────────────

  async getUserStats(): Promise<UserStats | null> {
    try {
      const db = await this.ensureDb();
      return await db.getFirstAsync<UserStats>('SELECT * FROM user_stats WHERE id = 1');
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return null;
    }
  }

  async updateUserXP(xpToAdd: number) {
    return await this.enqueueWrite(async (db) => {
      const current = await this.getUserStats();
      if (current) {
        const newXp = current.xp + xpToAdd;
        const newLevel = Math.floor(newXp / 1000) + 1;
        await db.runAsync(
          'UPDATE user_stats SET xp = ?, level = ? WHERE id = 1',
          [newXp, newLevel]
        );
      }
    });
  }

  // ─── PROGRESSION ──────────────────────────────────────────────────

  async getCitiesProgression(): Promise<CityProgression[]> {
    if (!this.db) await this.init();
    try {
      return await this.db!.getAllAsync<CityProgression>('SELECT * FROM city_progression');
    } catch (error) {
      console.error("Error fetching cities progression:", error);
      return [];
    }
  }

  async unlockCity(cityId: string) {
    return await this.enqueueWrite(async (db) => {
      await db.runAsync(
        'UPDATE city_progression SET unlocked = 1 WHERE id = ?',
        [cityId]
      );
    });
  }

  async completeCity(cityId: string, score: number) {
    return await this.enqueueWrite(async (db) => {
      await db.runAsync(
        'UPDATE city_progression SET completed = 1, score = ?, status = "done" WHERE id = ?',
        [score, cityId]
      );
    });
  }

  async savePlayerProgress(progress: any[]) {
    return await this.runInTransaction(async (db) => {
      for (const p of progress) {
        await db.runAsync(
          `INSERT OR REPLACE INTO city_progression (id, name, unlocked, completed, score, missions_completed, missions_total, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.city_id, 
            p.city_name_fr || p.city_id, 
            p.status !== 'locked' ? 1 : 0, 
            p.status === 'done' ? 1 : 0, 
            p.xp_earned || 0,
            p.missions_completed || 0,
            p.missions_total || 5,
            p.status
          ]
        );
      }
    });
  }

  async updateLocalCityProgress(cityId: string, missionsCompleted: number, status: string) {
    return await this.enqueueWrite(async (db) => {
      await db.runAsync(
        'UPDATE city_progression SET missions_completed = ?, status = ? WHERE id = ?',
        [missionsCompleted, status, cityId]
      );
    });
  }

  // ─── CHALLENGES ───────────────────────────────────────────────────

  async saveChallenges(challenges: any[]) {
    return await this.runInTransaction(async (db) => {
      await db.runAsync('DELETE FROM challenges');
      for (const c of challenges) {
        const args = [
          c.id, c.city_id, c.city_name_fr, c.city_name_ar, c.city_color, 
          c.headline_fr, c.headline_ar, c.description_fr, c.description_ar, 
          c.focus_fr, c.step_label, c.progress, c.illustration_url, 
          c.sort_order, c.is_published ? 1 : 0, c.missions_title_fr, 
          c.missions_title_ar, c.icon_name || null, c.acte_title || null,
          c.learning_outcomes ? JSON.stringify(c.learning_outcomes) : null
        ];
        await db.runAsync(
          `INSERT OR REPLACE INTO challenges (
            id, city_id, city_name_fr, city_name_ar, city_color, 
            headline_fr, headline_ar, description_fr, description_ar, 
            focus_fr, step_label, progress, illustration_url, sort_order, 
            is_published, missions_title_fr, missions_title_ar, icon_name,
            acte_title, learning_outcomes
          ) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          sanitizeArgs(args)
        );
      }
    });
  }

  async getChallenges(): Promise<any[]> {
    try {
      const db = await this.ensureDb();
      const rows = await db.getAllAsync('SELECT * FROM challenges ORDER BY sort_order');
      return rows.map((r: any) => ({
        ...r,
        learning_outcomes: this.safeParse(r.learning_outcomes)
      }));
    } catch (error) {
      console.error("Error fetching challenges:", error);
      return [];
    }
  }

  // ─── MISSIONS ─────────────────────────────────────────────────────

  async saveMissions(missions: any[]) {
    return await this.runInTransaction(async (db) => {
      await db.runAsync('DELETE FROM missions');
      for (const m of missions) {
        const args = [
          m.id, m.challenge_id, m.city_id, m.title_fr, m.title_ar, 
          m.description_fr, m.description_ar, m.mission_type, m.xp_reward, 
          m.sort_order, m.is_published ? 1 : 0, 
          m.narration ? JSON.stringify(m.narration) : null, 
          m.profils ? JSON.stringify(m.profils) : null, 
          m.metadata ? JSON.stringify(m.metadata) : null,
          m.soft_skill_dominant || null, m.bloom_level || null
        ];
        await db.runAsync(
          `INSERT OR REPLACE INTO missions (
            id, challenge_id, city_id, title_fr, title_ar, description_fr, 
            description_ar, mission_type, xp_reward, sort_order, is_published, 
            narration, profils, metadata, soft_skill_dominant, bloom_level
          ) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          sanitizeArgs(args)
        );
      }
    });
  }

  async getMissionsByCity(cityId: string): Promise<any[]> {
    try {
      const db = await this.ensureDb();
      const rows = await db.getAllAsync('SELECT * FROM missions WHERE city_id = ? ORDER BY sort_order', [cityId]);
      return rows.map((r: any) => ({
        ...r,
        is_published: r.is_published === 1,
        narration: this.safeParse(r.narration),
        profils: this.safeParse(r.profils),
        metadata: this.safeParse(r.metadata),
        soft_skill_dominant: r.soft_skill_dominant,
        bloom_level: r.bloom_level,
      }));
    } catch (error) {
      console.error(`Error fetching missions for city ${cityId}:`, error);
      return [];
    }
  }

  // ─── QUESTIONS ────────────────────────────────────────────────────

  async saveQuestions(questions: any[]) {
    return await this.runInTransaction(async (db) => {
      await db.runAsync('DELETE FROM questions');
      for (const q of questions) {
        const args = [
          q.id, q.mission_id, q.question_fr, q.question_ar, q.title_fr || null, q.title_ar || null, 
          q.question_type, q.options ? JSON.stringify(q.options) : null, q.correct_answer ?? null, q.score_decision, 
          q.score_equipe, q.score_stress, q.xp_reward, q.time_limit_sec, q.sort_order, 
          q.hint_fr, q.hint_ar, q.explanation_fr, q.explanation_ar, q.is_published ? 1 : 0, 
          q.soft_skills_impact ? JSON.stringify(q.soft_skills_impact) : null, q.context_dialogue ? JSON.stringify(q.context_dialogue) : null,
          q.presentation_fr, q.presentation_ar, q.audio_url, q.character_id,
          q.feedback_positive_fr, q.feedback_positive_ar, q.feedback_negative_fr, q.feedback_negative_ar
        ];
        await db.runAsync(
          `INSERT OR REPLACE INTO questions (
            id, mission_id, question_fr, question_ar, title_fr, title_ar, question_type, options, 
            correct_answer, score_decision, score_equipe, score_stress, xp_reward, time_limit_sec, 
            sort_order, hint_fr, hint_ar, explanation_fr, explanation_ar, is_published, 
            soft_skills_impact, context_dialogue, presentation_fr, presentation_ar, audio_url, 
            character_id, feedback_positive_fr, feedback_positive_ar, feedback_negative_fr, feedback_negative_ar
          ) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          sanitizeArgs(args)
        );
      }
    });
  }

  async getQuestionsByMission(missionId: string): Promise<any[]> {
    try {
      const db = await this.ensureDb();
      const rows = await db.getAllAsync('SELECT * FROM questions WHERE mission_id = ? ORDER BY sort_order', [missionId]);
      return rows.map((r: any) => ({
        ...r,
        is_published: r.is_published === 1,
        options: this.safeParse(r.options, []),
        soft_skills_impact: this.safeParse(r.soft_skills_impact, {}),
        context_dialogue: this.safeParse(r.context_dialogue),
      }));
    } catch (error) {
      console.error(`Error fetching questions for mission ${missionId}:`, error);
      return [];
    }
  }

  // ─── APP SETTINGS ────────────────────────────────────────────────

  async saveAppSettings(settings: any[]) {
    return await this.runInTransaction(async (db) => {
      await db.runAsync('DELETE FROM app_settings');
      for (const s of settings) {
        const args = [s.id, s.key, s.value ? JSON.stringify(s.value) : null, s.description, s.updated_at];
        await db.runAsync(
          `INSERT OR REPLACE INTO app_settings (id, key, value, description, updated_at) 
           VALUES (?, ?, ?, ?, ?)`,
          sanitizeArgs(args)
        );
      }
    });
  }

  async getSetting(key: string): Promise<any> {
    try {
      const db = await this.ensureDb();
      const row = await db.getFirstAsync<{value: string}>('SELECT value FROM app_settings WHERE key = ?', [key]);
      return row ? this.safeParse(row.value) : null;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  }

  // ─── SYNC HELPERS ────────────────────────────────────────────────
  
  async getLastSync(): Promise<number> {
    const val = await this.getSetting('last_sync_timestamp');
    return val ? parseInt(val) : 0;
  }

  async setLastSync(timestamp: number) {
    return await this.enqueueWrite(async (db) => {
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)',
        ['last_sync', 'last_sync_timestamp', timestamp.toString(), new Date().toISOString()]
      );
    });
  }

  /**
   * EMERGENCY: Deletes and recreates the entire database.
   * Use only when everything else fails.
   */
  async reset() {
    return await this.enqueueWrite(async (db) => {
      console.warn("🚨 EMERGENCY: Resetting database...");
      await db.execAsync(`
        DROP TABLE IF EXISTS _migrations;
        DROP TABLE IF EXISTS user_stats;
        DROP TABLE IF EXISTS city_progression;
        DROP TABLE IF EXISTS challenges;
        DROP TABLE IF EXISTS missions;
        DROP TABLE IF EXISTS questions;
        DROP TABLE IF EXISTS app_settings;
      `);
      this.db = null;
      await this.init();
    });
  }
}

export const dbService = new DatabaseService();
