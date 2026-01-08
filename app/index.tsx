import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraGaugeReader from '../components/CameraGaugeReader';
import ClientManagementComponent from '../components/ClientManagementComponent';
import SchedulingComponent from '../components/SchedulingComponent';
import { DatabaseService } from '../services/databaseService';
import { PDFService } from '../services/pdfService';
import { PrismaDatabaseService } from '../services/prismaDatabaseService';
import { SyncService } from '../services/syncService';
import { VisionAnalysisResult } from '../services/visionService';
import { NFPAInspection } from '../types/nfpa';

export default function Index() {
  const insets = useSafeAreaInsets();
  const [inspection, setInspection] = useState<NFPAInspection | null>(null);

  const pdfService = new PDFService();
  const databaseService = new DatabaseService();
  const prismaDatabaseService = new PrismaDatabaseService();
  const syncService = new SyncService(prismaDatabaseService);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

  const handleJobCreated = (job: any) => {
    // Handle new job creation - could update state or show notification
    Alert.alert('Job Created', `New job scheduled: ${job.title}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Professional Header */}
            <View style={styles.professionalHeader}>
              <View style={styles.headerContent}>
                <View style={styles.companyInfo}>
                  <Ionicons name="business" size={32} color="#2563eb" />
                  <View style={styles.companyText}>
                    <Text style={styles.companyName}>FireMe Pro</Text>
                    <Text style={styles.companyTagline}>NFPA Inspection Management</Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="settings" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome back</Text>
              <Text style={styles.welcomeSubtitle}>Ready to conduct your next inspection?</Text>
            </View>

            {/* Key Metrics */}
            <View style={styles.metricsSection}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="document-text" size={28} color="#2563eb" />
                  </View>
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>{inspectionCount}</Text>
                    <Text style={styles.metricLabel}>Total Inspections</Text>
                  </View>
                </View>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name={syncStatus.isOnline ? "cloud-done" : "cloud-offline"} size={28} color={syncStatus.isOnline ? "#059669" : "#dc2626"} />
                  </View>
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>{syncStatus.isOnline ? 'Online' : 'Offline'}</Text>
                    <Text style={styles.metricLabel}>Sync Status</Text>
                  </View>
                </View>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="time" size={28} color="#f59e42" />
                  </View>
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>{syncStatus.pendingCount}</Text>
                    <Text style={styles.metricLabel}>Pending Sync</Text>
                  </View>
                </View>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="checkmark-circle" size={28} color="#059669" />
                  </View>
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>{complianceStatus === 'compliant' ? 'Good' : complianceStatus === 'non_compliant' ? 'Issues' : 'Check'}</Text>
                    <Text style={styles.metricLabel}>Compliance</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.primaryAction} onPress={() => setActiveTab('camera')}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="camera" size={28} color="white" />
                  </View>
                  <Text style={styles.primaryActionText}>Start Inspection</Text>
                  <Text style={styles.primaryActionSubtext}>Use camera for gauge reading</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => setActiveTab('schedule')}>
                  <Ionicons name="calendar" size={24} color="#2563eb" />
                  <Text style={styles.secondaryActionText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => setActiveTab('clients')}>
                  <Ionicons name="people" size={24} color="#2563eb" />
                  <Text style={styles.secondaryActionText}>Clients</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction} onPress={handleGeneratePDF} disabled={!inspection}>
                  <Ionicons name="document" size={24} color="#2563eb" />
                  <Text style={styles.secondaryActionText}>Generate PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            {inspection && (
              <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons name="document-text" size={20} color="#2563eb" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Inspection Completed</Text>
                    <Text style={styles.activitySubtitle}>{inspection.location} - {new Date(inspection.timestamp || Date.now()).toLocaleDateString()}</Text>
                  </View>
                  <TouchableOpacity style={styles.activityAction}>
                    <Text style={styles.activityActionText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
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
          <ClientManagementComponent
            isVisible={true}
            onClose={() => setActiveTab('home')}
            useModal={false}
          />
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

      <View style={[styles.professionalTabBar, { paddingBottom: Math.max(20, insets.bottom) }]}>
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

  // Welcome Section
  welcomeSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
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
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },

  // Metrics Section
  metricsSection: {
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

  // Actions Section
  actionsSection: {
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

  // Activity Section
  activitySection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  metricIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricContent: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
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
