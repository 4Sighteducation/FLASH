// Web stub - audio recording not available on web
export interface AudioPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export class AudioService {
  async requestPermissions(): Promise<AudioPermissionStatus> {
    return { granted: false, canAskAgain: false };
  }
  async startRecording(): Promise<void> {
    throw new Error('Audio not available on web');
  }
  async stopRecording(): Promise<string | null> { return null; }
  async pauseRecording(): Promise<void> {}
  async resumeRecording(): Promise<void> {}
  async deleteRecording(uri: string): Promise<void> {}
  async getRecordingDuration(uri: string): Promise<number> { return 0; }
}

export const audioService = new AudioService();

