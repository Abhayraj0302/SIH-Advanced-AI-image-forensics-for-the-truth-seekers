import { UploadResponse, DetectResponse } from '../types/api';

declare global {
  interface Window {
    ENV_API_URL?: string;
  }
}

export class ApiService {
  public static getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.ENV_API_URL) {
      return window.ENV_API_URL;
    }
    // Use empty string to leverage Vite's proxy in development
    return '';
  }

  public static async uploadImage(file: File): Promise<UploadResponse> {
    const baseUrl = this.getBaseUrl();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${baseUrl}/api/v1/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload failed (HTTP ${response.status}): ${errText}`);
      }

      return await response.json();
    } catch (err: any) {
      console.error('[ApiService] Upload API failed:', err);
      throw new Error(err.message || 'Failed to connect to the backend server for upload.');
    }
  }

  public static async detectImage(
    imageId: string,
    mode: string = 'deep_scan',
    sensitivity: number = 85
  ): Promise<DetectResponse> {
    const baseUrl = this.getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/api/v1/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, mode, sensitivity })
      });

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { error: `Detection failed with HTTP ${response.status}`, code: 'UNKNOWN_ERROR' };
        }
        const err = new Error(errorBody.error || `Detection failed with HTTP ${response.status}`);
        (err as any).code = errorBody.code;
        throw err;
      }

      return await response.json();
    } catch (err: any) {
      console.error('[ApiService] Detection API failed:', err);
      throw new Error(err.message || 'Failed to connect to the forensics engine for detection.');
    }
  }
}
