import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

export async function resolveFFmpegPath(): Promise<string> {
  // Use the bundled FFmpeg binary provided by @ffmpeg-installer
  // In a packaged Electron app, this path points to the unpacked ASAR resources.
  if (ffmpegInstaller.path) {
    // electron-builder sometimes changes the path after packing (unpacking to app.asar.unpacked)
    // The installer handles this fairly well, but we return the path directly.
    return ffmpegInstaller.path.replace('app.asar', 'app.asar.unpacked');
  }
  throw new Error('Bundled FFmpeg not found.');
}

export async function resolveFFprobePath(): Promise<string> {
  if (ffprobeInstaller.path) {
    return ffprobeInstaller.path.replace('app.asar', 'app.asar.unpacked');
  }
  throw new Error('Bundled FFprobe not found.');
}
