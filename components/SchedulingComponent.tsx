import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Job, SchedulingService } from '../services/schedulingService';

interface SchedulingComponentProps {
  isVisible: boolean;
  onClose: () => void;
  onJobCreated?: (job: Job) => void;
}

export default function SchedulingComponent({ isVisible, onClose, onJobCreated }: SchedulingComponentProps) {
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

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
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
                  <Text style={styles.metricLabel}>Scheduled Today</Text>
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
                  <Ionicons name="time" size={24} color="#d97706" />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>{jobs.filter(j => j.status === 'in_progress').length}</Text>
                  <Text style={styles.metricLabel}>In Progress</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricIcon}>
                  <Ionicons name="alert-circle" size={24} color="#dc2626" />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>{jobs.filter(j => j.priority === 'emergency').length}</Text>
                  <Text style={styles.metricLabel}>Urgent</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => setShowVoiceInput(true)}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="mic" size={28} color="white" />
                </View>
                <Text style={styles.primaryActionText}>Create Job</Text>
                <Text style={styles.primaryActionSubtext}>Voice-guided job creation</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity style={styles.secondaryAction}>
                  <Ionicons name="calendar" size={20} color="#1a365d" />
                  <Text style={styles.secondaryActionText}>Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryAction}>
                  <Ionicons name="map" size={20} color="#1a365d" />
                  <Text style={styles.secondaryActionText}>Routes</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryAction}>
                  <Ionicons name="people" size={20} color="#1a365d" />
                  <Text style={styles.secondaryActionText}>Teams</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryAction}>
                  <Ionicons name="stats-chart" size={20} color="#1a365d" />
                  <Text style={styles.secondaryActionText}>Reports</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Jobs List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Jobs</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter" size={16} color="#64748b" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {jobs.length > 0 ? (
              <View style={styles.jobsList}>
                {jobs.map((job) => (
                  <View key={job.id} style={styles.jobCard}>
                    <View style={styles.jobHeader}>
                      <View style={styles.jobInfo}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <Text style={styles.jobClient}>{job.clientName}</Text>
                      </View>
                      <View style={[
                        styles.priorityBadge,
                        job.priority === 'emergency' ? styles.priorityUrgent :
                          job.priority === 'high' ? styles.priorityHigh :
                            styles.priorityNormal
                      ]}>
                        <Text style={styles.priorityText}>
                          {job.priority?.toUpperCase() || 'NORMAL'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.jobDetails}>
                      <View style={styles.jobDetail}>
                        <Ionicons name="location" size={16} color="#64748b" />
                        <Text style={styles.jobAddress}>{job.location}</Text>
                      </View>
                      <View style={styles.jobDetail}>
                        <Ionicons name="time" size={16} color="#64748b" />
                        <Text style={styles.jobTime}>
                          {new Date(job.scheduledDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.jobActions}>
                      <TouchableOpacity style={styles.jobAction}>
                        <Ionicons name="call" size={16} color="#2563eb" />
                        <Text style={styles.jobActionText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.jobAction}>
                        <Ionicons name="navigate" size={16} color="#2563eb" />
                        <Text style={styles.jobActionText}>Navigate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[
                        styles.jobAction,
                        styles.jobActionPrimary
                      ]}>
                        <Text style={styles.jobActionPrimaryText}>Start Job</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No jobs scheduled</Text>
                <Text style={styles.emptySubtitle}>Create a new job to get started</Text>
              </View>
            )}
          </View>

          {/* Voice Input Modal */}
          {showVoiceInput && (
            <View style={styles.voiceInputContainer}>
              <Text style={styles.voiceInputTitle}>Describe the job:</Text>
              <Text style={styles.voiceInputExample}>
                "Emergency repair at 123 Main St for ABC Corporation. Sprinkler system leaking valve. Priority emergency."
              </Text>
              <TextInput
                style={styles.voiceInputField}
                value={voiceInput}
                onChangeText={setVoiceInput}
                placeholder="Type or paste voice transcription here..."
                multiline
              />
              <View style={styles.voiceInputActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowVoiceInput(false);
                    setVoiceInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.createButton]}
                  onPress={handleCreateJobFromVoice}
                >
                  <Text style={styles.createButtonText}>Create Job</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Upcoming Jobs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Jobs (Next 7 Days)</Text>
            {upcomingJobs.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming jobs scheduled</Text>
            ) : (
              upcomingJobs.map(job => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                      <Text style={styles.priorityText}>{job.priority.toUpperCase()}</Text>
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                    <Text style={styles.statusText}>{job.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Daily Schedule */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Schedule for {selectedDate.toLocaleDateString()}</Text>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {dailySchedule.map(({ technician, jobs }) => (
              <View key={technician} style={styles.technicianSchedule}>
                <Text style={styles.technicianName}>{technician}</Text>
                {jobs.length === 0 ? (
                  <Text style={styles.noJobs}>No jobs scheduled</Text>
                ) : (
                  jobs.map(job => (
                    <View key={job.id} style={styles.scheduleJob}>
                      <Text style={styles.scheduleJobTime}>
                        {formatJobTime(job.scheduledDate)} - {job.title}
                      </Text>
                      <Text style={styles.scheduleJobLocation}>{job.location}</Text>
                    </View>
                  ))
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
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
});
