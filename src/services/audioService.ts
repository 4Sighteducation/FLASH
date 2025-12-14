import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

export interface AudioPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export class AudioService {
  private recordingDirectory: string;

  constructor() {
    this.recordingDirectory = `${FileSystem.documentDirectory}recordings/`;
    this.ensureRecordingDirectory();
  }

  private async ensureRecordingDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(this.recordingDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.recordingDirectory, { intermediates: true });
    }
  }

  async requestPermissions(): Promise<AudioPermissionStatus> {
    try {
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: canAskAgain || false,
      };
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  async checkPermissions(): Promise<AudioPermissionStatus> {
    try {
      const { status, canAskAgain } = await Audio.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: canAskAgain || false,
      };
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  async prepareAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error setting audio mode:', error);
    }
  }

  async configureAudioMode() {
    // Alias for prepareAudioMode for backward compatibility
    return this.prepareAudioMode();
  }

  generateRecordingFilename(): string {
    const timestamp = new Date().getTime();
    return `recording_${timestamp}.m4a`;
  }

  getRecordingUri(filename: string): string {
    return `${this.recordingDirectory}${filename}`;
  }

  async deleteRecording(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        console.log('Deleted recording:', uri);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  }

  async cleanupOldRecordings(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.recordingDirectory);
      const now = Date.now();

      for (const file of files) {
        const fileUri = `${this.recordingDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (fileInfo.exists && (fileInfo as any).modificationTime) {
          const age = now - (fileInfo as any).modificationTime * 1000;
          if (age > maxAge) {
            await this.deleteRecording(fileUri);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old recordings:', error);
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const audioService = new AudioService(); 