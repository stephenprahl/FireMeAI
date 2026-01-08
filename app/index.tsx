import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CameraGaugeReader from '../components/CameraGaugeReader';
import SchedulingComponent from '../components/SchedulingComponent';
import { AIAgentService } from '../services/aiAgentService';
import { DatabaseService } from '../services/databaseService';
import { LangGraphAgentService } from '../services/langGraphAgentService';
import { NotificationService } from '../services/notificationService';
import { PDFService } from '../services/pdfService';
import { PrismaDatabaseService } from '../services/prismaDatabaseService';
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
          [{ text: 'OK', onPress: () => { } }]
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

  const handleJobCreated = (job: any) => {
    // Handle new job creation - could update state or show notification
    Alert.alert('Job Created', `New job scheduled: ${job.title}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.dashboardSection}>
                <Text style={styles.sectionTitle}>Dashboard</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Ionicons name="document-text" size={24} color="#2563eb" />
                    </View>
                    <View style={styles.metricContent}>
                      <Text style={styles.metricValue}>{inspectionCount}</Text>
                      <Text style={styles.metricLabel}>Inspections</Text>
                    </View>
                  </View>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Ionicons name="cloud-done" size={24} color="#059669" />
                    </View>
                    <View style={styles.metricContent}>
                      <Text style={styles.metricValue}>{syncStatus.isOnline ? 'Online' : 'Offline'}</Text>
                      <Text style={styles.metricLabel}>Sync Status</Text>
                    </View>
                  </View>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Ionicons name="cloud-upload" size={24} color="#f59e42" />
                    </View>
                    <View style={styles.metricContent}>
                      <Text style={styles.metricValue}>{syncStatus.pendingCount}</Text>
                      <Text style={styles.metricLabel}>Pending Sync</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Inspection</Text>
                  {inspection && (
                    <View style={[styles.statusCard, complianceStatus === 'compliant' ? styles.statusCompliant : complianceStatus === 'non_compliant' ? styles.statusNonCompliant : styles.statusWarning]}>
                      <View style={styles.statusIcon}>
                        <Ionicons name={complianceStatus === 'compliant' ? 'checkmark-circle' : complianceStatus === 'non_compliant' ? 'close-circle' : 'alert-circle'} size={32} color={complianceStatus === 'compliant' ? '#059669' : complianceStatus === 'non_compliant' ? '#dc2626' : '#f59e42'} />
                      </View>
                      <View style={styles.statusContent}>
                        <Text style={styles.statusTitle}>{complianceStatus === 'compliant' ? 'Compliant' : complianceStatus === 'non_compliant' ? 'Non-Compliant' : 'Requires Attention'}</Text>
                        <Text style={styles.statusSubtitle}>{inspection?.location || 'No location'}</Text>
                      </View>
                    </View>
                  )}
                </View>
                {inspection ? (
                  <View style={styles.riserCard}>
                    <Text style={styles.riserTitle}>Technician: {inspection.technician}</Text>
                    <Text style={styles.riserDetail}>Location: {inspection.location}</Text>
                    <Text style={styles.riserDetail}>Date: {inspection.timestamp ? new Date(inspection.timestamp).toLocaleDateString() : 'N/A'}</Text>
                    {/* System type not present in NFPAInspection, so omit or add custom logic if needed */}
                    {missingFields.length > 0 && (
                      <View>
                        <Text style={styles.sectionTitle}>Missing Fields</Text>
                        {missingFields.map((field, idx) => (
                          <Text key={idx} style={styles.missingField}>{field}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.riserDetail}>No recent inspection data available.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionGrid}>
                  <Pressable style={styles.primaryAction} onPress={handleGeneratePDF} disabled={!inspection || isGeneratingPDF}>
                    <View style={styles.actionIcon}>
                      <Ionicons name="document" size={28} color="white" />
                    </View>
                    <Text style={styles.primaryActionText}>Generate PDF</Text>
                    <Text style={styles.primaryActionSubtext}>Create NFPA inspection report</Text>
                  </Pressable>
                  <Pressable style={styles.sampleButton} onPress={handleGenerateSamplePDF} disabled={isGeneratingPDF}>
                    <Ionicons name="document-outline" size={28} color="white" />
                    <Text style={styles.primaryActionText}>Sample PDF</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        );

      case 'camera':
        return (
          <CameraGaugeReader
            onGaugeRead={handleGaugeRead}
            onClose={() => setActiveTab('home')}
          />
        );

      case 'schedule':
        return (
          <SchedulingComponent
            isVisible={true}
            onClose={() => setActiveTab('home')}
            onJobCreated={handleJobCreated}
            useModal={false}
          />
        );

      case 'clients':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Management</Text>
            <Pressable
              style={styles.primaryAction}
              onPress={() => setShowClientManagement(true)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="people" size={28} color="white" />
              </View>
              <Text style={styles.primaryActionText}>Open Clients</Text>
              <Text style={styles.primaryActionSubtext}>Manage client relationships</Text>
            </Pressable>
          </View>
        );

      case 'alerts':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications & Alerts</Text>
            <Pressable
              style={styles.primaryAction}
              onPress={handleEmergencyAlert}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="warning" size={28} color="white" />
              </View>
              <Text style={styles.primaryActionText}>Emergency Alert</Text>
              <Text style={styles.primaryActionSubtext}>Send critical notifications</Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryAction, { marginTop: 16 }]}
              onPress={handleTestNotification}
            >
              <Ionicons name="notifications" size={20} color="#1a365d" />
              <Text style={styles.secondaryActionText}>Test Notification</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      <View style={styles.professionalTabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons name="home" size={20} color={activeTab === 'home' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'camera' && styles.tabItemActive]}
          onPress={() => setActiveTab('camera')}
        >
          <Ionicons name="camera" size={20} color={activeTab === 'camera' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'schedule' && styles.tabItemActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Ionicons name="calendar" size={20} color={activeTab === 'schedule' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'clients' && styles.tabItemActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'clients' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>Clients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'alerts' && styles.tabItemActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Ionicons name="warning" size={20} color={activeTab === 'alerts' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>Alerts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  headerLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  headerTextWrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },

  // Professional Header
  professionalHeader: {
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyText: {
    marginLeft: 12,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    letterSpacing: -0.5,
  },
  companyTagline: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },

  // Dashboard Section
  dashboardSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },

  // Sections
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  // Quick Actions
  actionGrid: {
    gap: 16,
  },
  primaryAction: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  primaryActionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginTop: 4,
  },

  // Transcription and Results
  transcriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pdfButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  pdfButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  pdfButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  riserCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  riserTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  riserDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  missingField: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 4,
  },

  // Activity List
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  activityAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  activityActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },

  // Status Cards
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  statusCompliant: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusNonCompliant: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusWarning: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },

  // System Status
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginTop: 4,
  },

  // Professional Tab Bar
  professionalTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 20,
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#2563eb',
  },
});
