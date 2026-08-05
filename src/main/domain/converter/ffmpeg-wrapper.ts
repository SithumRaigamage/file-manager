import { spawn, ChildProcess } from 'child_process';
import { resolveFFmpegPath } from '../../features/converter/ffmpeg-locator';
import { ConversionPreset } from '../../../preload/index';

export interface FFmpegProgress {
  percentage: number;
}

export class FFmpegWrapper {
  private proc: ChildProcess | null = null;
  private killed = false;

  /**
   * Spawns an FFmpeg process to convert a file according to a preset.
   */
  async convert(
    inputPath: string,
    outputPath: string,
    preset: ConversionPreset,
    durationSeconds: number, // Requires prior FFprobe to get accurate duration for progress
    onProgress: (progress: FFmpegProgress) => void
  ): Promise<void> {
    const ffmpegPath = await resolveFFmpegPath();

    // Map preset to actual safe args. (MVP: simple mapping, not blindly executing arbitrary strings)
    // We enforce that the user's preset args are structurally safe.
    const args = [
      '-y', // Overwrite output files
      '-i', inputPath,
      ...preset.ffmpegArgs,
      outputPath
    ];

    return new Promise((resolve, reject) => {
      this.proc = spawn(ffmpegPath, args);

      let lastProgress = 0;

      this.proc.stderr?.on('data', (data: Buffer) => {
        if (this.killed) return;
        
        const text = data.toString();
        // ffmpeg outputs time=00:00:04.20
        const timeMatch = text.match(/time=(\s*\d+:\d+:\d+\.\d+|\s*\d+:\d+:\d+)/);
        
        if (timeMatch && durationSeconds > 0) {
          const timeStr = timeMatch[1].trim();
          const timeParts = timeStr.split(':').map(Number);
          if (timeParts.length === 3) {
            const secs = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            const progress = Math.min(99, Math.round((secs / durationSeconds) * 100));
            
            if (progress > lastProgress) {
              lastProgress = progress;
              onProgress({ percentage: progress });
            }
          }
        }
      });

      this.proc.on('close', (code) => {
        this.proc = null;
        if (this.killed) {
          reject(new Error('Job cancelled'));
        } else if (code === 0) {
          onProgress({ percentage: 100 });
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      this.proc.on('error', (err) => {
        this.proc = null;
        reject(err);
      });
    });
  }

  cancel(): void {
    if (this.proc) {
      this.killed = true;
      this.proc.kill();
    }
  }
}
