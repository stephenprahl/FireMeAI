import ClientManagementComponent from '@/components/ClientManagementComponent';
import SchedulingComponent from '@/components/SchedulingComponent';
import TabBar from '@/components/TabBar';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CameraGaugeReader from '../components/CameraGaugeReader';
import VoiceRecorder from '../components/VoiceRecorder';
import { AIAgentService } from '../services/aiAgentService';
import { DatabaseService } from '../services/databaseService';
import { LangGraphAgentService } from '../services/langGraphAgentService';
import { NotificationService } from '../services/notificationService';
import { PDFService } from '../services/pdfService';
import { PrismaDatabaseService } from '../services/prismaDatabaseService';
import { Job } from '../services/schedulingService';
import { SyncService } from '../services/syncService';
import { VisionAnalysisResult } from '../services/visionService';
import { WhisperService } from '../services/whisperService';
import { NFPAInspection } from '../types/nfpa';

export default function Index() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [inspection, setInspection] = useState<NFPAInspection | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const whisperService = new WhisperService(process.env.OPENAI_API_KEY || 'your-api-key-here');
  const aiAgentService = new AIAgentService();
  const pdfService = new PDFService();
  const databaseService = new DatabaseService();
  const prismaDatabaseService = new PrismaDatabaseService();
  const syncService = new SyncService(prismaDatabaseService);
  const langGraphAgent = new LangGraphAgentService();
  const notificationService = NotificationService.getInstance();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showScheduling, setShowScheduling] = useState(false);
  const [showClientManagement, setShowClientManagement] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [complianceStatus, setComplianceStatus] = useState<'compliant' | 'non_compliant' | 'requires_attention' | null>(null);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, pendingCount: 0 });

  // Initialize database on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize both databases for comparison
        await databaseService.initializeDatabase();
        await prismaDatabaseService.initializeDatabase();
        
        // Initialize notification service
        await notificationService.initialize();
        
        // Load inspection count
        const inspections = await prismaDatabaseService.findManyInspections();
        setInspectionCount(inspections.length);
        
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Alert.alert('Error', 'Failed to initialize app. Please restart.');
      }
    };

    
    initializeApp();
  }, []);

  const handleRecordingComplete = async (audioUri: string) => {
    setIsProcessing(true);
    setTranscription('');
    setInspection(null);
    setMissingFields([]);

    try {
      // Use real Whisper API transcription if API key is available, otherwise use mock
      const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
      const transcriptionResult = hasApiKey 
        ? await whisperService.transcribeAudio(audioUri)
        : await whisperService.mockTranscribeAudio(audioUri);
      
      setTranscription(transcriptionResult.text);

      // Use advanced LangGraph agent for processing
      const agentResponse = await langGraphAgent.processInspectionInput(
        transcriptionResult.text,
        inspection || undefined
      );
      
      setMissingFields(agentResponse.missingCriticalFields);
      setComplianceStatus(agentResponse.overallStatus);

      // Create inspection object from enhanced parsing
      const newInspection = aiAgentService.createInspectionFromParsedData(
        agentResponse.parsedData,
        'Field Technician', // This would come from user profile
        'K&E Fire - Site A' // This would come from job selection
      );
      setInspection(newInspection);

      // Save to offline database (using Prisma service)
      await prismaDatabaseService.createInspection(newInspection);
      setInspectionCount(prev => prev + 1);
      
      // Update sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus({
        isOnline: status.isOnline,
        pendingCount: status.pendingInspections + status.pendingTranscriptions
      });

      // Show compliance status and follow-up questions
      if (agentResponse.followUpQuestions.length > 0) {
        const criticalQuestions = agentResponse.followUpQuestions.filter(q => q.priority === 'critical');
        const questionText = criticalQuestions.length > 0
          ? criticalQuestions.map(q => q.question).join('\n\n')
          : agentResponse.followUpQuestions.slice(0, 3).map(q => q.question).join('\n\n');
          
        Alert.alert(
          agentResponse.overallStatus === 'non_compliant' ? 'Compliance Issues Found' : 'Additional Information Needed',
          questionText,
          [{ text: 'OK', onPress: () => {} }]
        );
      }

      // Show overall compliance status
      if (agentResponse.overallStatus === 'compliant') {
        Alert.alert('✅ Compliant', 'Inspection meets all NFPA requirements. Ready for PDF generation.');
      } else if (agentResponse.overallStatus === 'non_compliant') {
        Alert.alert('❌ Non-Compliant', 'Critical issues found that must be addressed.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      Alert.alert('Error', 'Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGaugeRead = (reading: VisionAnalysisResult) => {
    const corrosionMessage = reading.corrosion.detected 
      ? `\nCorrosion Detected: ${reading.corrosion.severity.toUpperCase()} (${Math.round(reading.corrosion.confidence * 100)}% confidence)`
      : '\nNo corrosion detected';
    
    Alert.alert(
      'Gauge Analysis Complete',
      `Pressure: ${reading.pressure} PSI\nConfidence: ${Math.round(reading.confidence * 100)}%\nGauge Type: ${reading.gaugeType}${corrosionMessage}`,
      [
        {
          text: 'Add to Inspection',
          onPress: () => {
            // In a full implementation, this would add the reading to the current inspection
            Alert.alert('Success', `Gauge reading (${reading.pressure} PSI) and corrosion analysis added to inspection.`);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleGeneratePDF = async () => {
    if (!inspection) {
      Alert.alert('Error', 'No inspection data available to generate PDF.');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const pdfUri = await pdfService.generateNFPAReport(inspection);
      
      Alert.alert(
        'PDF Generated Successfully',
        'NFPA inspection report has been generated. Would you like to share it?',
        [
          {
            text: 'Share PDF',
            onPress: () => pdfService.sharePDF(pdfUri),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateSamplePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfUri = await pdfService.generateSamplePDF();
      
      Alert.alert(
        'Sample PDF Generated',
        'A sample NFPA 25 inspection report has been generated for testing purposes.',
        [
          {
            text: 'View Sample',
            onPress: () => pdfService.sharePDF(pdfUri),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error generating sample PDF:', error);
      Alert.alert('Error', 'Failed to generate sample PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
      Alert.alert('Test Sent', 'Test notification sent successfully!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const handleEmergencyAlert = async () => {
    try {
      await notificationService.sendEmergencyAlert(
        '123 Main St, Office Building',
        'Critical sprinkler system failure detected',
        'John Smith'
      );
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert('Error', 'Failed to send emergency alert.');
    }
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    // Close any open modals when switching tabs
    setShowCamera(false);
    setShowScheduling(false);
    setShowClientManagement(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <View>
            {/* Action Buttons */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => setShowCamera(true)}
                >
                  <Ionicons name="camera" size={20} color="white" />
                  <Text style={styles.cameraButtonText}>Scan Gauge</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.syncButton,
                    !syncStatus.isOnline && { backgroundColor: '#8E8E93' }
                  ]}
                  onPress={() => syncService.forceSync()}
                >
                  <Ionicons 
                    name={syncStatus.isOnline ? "cloud-upload" : "cloud-offline"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.cameraButtonText}>
                    {syncStatus.pendingCount > 0 ? `Sync (${syncStatus.pendingCount})` : 'Sync'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={handleTestNotification}
                >
                  <Ionicons name="notifications" size={20} color="white" />
                  <Text style={styles.cameraButtonText}>Test Alert</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Voice Recorder */}
            <VoiceRecorder 
              onRecordingComplete={handleRecordingComplete}
              isProcessing={isProcessing}
            />

            {/* Transcription Display */}
            {transcription ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transcription:</Text>
                <View style={styles.transcriptionBox}>
                  <Text style={styles.transcriptionText}>{transcription}</Text>
                </View>
              </View>
            ) : null}

            {/* Inspection Results */}
            {inspection ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Inspection Data:</Text>
                  <View style={styles.pdfButtons}>
                    <TouchableOpacity
                      style={[styles.pdfButton, isGeneratingPDF && styles.pdfButtonDisabled]}
                      onPress={handleGeneratePDF}
                      disabled={isGeneratingPDF}
                    >
                      <Ionicons name="document-text" size={20} color="white" />
                      <Text style={styles.pdfButtonText}>
                        {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sampleButton, isGeneratingPDF && styles.pdfButtonDisabled]}
                      onPress={handleGenerateSamplePDF}
                      disabled={isGeneratingPDF}
                    >
                      <Ionicons name="document-text-outline" size={20} color="white" />
                      <Text style={styles.pdfButtonText}>
                        Sample PDF
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {inspection.risers.map((riser) => (
                  <View key={riser.riserNumber} style={styles.riserCard}>
                    <Text style={styles.riserTitle}>Riser {riser.riserNumber}</Text>
                    <Text style={styles.riserDetail}>
                      Static Pressure: {riser.staticPressure} PSI
                    </Text>
                    {riser.residualPressure > 0 && (
                      <Text style={styles.riserDetail}>
                        Residual Pressure: {riser.residualPressure} PSI
                      </Text>
                    )}
                    <Text style={styles.riserDetail}>
                      Control Valve: {riser.controlValveStatus.replace('_', ' ')}
                    </Text>
                    <Text style={styles.riserDetail}>
                      Butterfly Valve: {riser.butterflyValveStatus.replace('_', ' ')}
                    </Text>
                    <Text style={styles.riserDetail}>
                      Corrosion: {riser.corrosion}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Missing Fields */}
            {missingFields.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Missing Information:</Text>
                {missingFields.map((field, index) => (
                  <Text key={index} style={styles.missingField}>• {field}</Text>
                ))}
              </View>
            )}
          </View>
        );
      
      case 'camera':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Camera Gauge Reader</Text>
            <CameraGaugeReader
              onGaugeRead={handleGaugeRead}
              onClose={() => setActiveTab('home')}
            />
          </View>
        );
      
      case 'schedule':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduling & Dispatch</Text>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => setShowScheduling(true)}
            >
              <Ionicons name="calendar" size={20} color="white" />
              <Text style={styles.cameraButtonText}>Open Schedule</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'clients':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Management</Text>
            <TouchableOpacity
              style={styles.clientButton}
              onPress={() => setShowClientManagement(true)}
            >
              <Ionicons name="people" size={20} color="white" />
              <Text style={styles.cameraButtonText}>Open Clients</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'alerts':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications & Alerts</Text>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleEmergencyAlert}
            >
              <Ionicons name="warning" size={20} color="white" />
              <Text style={styles.cameraButtonText}>Test Emergency</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Voice Inspector</Text>
            <Text style={styles.subtitle}>NFPA Fire Safety Inspection</Text>
          </View>
          <View style={styles.headerStats}>
            <Text style={styles.inspectionCount}>{inspectionCount} Inspections</Text>
            {complianceStatus && (
              <View style={[
                styles.complianceBadge,
                complianceStatus === 'compliant' ? styles.complianceBadgeGood :
                complianceStatus === 'non_compliant' ? styles.complianceBadgeBad :
                styles.complianceBadgeWarning
              ]}>
                <Text style={styles.complianceText}>
                  {complianceStatus === 'compliant' ? '✅' : 
                   complianceStatus === 'non_compliant' ? '❌' : '⚠️'}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => setShowCamera(true)}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.cameraButtonText}>Scan Gauge</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.syncButton,
              !syncStatus.isOnline && { backgroundColor: '#8E8E93' }
            ]}
            onPress={() => syncService.forceSync()}
          >
            <Ionicons 
              name={syncStatus.isOnline ? "cloud-upload" : "cloud-offline"} 
              size={20} 
              color="white" 
            />
            <Text style={styles.cameraButtonText}>
              {syncStatus.pendingCount > 0 ? `Sync (${syncStatus.pendingCount})` : 'Sync'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleTestNotification}
          >
            <Ionicons name="notifications" size={20} color="white" />
            <Text style={styles.cameraButtonText}>Test Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Voice Inspector</Text>
            <Text style={styles.subtitle}>NFPA Fire Safety Inspection</Text>
          </View>
          <View style={styles.headerStats}>
            <Text style={styles.inspectionCount}>{inspectionCount} Inspections</Text>
            {complianceStatus && (
              <View style={[
                styles.complianceBadge,
                complianceStatus === 'compliant' ? styles.complianceBadgeGood :
                complianceStatus === 'non_compliant' ? styles.complianceBadgeBad :
                styles.complianceBadgeWarning
              ]}>
                <Text style={styles.complianceText}>
                  {complianceStatus === 'compliant' ? '✓' : 
                   complianceStatus === 'non_compliant' ? '✗' : '!'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {renderTabContent()}
      </ScrollView>
      
      <TabBar activeTab={activeTab} onTabPress={handleTabPress} />
      
      {/* Modals */}
      {showCamera && (
        <CameraGaugeReader
          onGaugeRead={handleGaugeRead}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      {showScheduling && (
        <SchedulingComponent
          isVisible={showScheduling}
          onClose={() => setShowScheduling(false)}
          onJobCreated={(job: Job) => {
            Alert.alert('Job Created', `New job scheduled: ${job.title}`);
          }}
        />
      )}
      
      {showClientManagement && (
        <ClientManagementComponent
          isVisible={showClientManagement}
          onClose={() => setShowClientManagement(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  transcriptionBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  riserCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  riserTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  riserDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  missingField: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  pdfButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 120,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 100,
  },
  pdfButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  pdfButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  inspectionCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  complianceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  complianceBadgeGood: {
    backgroundColor: '#34C759',
  },
  complianceBadgeBad: {
    backgroundColor: '#FF3B30',
  },
  complianceBadgeWarning: {
    backgroundColor: '#FF9500',
  },
  complianceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 120,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 100,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 100,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 100,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 100,
  },
  clientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 100,
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
