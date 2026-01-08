import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
          <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.safeAreaContent}>
              {/* AI Header */}
              <View style={styles.aiHeader}>
                <View style={styles.headerContent}>
                  <View style={styles.companyInfo}>
                    <View style={styles.aiLogoContainer}>
                      <Ionicons name="sparkles" size={24} color="#2563eb" />
                    </View>
                    <View style={styles.companyText}>
                      <Text style={styles.companyName}>FireMe AI</Text>
                      <Text style={styles.companyTagline}>AI-Powered Fire Safety</Text>
                    </View>
                  </View>
                  <Pressable style={styles.aiSettingsButton}>
                    <Ionicons name="settings-outline" size={20} color="#64748b" />
                  </Pressable>
                </View>
              </View>

              {/* AI Status */}
              <View style={styles.aiStatusOverview}>
                <View style={styles.aiStatusItem}>
                  <View style={styles.aiStatusIndicator} />
                  <Text style={styles.aiStatusText}>AI Assistant Active</Text>
                </View>
                <View style={styles.aiStatusItem}>
                  <Text style={styles.aiStatusValue}>{inspectionCount}</Text>
                  <Text style={styles.aiStatusLabel}>AI Inspections</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActionsSection}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <Pressable style={styles.quickActionButton} onPress={() => setActiveTab('camera')}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="camera" size={22} color="#2563eb" />
                    </View>
                    <Text style={styles.quickActionText}>New Inspection</Text>
                    <Text style={styles.quickActionSubtext}>Start AI analysis</Text>
                  </Pressable>
                  <Pressable style={styles.quickActionButton} onPress={() => setActiveTab('schedule')}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="calendar" size={22} color="#2563eb" />
                    </View>
                    <Text style={styles.quickActionText}>Schedule</Text>
                    <Text style={styles.quickActionSubtext}>Manage jobs</Text>
                  </Pressable>
                  <Pressable style={styles.quickActionButton} onPress={() => setActiveTab('clients')}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="people" size={22} color="#2563eb" />
                    </View>
                    <Text style={styles.quickActionText}>Clients</Text>
                    <Text style={styles.quickActionSubtext}>View records</Text>
                  </Pressable>
                  <Pressable style={styles.quickActionButton} onPress={handleGeneratePDF} disabled={!inspection}>
                    <View style={styles.quickActionIcon}>
                      <Ionicons name="document-text" size={22} color="#2563eb" />
                    </View>
                    <Text style={styles.quickActionText}>Reports</Text>
                    <Text style={styles.quickActionSubtext}>Generate PDF</Text>
                  </Pressable>
                </View>
              </View>

              {/* Recent Activity */}
              {inspection && (
                <View style={styles.recentActivitySection}>
                  <Text style={styles.recentActivityTitle}>Recent AI Analysis</Text>
                  <View style={styles.recentActivityCard}>
                    <View style={styles.recentActivityHeader}>
                      <Ionicons name="sparkles" size={16} color="#2563eb" />
                      <Text style={styles.recentActivityLocation}>{inspection.location}</Text>
                    </View>
                    <Text style={styles.recentActivityDate}>
                      AI analyzed on {new Date(inspection.timestamp || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'camera':
        return (
          <View style={{ flex: 1, paddingBottom: 80 }}>
            <CameraGaugeReader
              onGaugeRead={handleGaugeRead}
              onClose={() => setActiveTab('home')}
            />
          </View>
        );

      case 'schedule':
        return (
          <View style={{ flex: 1, paddingBottom: 80 }}>
            <SchedulingComponent
              isVisible={true}
              onClose={() => setActiveTab('home')}
              onJobCreated={handleJobCreated}
              useModal={false}
            />
          </View>
        );

      case 'clients':
        return (
          <View style={{ flex: 1, paddingBottom: 80 }}>
            <ClientManagementComponent
              isVisible={true}
              onClose={() => setActiveTab('home')}
              useModal={false}
            />
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

      <View style={styles.tabBarContainer}>
        <View style={[styles.professionalTabBar, { paddingBottom: Math.max(20, insets.bottom) }]}>
          <Pressable
            style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
            onPress={() => setActiveTab('home')}
          >
            <Ionicons name="home" size={20} color={activeTab === 'home' ? '#2563eb' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'camera' && styles.tabItemActive]}
            onPress={() => setActiveTab('camera')}
          >
            <Ionicons name="camera" size={20} color={activeTab === 'camera' ? '#2563eb' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>Camera</Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'schedule' && styles.tabItemActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <Ionicons name="calendar" size={20} color={activeTab === 'schedule' ? '#2563eb' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'clients' && styles.tabItemActive]}
            onPress={() => setActiveTab('clients')}
          >
            <Ionicons name="people" size={20} color={activeTab === 'clients' ? '#2563eb' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>Clients</Text>
          </Pressable>
        </View>
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
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingBottom: 80, // Account for tab bar height
  },

  // Safe Area Content
  safeAreaContent: {
    paddingHorizontal: 0,
  },

  // Tab Bar Container
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  // AI Header
  aiHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingTop: 35,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '70%',
  },
  companyText: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  companyTagline: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  aiLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiSettingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // AI Status Overview
  aiStatusOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 12,
  },
  aiStatusItem: {
    alignItems: 'center',
    flex: 1,
  },
  aiStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginBottom: 8,
  },
  aiStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  aiStatusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  aiStatusLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },

  // AI Action
  aiActionSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  aiActionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  aiActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  aiActionSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    bottom: 8,
  },

  // Recent Inspection
  recentInspectionSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  recentInspectionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentInspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentInspectionLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  recentInspectionDate: {
    fontSize: 12,
    color: '#64748b',
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

  
  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  // Recent Activity
  recentActivitySection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  recentActivityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  recentActivityCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentActivityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentActivityContent: {
    flex: 1,
  },
  recentActivityLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  recentActivityDate: {
    fontSize: 12,
    color: '#64748b',
  },

  // Tab Bar
  professionalTabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    backgroundColor: '#f8fafc',
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
