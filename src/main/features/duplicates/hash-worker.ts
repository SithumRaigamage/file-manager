import { parentPort } from 'worker_threads';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Listen for file paths to hash
parentPort?.on('message', (filePath: string) => {
  try {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      const result = hash.digest('hex');
      parentPort?.postMessage({ filePath, hash: result });
    });

    stream.on('error', (err) => {
      parentPort?.postMessage({ filePath, error: err.message });
    });
  } catch (error) {
    parentPort?.postMessage({ filePath, error: (error as Error).message });
  }
});
