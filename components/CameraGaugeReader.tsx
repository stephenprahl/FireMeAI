import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VisionAnalysisResult, VisionService } from '../services/visionService';

interface CameraGaugeReaderProps {
  onGaugeRead: (reading: VisionAnalysisResult) => void;
  onClose: () => void;
}

export default function CameraGaugeReader({ onGaugeRead, onClose }: CameraGaugeReaderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [selectedGaugeType, setSelectedGaugeType] = useState<'pressure' | 'temperature' | 'flow' | 'level'>('pressure');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recentReadings, setRecentReadings] = useState<VisionAnalysisResult[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchReadings, setBatchReadings] = useState<VisionAnalysisResult[]>([]);
  const [autoCapture, setAutoCapture] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const visionService = new VisionService(process.env.OPENAI_API_KEY || 'your-api-key-here');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleSaveResult = () => {
    if (analysisResult) {
      if (batchMode) {
        setBatchReadings(prev => [...prev, analysisResult]);
        setShowResults(false);
        setAnalysisResult(null);
      } else {
        // Add to recent readings
        setRecentReadings(prev => [analysisResult, ...prev.slice(0, 4)]);
        onGaugeRead(analysisResult);
        onClose();
      }
    }
  };

  const handleRetake = () => {
    setShowResults(false);
    setAnalysisResult(null);
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    if (!batchMode) {
      setBatchReadings([]);
    }
  };

  const toggleAutoCapture = () => {
    setAutoCapture(!autoCapture);
  };

  const handleManualInput = () => {
    if (!manualValue.trim()) {
      Alert.alert('Error', 'Please enter a reading value');
      return;
    }

    const manualReading: VisionAnalysisResult = {
      pressure: parseFloat(manualValue),
      confidence: 1.0,
      gaugeType: 'analog', // Use valid gauge type
      corrosion: { detected: false, confidence: 0, severity: 'none' },
      imageBase64: ''
    };

    if (batchMode) {
      setBatchReadings(prev => [...prev, manualReading]);
      setManualValue('');
    } else {
      setRecentReadings(prev => [manualReading, ...prev.slice(0, 4)]);
      onGaugeRead(manualReading);
      setShowManualInput(false);
      setManualValue('');
    }
  };

  const handleBatchComplete = () => {
    if (batchReadings.length === 0) {
      Alert.alert('Error', 'No readings captured');
      return;
    }

    // Send all batch readings
    batchReadings.forEach(reading => {
      onGaugeRead(reading);
    });
    
    Alert.alert('Success', `${batchReadings.length} readings saved successfully`);
    setBatchMode(false);
    setBatchReadings([]);
    onClose();
  };

  const getGaugeIcon = (type: string) => {
    switch (type) {
      case 'pressure': return 'speedometer';
      case 'temperature': return 'thermometer';
      case 'flow': return 'water';
      case 'level': return 'bar-chart';
      default: return 'speedometer';
    }
  };

  const getGaugeUnit = (type: string) => {
    switch (type) {
      case 'pressure': return 'PSI';
      case 'temperature': return '°F';
      case 'flow': return 'GPM';
      case 'level': return '%';
      default: return 'PSI';
    }
  };

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

      setAnalysisResult(analysis);
      setShowResults(true);

    } catch (error) {
      console.error('Error capturing gauge:', error);
      Alert.alert('Error', 'Failed to capture gauge reading. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (showResults && analysisResult) {
    return (
      <View style={styles.resultsContainer}>
        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeaderLeft}>
            <Pressable onPress={handleRetake} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#64748b" />
            </Pressable>
            <View style={styles.resultsHeaderText}>
              <Text style={styles.resultsTitle}>Analysis Results</Text>
              <Text style={styles.resultsSubtitle}>Gauge reading and corrosion detection</Text>
            </View>
          </View>
        </View>

        {/* Results Content */}
        <ScrollView style={styles.resultsContent}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Captured Image</Text>
            <View style={styles.imageContainer}>
              <Image source={{ uri: `data:image/jpeg;base64,${analysisResult.imageBase64}` }} style={styles.scannedImage} />
            </View>
          </View>

          {/* Analysis Results */}
          <View style={styles.analysisSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>

            {/* Pressure Reading */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="speedometer" size={20} color="#2563eb" />
                <Text style={styles.resultTitle}>Pressure Reading</Text>
              </View>
              <Text style={styles.pressureValue}>{analysisResult.pressure} PSI</Text>
              <Text style={styles.confidenceText}>Confidence: {Math.round(analysisResult.confidence * 100)}%</Text>
            </View>

            {/* Gauge Type */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="hardware-chip" size={20} color="#2563eb" />
                <Text style={styles.resultTitle}>Gauge Type</Text>
              </View>
              <Text style={styles.gaugeType}>{analysisResult.gaugeType}</Text>
            </View>

            {/* Corrosion Status */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="warning" size={20} color={analysisResult.corrosion.detected ? '#dc2626' : '#16a34a'} />
                <Text style={styles.resultTitle}>Corrosion Detection</Text>
              </View>
              <Text style={styles.corrosionStatus}>
                {analysisResult.corrosion.detected ? 'Corrosion Detected' : 'No Corrosion Found'}
              </Text>
              <Text style={styles.confidenceText}>Confidence: {Math.round(analysisResult.corrosion.confidence * 100)}%</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Pressable onPress={handleSaveResult} style={styles.primaryAction}>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.primaryActionText}>Save Reading</Text>
            </Pressable>

            <Pressable onPress={handleRetake} style={styles.secondaryAction}>
              <Ionicons name="camera-reverse" size={20} color="#64748b" />
              <Text style={styles.secondaryActionText}>Retake Photo</Text>
            </Pressable>
          </View>

          {/* Recent Readings */}
          {recentReadings.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Readings</Text>
              {recentReadings.map((reading, index) => (
                <View key={index} style={styles.recentReadingCard}>
                  <View style={styles.recentReadingHeader}>
                    <Ionicons name={getGaugeIcon(reading.gaugeType) as any} size={16} color="#2563eb" />
                    <Text style={styles.recentReadingType}>{reading.gaugeType}</Text>
                    <Text style={styles.recentReadingValue}>
                      {reading.pressure} {getGaugeUnit(reading.gaugeType)}
                    </Text>
                  </View>
                  <Text style={styles.recentReadingDate}>
                    {new Date().toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera" size={64} color="#cbd5e1" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtitle}>
            We need camera permission to scan pressure gauges and detect corrosion.
          </Text>
          <Pressable onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        {/* Professional Header Overlay */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerContent}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
            <Text style={styles.headerTitle}>Gauge Scanner</Text>
            <Pressable onPress={toggleFlash} style={styles.flashButton}>
              <Ionicons name={flashEnabled ? "flash" : "flash-off"} size={20} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Gauge Type Selector */}
        <View style={styles.gaugeTypeSelector}>
          <Text style={styles.gaugeTypeLabel}>Select Gauge Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gaugeTypeScroll}>
            {(['pressure', 'temperature', 'flow', 'level'] as const).map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.gaugeTypeChip,
                  selectedGaugeType === type && styles.gaugeTypeChipActive
                ]}
                onPress={() => setSelectedGaugeType(type)}
              >
                <Ionicons 
                  name={getGaugeIcon(type) as any} 
                  size={16} 
                  color={selectedGaugeType === type ? '#ffffff' : '#2563eb'} 
                />
                <Text style={[
                  styles.gaugeTypeText,
                  selectedGaugeType === type && styles.gaugeTypeTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Target Guide */}
        <View style={styles.targetOverlay}>
          <View style={styles.targetContainer}>
            <View style={styles.targetBox}>
              <View style={styles.targetCorner} />
              <View style={[styles.targetCorner, { top: 0, right: 0, transform: [{ rotate: '90deg' }] }]} />
              <View style={[styles.targetCorner, { bottom: 0, left: 0, transform: [{ rotate: '270deg' }] }]} />
              <View style={[styles.targetCorner, { bottom: 0, right: 0, transform: [{ rotate: '180deg' }] }]} />
            </View>
            <Text style={styles.targetText}>Position gauge in center</Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlsOverlay}>
          {/* Batch Mode Indicator */}
          {batchMode && (
            <View style={styles.batchIndicator}>
              <Text style={styles.batchIndicatorText}>
                Batch Mode: {batchReadings.length} readings
              </Text>
              <Pressable onPress={handleBatchComplete} style={styles.batchCompleteButton}>
                <Text style={styles.batchCompleteButtonText}>Complete</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.controlsContent}>
            {/* Control Buttons */}
            <View style={styles.controlButtons}>
              <Pressable onPress={toggleBatchMode} style={[
                styles.controlButton,
                batchMode && styles.controlButtonActive
              ]}>
                <Ionicons name="layers" size={20} color={batchMode ? '#ffffff' : '#64748b'} />
                <Text style={[
                  styles.controlButtonText,
                  batchMode && styles.controlButtonTextActive
                ]}>Batch</Text>
              </Pressable>

              <Pressable onPress={() => setShowManualInput(true)} style={styles.controlButton}>
                <Ionicons name="create" size={20} color="#64748b" />
                <Text style={styles.controlButtonText}>Manual</Text>
              </Pressable>

              <Pressable onPress={toggleAutoCapture} style={[
                styles.controlButton,
                autoCapture && styles.controlButtonActive
              ]}>
                <Ionicons name="repeat" size={20} color={autoCapture ? '#ffffff' : '#64748b'} />
                <Text style={[
                  styles.controlButtonText,
                  autoCapture && styles.controlButtonTextActive
                ]}>Auto</Text>
              </Pressable>
            </View>

            {/* Capture Button */}
            <Pressable
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
              onPress={captureGauge}
              disabled={isProcessing}
            >
              <View style={styles.captureButtonInner}>
                {isProcessing ? (
                  <Ionicons name="hourglass" size={24} color="white" />
                ) : (
                  <Ionicons name="camera" size={24} color="white" />
                )}
              </View>
            </Pressable>
            <Text style={styles.captureHint}>
              {isProcessing ? 'Analyzing...' : batchMode ? `Tap to scan (${batchReadings.length} captured)` : 'Tap to scan gauge'}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },

  // Permission Screen
  permissionContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera Overlays
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  flashButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },

  // Gauge Type Selector
  gaugeTypeSelector: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
  },
  gaugeTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 12,
  },
  gaugeTypeScroll: {
    flexDirection: 'row',
  },
  gaugeTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gaugeTypeChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  gaugeTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    marginLeft: 6,
  },
  gaugeTypeTextActive: {
    color: 'white',
  },

  targetOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetContainer: {
    alignItems: 'center',
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  targetCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF00',
    top: 0,
    left: 0,
  },
  targetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingTop: 20,
    paddingBottom: 40,
  },
  controlsContent: {
    paddingHorizontal: 20,
  },

  // Batch Mode
  batchIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  batchIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  batchCompleteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  batchCompleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Control Buttons
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 60,
  },
  controlButtonActive: {
    backgroundColor: '#2563eb',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  controlButtonTextActive: {
    color: 'white',
  },
  captureButton: {
    marginBottom: 12,
  },
  captureButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureHint: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  // Results Modal
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  resultsHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: 50,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  resultsHeaderText: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    letterSpacing: -0.5,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },

  resultsContent: {
    flex: 1,
    padding: 20,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  imageContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  scannedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },

  analysisSection: {
    marginBottom: 24,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  pressureValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: -0.5,
  },
  gaugeType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  corrosionStatus: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  confidenceText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },

  actionsSection: {
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryActionText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Recent Readings
  recentSection: {
    marginTop: 24,
  },
  recentReadingCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentReadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentReadingType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  recentReadingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 'auto',
  },
  recentReadingDate: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Manual Input Modal
  manualInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualInputModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  manualInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  manualInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  manualInputContent: {
    gap: 16,
  },
  manualInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  manualInputField: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  manualInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  manualInputCancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  manualInputCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  manualInputSaveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualInputSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
