import { randomUUID } from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './index';
import { appSettings, mp4Scans } from './schema';
import { diffScans, summarizeScan } from '../domain/mp4analyzer/scan-diff';
import type {
  Mp4FileResult,
  Mp4ScanDiff,
  Mp4ScanRecord,
  Mp4ScanSummary
} from '../../renderer/src/types/mp4analyzer';

export interface SaveMp4ScanInput {
  targetPath: string;
  targetType: 'file' | 'folder';
  startedAt: string;
  status: 'completed' | 'cancelled';
  filesFound: number;
  results: Mp4FileResult[];
}

// Every column except the heavy per-file `results` blob
const summaryColumns = {
  id: mp4Scans.id,
  targetPath: mp4Scans.targetPath,
  targetType: mp4Scans.targetType,
  startedAt: mp4Scans.startedAt,
  finishedAt: mp4Scans.finishedAt,
  status: mp4Scans.status,
  filesFound: mp4Scans.filesFound,
  filesScanned: mp4Scans.filesScanned,
  totalSize: mp4Scans.totalSize,
  healthy: mp4Scans.healthy,
  corrupted: mp4Scans.corrupted,
  repairable: mp4Scans.repairable,
  unrecoverable: mp4Scans.unrecoverable,
  diff: mp4Scans.diff
};

function getHistoryLimit(): number {
  const rows = db.select().from(appSettings).where(eq(appSettings.id, 'default')).all();
  return rows.length > 0 ? rows[0].mp4HistoryLimit : 20;
}

/** Keeps only the newest `limit` scans; `limit <= 0` keeps everything. */
function pruneScans(limit: number): void {
  if (limit <= 0) return;
  const stale = db
    .select({ id: mp4Scans.id })
    .from(mp4Scans)
    .orderBy(desc(mp4Scans.finishedAt))
    .all()
    .slice(limit);
  if (stale.length > 0) {
    db.delete(mp4Scans).where(inArray(mp4Scans.id, stale.map((r) => r.id))).run();
  }
}

export function saveMp4Scan(input: SaveMp4ScanInput): Mp4ScanSummary {
  const previous = db
    .select({ results: mp4Scans.results })
    .from(mp4Scans)
    .where(and(eq(mp4Scans.targetPath, input.targetPath), eq(mp4Scans.status, 'completed')))
    .orderBy(desc(mp4Scans.finishedAt))
    .limit(1)
    .all();

  const diff: Mp4ScanDiff | null =
    previous.length > 0
      ? diffScans(previous[0].results as Mp4FileResult[], input.results, input.status === 'completed')
      : null;

  const summary: Mp4ScanSummary = {
    id: randomUUID(),
    targetPath: input.targetPath,
    targetType: input.targetType,
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    status: input.status,
    filesFound: input.filesFound,
    filesScanned: input.results.length,
    ...summarizeScan(input.results),
    diff
  };

  db.insert(mp4Scans).values({ ...summary, results: input.results }).run();
  pruneScans(getHistoryLimit());
  return summary;
}

export function listMp4Scans(): Mp4ScanSummary[] {
  return db
    .select(summaryColumns)
    .from(mp4Scans)
    .orderBy(desc(mp4Scans.finishedAt))
    .all() as Mp4ScanSummary[];
}

export function getMp4Scan(id: string): Mp4ScanRecord | null {
  const rows = db.select().from(mp4Scans).where(eq(mp4Scans.id, id)).all();
  if (rows.length === 0) return null;
  const row = rows[0];
  return { ...row, diff: row.diff as Mp4ScanDiff | null, results: row.results as Mp4FileResult[] };
}
