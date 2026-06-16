export type CorruptionLevel = 'healthy' | 'minor' | 'moderate' | 'severe' | 'unrecoverable';

export interface Mp4Metadata {
  duration: number;
  resolution: string;
  bitrate: number;
  codec: string;
  fps: number;
  audioCodec: string;
}

export interface Mp4PlaybackVerification {
  totalFrames: number;
  decodableFrames: number;
  corruptedFrames: number;
  healthScore: number;
}

export interface Mp4Recommendation {
  action: string;
  confidence: 'high' | 'medium' | 'low';
  command?: string;
}

export interface Mp4FileResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  basicValidation: 'valid' | 'invalid';
  containerValidation: 'healthy' | 'warning' | 'corrupted';
  ffmpegValidation: {
    errorCount: number;
    warningCount: number;
    severity: CorruptionLevel;
  };
  metadata: Mp4Metadata | null;
  playbackVerification: Mp4PlaybackVerification | null;
  corruptionLevel: CorruptionLevel;
  recommendation: Mp4Recommendation;
  errorMsg?: string;
  atomStructure?: string[];
  errorLogs?: string[];
  repairStatus?: 'idle' | 'repairing' | 'success' | 'error';
  repairedPath?: string;
}

export interface Mp4AnalyzerSummary {
  totalFiles: number;
  healthyFiles: number;
  corruptedFiles: number;
  repairableFiles: number;
  unrecoverableFiles: number;
}

export interface Mp4ScanProgress {
  scanned: number;
  total: number;
  currentFile: string;
  result?: Mp4FileResult;
}
