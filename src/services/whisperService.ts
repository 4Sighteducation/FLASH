import * as FileSystem from 'expo-file-system/legacy';

export interface TranscriptionResult {
  text: string;
  error?: string;
}

export class WhisperService {
  private apiUrl: string;

  constructor() {
    // Use the same backend API pattern as AIService
    this.apiUrl = 'https://www.fl4sh.cards/api/transcribe-audio';
  }

  async transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting audio transcription for:', audioUri);

      // Read the audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get file info to determine the audio format
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      const fileName = audioUri.split('/').pop() || 'audio.m4a';
      
      console.log('Audio file info:', { fileName, size: fileInfo.exists ? (fileInfo as any).size : 0 });

      // Send to backend API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          fileName: fileName,
        }),
      });

      console.log('Transcription response status:', response.status);

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        console.error('Transcription API Error:', errorData);
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = (await response.json()) as { success?: boolean; text?: string };
      console.log('Transcription result:', data);

      if (data.success && data.text) {
        return { text: data.text };
      }

      throw new Error('Invalid response format from transcription service');
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      };
    }
  }

  // Helper method to validate audio file
  async validateAudioFile(audioUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      
      if (!fileInfo.exists) {
        console.error('Audio file does not exist');
        return false;
      }

      // Check file size (Whisper API has a 25MB limit)
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes
      if (fileInfo.exists && (fileInfo as any).size && (fileInfo as any).size > maxSize) {
        console.error('Audio file too large:', (fileInfo as any).size);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating audio file:', error);
      return false;
    }
  }
}

export const whisperService = new WhisperService(); 