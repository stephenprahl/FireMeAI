import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Job, SchedulingService } from '../services/schedulingService';

interface SchedulingComponentProps {
  isVisible: boolean;
  onClose: () => void;
  onJobCreated?: (job: Job) => void;
  useModal?: boolean; // New prop to control modal usage
}

export default function SchedulingComponent({ isVisible, onClose, onJobCreated, useModal = true }: SchedulingComponentProps) {
  const [schedulingService] = useState(() => new SchedulingService());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailySchedule, setDailySchedule] = useState<{ technician: string; jobs: Job[] }[]>([]);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');

  useEffect(() => {
    if (isVisible) {
      loadJobs();
      loadUpcomingJobs();
      loadDailySchedule();
    }
  }, [isVisible, selectedDate]);

  const loadJobs = async () => {
    try {
      const todayJobs = await schedulingService.getJobsForDate(new Date());
      setJobs(todayJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadUpcomingJobs = async () => {
    try {
      const jobs = await schedulingService.getUpcomingJobs(7);
      setUpcomingJobs(jobs);
    } catch (error) {
      console.error('Error loading upcoming jobs:', error);
    }
  };

  const loadDailySchedule = async () => {
    try {
      const schedule = await schedulingService.generateDailySchedule(selectedDate);
      setDailySchedule(schedule);
    } catch (error) {
      console.error('Error loading daily schedule:', error);
    }
  };

  const handleCreateJobFromVoice = async () => {
    if (!voiceInput.trim()) {
      Alert.alert('Error', 'Please speak the job details first');
      return;
    }

    try {
      const job = await schedulingService.createJobFromVoiceInput(voiceInput);
      Alert.alert(
        'Job Created Successfully',
        `New job scheduled for ${job.scheduledDate.toLocaleDateString()} at ${job.scheduledDate.toLocaleTimeString()}`,
        [
          {
            text: 'OK', onPress: () => {
              setVoiceInput('');
              setShowVoiceInput(false);
              loadUpcomingJobs();
              loadDailySchedule();
              onJobCreated?.(job);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating job:', error);
      Alert.alert('Error', 'Failed to create job. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#007AFF';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#007AFF';
      case 'in_progress': return '#FF9500';
      case 'completed': return '#34C759';
      case 'cancelled': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const formatJobTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderContent = () => (
    <View style={styles.container}>
      {/* Professional Header */}
      <View style={styles.professionalHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1a365d" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Scheduling & Dispatch</Text>
              <Text style={styles.headerSubtitle}>Manage inspections and jobs</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowVoiceInput(true)}>
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Dashboard Overview */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="calendar" size={24} color="#2563eb" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{jobs.filter(j => j.status === 'scheduled').length}</Text>
                <Text style={styles.metricLabel}>Scheduled</Text>
              </View>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{jobs.filter(j => j.status === 'completed').length}</Text>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="time" size={24} color="#f59e42" />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{jobs.filter(j => j.status === 'in_progress').length}</Text>
                <Text style={styles.metricLabel}>In Progress</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upcoming Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
          {upcomingJobs.length > 0 ? (
            upcomingJobs.slice(0, 5).map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                    <Text style={styles.statusText}>{job.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.jobLocation}>{job.location}</Text>
                <Text style={styles.jobClient}>{job.clientName}</Text>
                <View style={styles.jobDetails}>
                  <Text style={styles.jobDetail}>
                    <Ionicons name="calendar" size={14} color="#666" />
                    {job.scheduledDate.toLocaleDateString()} at {formatJobTime(job.scheduledDate)}
                  </Text>
                  <Text style={styles.jobDetail}>
                    <Ionicons name="person" size={14} color="#666" />
                    {job.technician}
                  </Text>
                  <Text style={styles.jobDetail}>
                    <Ionicons name="time" size={14} color="#666" />
                    {job.estimatedDuration} hours
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No upcoming jobs scheduled</Text>
          )}
        </View>

        {/* Daily Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule for {selectedDate.toLocaleDateString()}</Text>
          {dailySchedule.length > 0 ? (
            dailySchedule.map((techSchedule, index) => (
              <View key={index} style={styles.technicianSchedule}>
                <Text style={styles.technicianName}>{techSchedule.technician}</Text>
                {techSchedule.jobs.map((job) => (
                  <View key={job.id} style={styles.jobItem}>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Text style={styles.jobClient}>{job.clientName}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                      <Text style={styles.priorityText}>{job.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No jobs scheduled for this date</Text>
          )}
        </View>
      </ScrollView>

      {/* Voice Input Modal */}
      <Modal visible={showVoiceInput} animationType="slide" transparent={true}>
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceModalTitle}>Create New Job</Text>
            <Text style={styles.voiceModalSubtitle}>Describe the job details</Text>
            <TextInput
              style={styles.voiceInput}
              value={voiceInput}
              onChangeText={setVoiceInput}
              placeholder="e.g., Schedule sprinkler inspection at 123 Main St for tomorrow at 2 PM"
              multiline
              numberOfLines={4}
            />
            <View style={styles.voiceModalActions}>
              <TouchableOpacity
                style={styles.voiceCancelButton}
                onPress={() => {
                  setShowVoiceInput(false);
                  setVoiceInput('');
                }}
              >
                <Text style={styles.voiceCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.voiceCreateButton}
                onPress={handleCreateJobFromVoice}
              >
                <Text style={styles.voiceCreateText}>Create Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return useModal ? (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      {renderContent()}
    </Modal>
  ) : (
    renderContent()
  );
}

const styles = StyleSheet.create({
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 6,
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

  // Jobs List
  jobsList: {
    gap: 12,
  },
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  jobClient: {
    fontSize: 14,
    color: '#64748b',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityUrgent: {
    backgroundColor: '#dc2626',
  },
  priorityHigh: {
    backgroundColor: '#d97706',
  },
  priorityNormal: {
    backgroundColor: '#059669',
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobDetails: {
    gap: 8,
    marginBottom: 12,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobAddress: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  jobTime: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobActionPrimary: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  jobActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
    marginLeft: 4,
  },
  jobActionPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  // Voice Input (keeping existing styles for modal)
  voiceInputContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voiceInputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  voiceInputExample: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  voiceInputField: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  voiceInputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#94a3b8',
  },
  createButton: {
    backgroundColor: '#2563eb',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },

  // Missing styles
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  jobLocation: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  technicianSchedule: {
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
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  noJobs: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  scheduleJob: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleJobTime: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  scheduleJobLocation: {
    fontSize: 12,
    color: '#64748b',
  },
  // Missing styles for voice modal
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  voiceModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  voiceModalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  voiceInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  voiceModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  voiceCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  voiceCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  voiceCreateButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  voiceCreateText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
