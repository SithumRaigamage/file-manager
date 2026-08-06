import * as http from 'http';

export class AIService {
  private baseUrl = 'http://127.0.0.1:11434';
  private model = 'llama3'; // Configurable later via settings

  // Checks if Ollama is running
  async checkAvailability(): Promise<{ isAvailable: boolean; message?: string }> {
    return new Promise((resolve) => {
      const req = http.get(this.baseUrl, (res) => {
        if (res.statusCode === 200) {
          resolve({ isAvailable: true });
        } else {
          resolve({ isAvailable: false, message: 'Ollama returned non-200 status' });
        }
      });
      
      req.on('error', () => {
        resolve({ isAvailable: false, message: 'Could not connect to Ollama. Is it running?' });
      });

      req.setTimeout(2000, () => {
        req.destroy();
        resolve({ isAvailable: false, message: 'Connection to Ollama timed out' });
      });
    });
  }

  // Uses Ollama to categorize a file based on its name and properties
  async suggestCategory(fileInfo: { filename: string; path: string; size: number }, categories: string[]): Promise<string | null> {
    const prompt = `You are a strict, objective file categorization engine.
Your task is to choose the single best category for the following file from the provided list.

Categories: ${categories.join(', ')}

File Details:
Name: ${fileInfo.filename}
Path: ${fileInfo.path}

Rules:
1. You MUST output ONLY a valid JSON object. Do NOT wrap it in markdown code blocks.
2. The JSON object MUST have exactly one key: "category".
3. The value MUST be one of the exact categories listed above.
4. If you cannot confidently categorize it, output the value "Uncategorized".

Example valid output:
{"category": "Invoices"}`;

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json', // Force JSON mode if model supports it
      });

      const req = http.request(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(rawData);
            if (data.response) {
              const aiParsed = JSON.parse(data.response);
              if (aiParsed.category && categories.includes(aiParsed.category) || aiParsed.category === 'Uncategorized') {
                resolve(aiParsed.category);
              } else {
                resolve('Uncategorized');
              }
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error('Failed to parse AI response:', e);
            resolve(null);
          }
        });
      });

      req.on('error', (err) => {
        console.error('Ollama request error:', err);
        resolve(null);
      });

      req.write(postData);
      req.end();
    });
  }
}

export const aiService = new AIService();
