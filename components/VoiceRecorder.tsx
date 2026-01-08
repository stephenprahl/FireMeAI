import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface VoiceRecorderProps {
  onRecordingComplete: (audioUri: string) => void;
  isProcessing?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, isProcessing = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    if (!recording) return;

    setRecording(null);
    setIsRecording(false);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);

    if (uri) {
      onRecordingComplete(uri);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.recorderCard}>
        <View style={styles.recorderHeader}>
          <Ionicons name="mic" size={24} color="#2563eb" />
          <Text style={styles.recorderTitle}>Voice Recorder</Text>
        </View>

        <Text style={styles.recorderSubtitle}>
          Record inspection notes and job details
        </Text>

        <View style={styles.recorderControls}>
          <Pressable
            style={[styles.recordButton, isRecording && styles.recordButtonActive, isProcessing && styles.recordButtonDisabled]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <View style={styles.recordButtonInner}>
              {isProcessing ? (
                <Ionicons name="hourglass" size={28} color="white" />
              ) : (
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={28}
                  color="white"
                />
              )}
            </View>
          </Pressable>

          <Text style={[styles.statusText, isRecording && styles.statusTextActive]}>
            {isProcessing ? 'Processing audio...' : isRecording ? 'Recording... Tap to stop' : 'Tap microphone to start'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  recorderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  recorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recorderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  recorderSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  recorderControls: {
    alignItems: 'center',
  },
  recordButton: {
    marginBottom: 16,
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#dc2626',
    transform: [{ scale: 1.05 }],
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  statusText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
