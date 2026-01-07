import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VisionAnalysisResult, VisionService } from '../services/visionService';

interface CameraGaugeReaderProps {
  onGaugeRead: (reading: VisionAnalysisResult) => void;
  onClose: () => void;
}

export default function CameraGaugeReader({ onGaugeRead, onClose }: CameraGaugeReaderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const visionService = new VisionService(process.env.OPENAI_API_KEY || 'your-api-key-here');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const captureGauge = async () => {
    if (!cameraRef.current || !permission?.granted) return;

    setIsProcessing(true);
    
    try {
      // Capture the image
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo.base64) {
        throw new Error('Failed to capture image');
      }

      // Process the image for OCR
      const processedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          { resize: { width: 800 } },
          { crop: { originX: 0.25, originY: 0.25, width: 0.5, height: 0.5 } } // Focus on center area
        ],
        { compress: 0.8, base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Use vision service for gauge reading and corrosion detection
      const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
      const analysis = hasApiKey 
        ? await visionService.analyzeGaugeImage(processedImage.base64!)
        : await visionService.mockAnalyzeGaugeImage(processedImage.base64!);
      
      onGaugeRead(analysis);
      onClose();
      
    } catch (error) {
      console.error('Error capturing gauge:', error);
      Alert.alert('Error', 'Failed to capture gauge reading. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Gauge Reader</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.targetArea}>
            <View style={styles.targetBox}>
              <View style={styles.targetCorner} />
              <View style={[styles.targetCorner, { top: 0, right: 0 }]} />
              <View style={[styles.targetCorner, { bottom: 0, left: 0 }]} />
              <View style={[styles.targetCorner, { bottom: 0, right: 0 }]} />
              <Text style={styles.targetText}>Align gauge within frame</Text>
            </View>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={captureGauge}
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Text style={styles.captureButtonText}>Processing...</Text>
              ) : (
                <Ionicons name="camera" size={32} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  targetArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  targetCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00FF00',
    top: 0,
    left: 0,
  },
  targetText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  footer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  captureButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  captureButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
});
