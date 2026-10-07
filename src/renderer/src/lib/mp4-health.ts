import type { Mp4FileResult } from '../types/mp4analyzer'

/**
 * Health score shown for a scan result. Files that fail the container check never
 * get a playback score, so they must read as 0% rather than defaulting to 100%.
 */
export function getHealthScore(r: Mp4FileResult): number {
  if (r.corruptionLevel === 'unrecoverable') return 0
  return r.playbackVerification?.healthScore ?? 100
}
