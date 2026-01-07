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
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailySchedule, setDailySchedule] = useState<{ technician: string; jobs: Job[] }[]>([]);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');

  useEffect(() => {
    if (isVisible) {
      loadUpcomingJobs();
      loadDailySchedule();
    }
  }, [isVisible, selectedDate]);

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
          { text: 'OK', onPress: () => {
            setVoiceInput('');
            setShowVoiceInput(false);
            loadUpcomingJobs();
            loadDailySchedule();
            onJobCreated?.(job);
          }}
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
        <View style={styles.header}>
          <Text style={styles.title}>Scheduling & Dispatch</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Voice Input Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create New Job</Text>
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => setShowVoiceInput(true)}
            >
              <Ionicons name="mic" size={20} color="white" />
              <Text style={styles.voiceButtonText}>Speak Job Details</Text>
            </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  voiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  voiceInputContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  voiceInputTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  voiceInputExample: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  voiceInputField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
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
    backgroundColor: '#8E8E93',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  jobCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  jobLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  jobClient: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  jobDetail: {
    fontSize: 11,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  technicianSchedule: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  technicianName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noJobs: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  scheduleJob: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  scheduleJobTime: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  scheduleJobLocation: {
    fontSize: 11,
    color: '#666',
  },
});
