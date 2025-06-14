import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

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
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting audio mode:', error);
    }
  }

  getRecordingOptions(): Audio.RecordingOptions {
    return {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };
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

  // Get audio level from recording status (0-1 range)
  getAudioLevel(status: Audio.RecordingStatus): number {
    if (!status.isRecording || !status.metering) {
      return 0;
    }
    
    // Convert dB to 0-1 range
    // Typical range is -160 to 0 dB
    const minDb = -60;
    const maxDb = 0;
    const db = Math.max(minDb, Math.min(maxDb, status.metering));
    
    return (db - minDb) / (maxDb - minDb);
  }
}

export const audioService = new AudioService(); 