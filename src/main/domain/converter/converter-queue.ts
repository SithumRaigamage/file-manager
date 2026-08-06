import os from 'os';
import path from 'path';
import fs from 'fs';
import { FFmpegWrapper } from './ffmpeg-wrapper';
import { DiskSpaceChecker } from './disk-space-checker';
import { ConversionPreset } from '../../../preload/index';
import { HistoryService, BatchItem } from '../history/history-service';
import { resolveFFprobePath } from '../../features/converter/ffmpeg-locator';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ConversionJob {
  id: string;
  inputPath: string;
  outputPath: string;
  preset: ConversionPreset;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

export class ConverterQueue {
  private queue: ConversionJob[] = [];
  private activeJobs = new Map<string, { job: ConversionJob; wrapper: FFmpegWrapper }>();
  private concurrencyLimit = Math.max(1, Math.floor(os.cpus().length / 2));
  private historyItems: BatchItem[] = [];

  enqueue(
    inputPaths: string[],
    preset: ConversionPreset,
    onProgressUpdate: (jobId: string, filePath: string, progress: number) => void,
    onBatchComplete: (batchId: string) => void
  ): string {
    const batchId = crypto.randomUUID();
    
    // Reset history tracking for new batch
    this.historyItems = [];

    for (const inputPath of inputPaths) {
      if (!fs.existsSync(inputPath)) continue;

      const ext = path.extname(inputPath);
      const base = path.basename(inputPath, ext);
      const dir = path.dirname(inputPath);
      let outputPath = path.join(dir, `${base}_converted.${preset.targetContainer}`);

      // Basic collision
      let counter = 1;
      while (fs.existsSync(outputPath)) {
        outputPath = path.join(dir, `${base}_converted (${counter}).${preset.targetContainer}`);
        counter++;
      }

      const jobId = crypto.randomUUID();
      const job: ConversionJob = {
        id: jobId,
        inputPath,
        outputPath,
        preset,
        status: 'pending',
        progress: 0,
        onProgress: (p) => {
          job.progress = p;
          onProgressUpdate(jobId, inputPath, p);
        },
        onComplete: () => {
          job.status = 'completed';
          job.progress = 100;
          this.historyItems.push({ before: inputPath, after: outputPath, status: 'success' });
          this.activeJobs.delete(jobId);
          this.processNext(batchId, onBatchComplete);
        },
        onError: (err) => {
          job.status = 'failed';
          job.error = err.message;
          this.historyItems.push({ before: inputPath, after: outputPath, status: 'failed' });
          this.activeJobs.delete(jobId);
          this.processNext(batchId, onBatchComplete);
        }
      };

      this.queue.push(job);
    }

    this.processNext(batchId, onBatchComplete);
    return batchId;
  }

  cancelJob(jobId: string): void {
    const active = this.activeJobs.get(jobId);
    if (active) {
      active.wrapper.cancel();
      active.job.status = 'cancelled';
      this.historyItems.push({ before: active.job.inputPath, after: active.job.outputPath, status: 'failed' });
      this.activeJobs.delete(jobId);
    } else {
      // Remove from queue if not started
      const index = this.queue.findIndex(j => j.id === jobId);
      if (index !== -1) {
        const job = this.queue[index];
        job.status = 'cancelled';
        this.historyItems.push({ before: job.inputPath, after: job.outputPath, status: 'skipped' });
        this.queue.splice(index, 1);
      }
    }
  }

  private async processNext(batchId: string, onBatchComplete: (batchId: string) => void): Promise<void> {
    if (this.queue.length === 0 && this.activeJobs.size === 0) {
      // Batch finished
      if (this.historyItems.length > 0) {
        HistoryService.logBatch('convert', this.historyItems, false);
        this.historyItems = [];
      }
      onBatchComplete(batchId);
      return;
    }

    while (this.activeJobs.size < this.concurrencyLimit && this.queue.length > 0) {
      const job = this.queue.shift()!;
      
      // Pre-flight disk space check
      const requiredBytes = DiskSpaceChecker.estimateRequiredBytes(job.inputPath);
      const hasSpace = await DiskSpaceChecker.hasEnoughSpace(job.outputPath, requiredBytes);
      
      if (!hasSpace) {
        if (job.onError) job.onError(new Error('Insufficient disk space'));
        continue;
      }

      job.status = 'processing';
      const wrapper = new FFmpegWrapper();
      this.activeJobs.set(job.id, { job, wrapper });

      // Get duration for progress tracking
      let duration = 0;
      try {
        const ffprobePath = await resolveFFprobePath();
        const { stdout } = await execFileAsync(ffprobePath, [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          job.inputPath
        ]);
        duration = parseFloat(stdout.trim());
      } catch (err) {
        console.warn('Failed to probe duration for progress tracking', err);
      }

      wrapper.convert(
        job.inputPath,
        job.outputPath,
        job.preset,
        duration,
        (progress) => {
          if (job.onProgress) job.onProgress(progress.percentage);
        }
      ).then(() => {
        if (job.onComplete) job.onComplete();
      }).catch((err) => {
        if (job.onError) job.onError(err);
      });
    }
  }
}
