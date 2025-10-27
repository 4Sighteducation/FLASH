// Web stub - voice recording not available
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onCancel: () => void;
  maxDuration?: number;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onCancel }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>Voice recording not available on web</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  message: { fontSize: 16, color: '#666' },
});

export default VoiceRecorder;

