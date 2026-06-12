import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  region TEXT NOT NULL,
  fifa_rank INTEGER,
  flag TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,            -- official FIFA match number 1..104
  stage TEXT NOT NULL,               -- group | r32 | r16 | qf | sf | third | final
  group_name TEXT,
  kickoff_utc TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  home_label TEXT,
  away_label TEXT,
  home_goals INTEGER,
  away_goals INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled'  -- scheduled | finished
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  match_id INTEGER NOT NULL REFERENCES matches(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),  -- the favored team
  spread REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (room_id, match_id)
);

CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL REFERENCES lines(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  side TEXT NOT NULL CHECK (side IN ('cover','against')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (line_id, user_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL REFERENCES lines(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  delta INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('win','loss','push')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (line_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches (kickoff_utc);
CREATE INDEX IF NOT EXISTS idx_lines_match ON lines (match_id);
CREATE INDEX IF NOT EXISTS idx_settlements_user ON settlements (user_id);
`;

interface FixtureTeam {
  code: string;
  name: string;
  group: string;
  region: string;
  rank: number;
  flag: string;
}

interface FixtureMatch {
  n: number;
  stage: string;
  group?: string;
  kickoff: string;
  home?: string;
  away?: string;
  homeLabel?: string;
  awayLabel?: string;
  venue: string;
  city: string;
  score?: [number, number];
}

function createDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "wcbet.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seed(db);
  return db;
}

function seed(db: Database.Database) {
  const teamCount = db.prepare("SELECT COUNT(*) AS c FROM teams").get() as { c: number };
  if (teamCount.c > 0) return;

  const fixturePath = path.join(process.cwd(), "data", "worldcup2026.json");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as {
    teams: FixtureTeam[];
    matches: FixtureMatch[];
  };

  const insertTeam = db.prepare(
    "INSERT INTO teams (code, name, group_name, region, fifa_rank, flag) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertMatch = db.prepare(
    `INSERT INTO matches (id, stage, group_name, kickoff_utc, venue, city,
       home_team_id, away_team_id, home_label, away_label, home_goals, away_goals, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    const idByCode = new Map<string, number>();
    for (const t of fixture.teams) {
      const res = insertTeam.run(t.code, t.name, t.group, t.region, t.rank, t.flag);
      idByCode.set(t.code, Number(res.lastInsertRowid));
    }
    for (const m of fixture.matches) {
      insertMatch.run(
        m.n,
        m.stage,
        m.group ?? null,
        m.kickoff,
        m.venue,
        m.city,
        m.home ? idByCode.get(m.home) : null,
        m.away ? idByCode.get(m.away) : null,
        m.homeLabel ?? null,
        m.awayLabel ?? null,
        m.score ? m.score[0] : null,
        m.score ? m.score[1] : null,
        m.score ? "finished" : "scheduled",
      );
    }
  })();
}

const globalForDb = globalThis as unknown as { __wcbetDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__wcbetDb) {
    globalForDb.__wcbetDb = createDb();
  }
  return globalForDb.__wcbetDb;
}
