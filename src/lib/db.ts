import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import type { PlanId, BillingPeriod } from "./subscription";
import { currentPeriodKey, planQuota } from "./subscription";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: PlanId;
  billing_period: BillingPeriod | null;
  status: "active" | "canceled";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface QueryJobRow {
  id: string;
  user_id: string;
  phone_number: string;
  status: JobStatus;
  external_job_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueryResultRow {
  id: string;
  job_id: string;
  platform: string;
  platform_key: string;
  is_marked: number;
  mark_type: string | null;
  mark_label: string | null;
  appeal_url: string | null;
  raw_json: string | null;
  created_at: string;
}

export interface UsageRow {
  user_id: string;
  period_key: string;
  query_count: number;
}

let db: Database.Database | null = null;

function dbPath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath) return envPath;
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "app.db");
}

export function getDb(): Database.Database {
  if (db) return db;
  db = new Database(dbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  seedDemo(db);
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL DEFAULT 'free',
      billing_period TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_quota (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_key TEXT NOT NULL,
      query_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS query_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      external_job_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS query_results (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES query_jobs(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      platform_key TEXT NOT NULL,
      is_marked INTEGER NOT NULL DEFAULT 0,
      mark_type TEXT,
      mark_label TEXT,
      appeal_url TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_query_jobs_user ON query_jobs(user_id, created_at DESC);
  `);
}

function seedDemo(database: Database.Database) {
  const row = database
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("demo@example.com") as { id: string } | undefined;
  if (row) return;

  const userId = uuidv4();
  const hash = bcrypt.hashSync("demo123456", 10);
  database
    .prepare(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    )
    .run(userId, "demo@example.com", hash);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  database
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, billing_period, status, current_period_start, current_period_end)
       VALUES (?, ?, 'free', NULL, 'active', ?, ?)`,
    )
    .run(
      uuidv4(),
      userId,
      now.toISOString(),
      periodEnd.toISOString(),
    );
}

export function createUser(email: string, passwordHash: string): UserRow {
  const id = uuidv4();
  const database = getDb();
  database
    .prepare(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    )
    .run(id, email.toLowerCase(), passwordHash);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  database
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, billing_period, status, current_period_start, current_period_end)
       VALUES (?, ?, 'free', NULL, 'active', ?, ?)`,
    )
    .run(uuidv4(), id, now.toISOString(), periodEnd.toISOString());

  return database
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
}

export function getSubscription(userId: string): SubscriptionRow | undefined {
  return getDb()
    .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .get(userId) as SubscriptionRow | undefined;
}

export function getUsage(userId: string, periodKey: string): number {
  const row = getDb()
    .prepare(
      "SELECT query_count FROM usage_quota WHERE user_id = ? AND period_key = ?",
    )
    .get(userId, periodKey) as { query_count: number } | undefined;
  return row?.query_count ?? 0;
}

export function getQuotaInfo(userId: string) {
  const sub = getSubscription(userId);
  const planId: PlanId = sub?.plan_id ?? "free";
  const periodKey = currentPeriodKey();
  const used = getUsage(userId, periodKey);
  const limit = planQuota(planId);
  return {
    planId,
    billingPeriod: sub?.billing_period ?? null,
    status: sub?.status ?? "active",
    periodKey,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export function incrementUsage(userId: string, periodKey: string) {
  getDb()
    .prepare(
      `INSERT INTO usage_quota (user_id, period_key, query_count) VALUES (?, ?, 1)
       ON CONFLICT(user_id, period_key) DO UPDATE SET query_count = query_count + 1`,
    )
    .run(userId, periodKey);
}

export function updateSubscription(
  userId: string,
  planId: PlanId,
  billingPeriod: BillingPeriod | null,
) {
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingPeriod === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  getDb()
    .prepare(
      `UPDATE subscriptions SET plan_id = ?, billing_period = ?, status = 'active',
       current_period_start = ?, current_period_end = ? WHERE user_id = ?`,
    )
    .run(
      planId,
      billingPeriod,
      now.toISOString(),
      periodEnd.toISOString(),
      userId,
    );
}

export function createQueryJob(
  userId: string,
  phoneNumber: string,
  externalJobId: string,
): QueryJobRow {
  const id = uuidv4();
  const database = getDb();
  database
    .prepare(
      `INSERT INTO query_jobs (id, user_id, phone_number, status, external_job_id)
       VALUES (?, ?, ?, 'pending', ?)`,
    )
    .run(id, userId, phoneNumber, externalJobId);

  incrementUsage(userId, currentPeriodKey());

  return database
    .prepare("SELECT * FROM query_jobs WHERE id = ?")
    .get(id) as QueryJobRow;
}

export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  errorMessage?: string,
) {
  getDb()
    .prepare(
      `UPDATE query_jobs SET status = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(status, errorMessage ?? null, jobId);
}

export function findJobByExternalId(
  externalJobId: string,
): QueryJobRow | undefined {
  return getDb()
    .prepare("SELECT * FROM query_jobs WHERE external_job_id = ?")
    .get(externalJobId) as QueryJobRow | undefined;
}

export function getJobById(
  jobId: string,
  userId?: string,
): QueryJobRow | undefined {
  if (userId) {
    return getDb()
      .prepare("SELECT * FROM query_jobs WHERE id = ? AND user_id = ?")
      .get(jobId, userId) as QueryJobRow | undefined;
  }
  return getDb()
    .prepare("SELECT * FROM query_jobs WHERE id = ?")
    .get(jobId) as QueryJobRow | undefined;
}

export function listJobsForUser(userId: string, limit = 50): QueryJobRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM query_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(userId, limit) as QueryJobRow[];
}

export function insertQueryResults(
  jobId: string,
  results: Omit<QueryResultRow, "id" | "job_id" | "created_at">[],
) {
  const insert = getDb().prepare(
    `INSERT INTO query_results (id, job_id, platform, platform_key, is_marked, mark_type, mark_label, appeal_url, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = getDb().transaction(() => {
    for (const r of results) {
      insert.run(
        uuidv4(),
        jobId,
        r.platform,
        r.platform_key,
        r.is_marked,
        r.mark_type,
        r.mark_label,
        r.appeal_url,
        r.raw_json,
      );
    }
  });
  tx();
}

export function getResultsForJob(jobId: string): QueryResultRow[] {
  return getDb()
    .prepare("SELECT * FROM query_results WHERE job_id = ? ORDER BY platform")
    .all(jobId) as QueryResultRow[];
}
