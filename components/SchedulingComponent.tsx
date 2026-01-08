import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const today = new Date();
    const jobDate = new Date(job.scheduledDate);
    
    let matchesTimeFilter = true;
    switch (selectedFilter) {
      case 'today':
        matchesTimeFilter = jobDate.toDateString() === today.toDateString();
        break;
      case 'week':
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        matchesTimeFilter = jobDate >= today && jobDate <= weekFromNow;
        break;
      case 'month':
        const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        matchesTimeFilter = jobDate >= today && jobDate <= monthFromNow;
        break;
    }
    
    return matchesSearch && matchesTimeFilter;
  });

  const handleJobPress = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const handleJobStatusUpdate = async (jobId: string, newStatus: Job['status']) => {
    try {
      await schedulingService.updateJobStatus(jobId, newStatus);
      loadJobs();
      loadUpcomingJobs();
      loadDailySchedule();
      Alert.alert('Success', 'Job status updated successfully');
    } catch (error) {
      console.error('Error updating job status:', error);
      Alert.alert('Error', 'Failed to update job status');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await schedulingService.deleteJob(jobId);
              loadJobs();
              loadUpcomingJobs();
              loadDailySchedule();
              Alert.alert('Success', 'Job deleted successfully');
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            }
          }
        }
      ]
    );
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

  const renderCalendarView = () => {
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const days = [];
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }
      return days;
    };

    const getJobsForDay = (day: number) => {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      return filteredJobs.filter(job => {
        const jobDate = new Date(job.scheduledDate);
        return jobDate.toDateString() === date.toDateString();
      });
    };

    const days = getDaysInMonth(selectedDate);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}>
            <Ionicons name="chevron-back" size={20} color="#2563eb" />
          </Pressable>
          <Text style={styles.calendarTitle}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}>
            <Ionicons name="chevron-forward" size={20} color="#2563eb" />
          </Pressable>
        </View>
        
        <View style={styles.weekDays}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
            }
            
            const dayJobs = getJobsForDay(day);
            const isToday = new Date().toDateString() === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day).toDateString();
            const isSelected = selectedDate.getDate() === day;
            
            return (
              <Pressable
                key={day}
                style={[
                  styles.calendarDay,
                  isToday && styles.calendarDayToday,
                  isSelected && styles.calendarDaySelected
                ]}
                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
              >
                <Text style={[
                  styles.calendarDayText,
                  isToday && styles.calendarDayTextToday,
                  isSelected && styles.calendarDayTextSelected
                ]}>
                  {day}
                </Text>
                {dayJobs.length > 0 && (
                  <View style={styles.calendarDayDots}>
                    {dayJobs.slice(0, 3).map((_, index) => (
                      <View key={index} style={styles.calendarDayDot} />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        
        <View style={styles.calendarLegend}>
          <Text style={styles.calendarLegendText}>Jobs per day</Text>
          <View style={styles.calendarLegendDots}>
            <View style={styles.calendarDayDot} />
            <Text style={styles.calendarLegendText}>1 job</Text>
            <View style={[styles.calendarDayDot, styles.calendarDayDot2]} />
            <Text style={styles.calendarLegendText}>2 jobs</Text>
            <View style={[styles.calendarDayDot, styles.calendarDayDot3]} />
            <Text style={styles.calendarLegendText}>3+ jobs</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => (
    <View style={styles.container}>
      {!useModal && (
        <>
          {/* Professional Header */}
          <View style={styles.professionalHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Pressable onPress={onClose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#1a365d" />
                </Pressable>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>Scheduling & Dispatch</Text>
                  <Text style={styles.headerSubtitle}>Manage inspections and jobs</Text>
                </View>
              </View>
              <Pressable style={styles.addButton} onPress={() => setShowVoiceInput(true)}>
                <Ionicons name="add" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </>
      )}

      <ScrollView style={[styles.content, !useModal && { paddingBottom: 80 }]}>
        {/* Status Overview */}
        <View style={styles.statusOverview}>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{jobs.filter(j => j.status === 'scheduled').length}</Text>
            <Text style={styles.statusLabel}>Scheduled Today</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{jobs.filter(j => j.status === 'in_progress').length}</Text>
            <Text style={styles.statusLabel}>In Progress</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{jobs.filter(j => j.status === 'completed').length}</Text>
            <Text style={styles.statusLabel}>Completed</Text>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchFilterSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, locations, clients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#64748b"
            />
          </View>
          
          <View style={styles.filterRow}>
            <View style={styles.filterButtons}>
              {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterButton,
                    selectedFilter === filter && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === filter && styles.filterButtonTextActive
                  ]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.controlRow}>
            <View style={styles.viewModeToggle}>
              <Pressable
                style={[
                  styles.viewModeButton,
                  viewMode === 'list' && styles.viewModeButtonActive
                ]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list" size={16} color={viewMode === 'list' ? '#ffffff' : '#64748b'} />
                <Text style={[
                  styles.viewModeText,
                  viewMode === 'list' && styles.viewModeTextActive
                ]}>List</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.viewModeButton,
                  viewMode === 'calendar' && styles.viewModeButtonActive
                ]}
                onPress={() => setViewMode('calendar')}
              >
                <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? '#ffffff' : '#64748b'} />
                <Text style={[
                  styles.viewModeText,
                  viewMode === 'calendar' && styles.viewModeTextActive
                ]}>Calendar</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Pressable style={styles.primaryActionButton} onPress={() => setShowVoiceInput(true)}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.primaryActionText}>Schedule New Job</Text>
          </Pressable>
        </View>

        {/* Jobs Display */}
        <View style={styles.jobsSection}>
          {viewMode === 'calendar' ? (
            renderCalendarView()
          ) : (
            <>
              <Text style={styles.sectionTitle}>Upcoming Jobs ({filteredJobs.length})</Text>
              {filteredJobs.length > 0 ? (
                filteredJobs.slice(0, 5).map((job) => (
                  <Pressable key={job.id} style={styles.jobCard} onPress={() => handleJobPress(job)}>
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                        <Text style={styles.statusText}>{job.status.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.jobLocation}>{job.location}</Text>
                    <Text style={styles.jobClient}>{job.clientName}</Text>
                    <View style={styles.jobDetails}>
                      <View style={styles.jobDetail}>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                        <Text style={styles.jobDetailText}>{job.scheduledDate.toLocaleDateString()} at {formatJobTime(job.scheduledDate)}</Text>
                      </View>
                      <View style={styles.jobDetail}>
                        <Ionicons name="person-outline" size={14} color="#64748b" />
                        <Text style={styles.jobDetailText}>{job.technician}</Text>
                      </View>
                      <View style={styles.jobDetail}>
                        <Ionicons name="time-outline" size={14} color="#64748b" />
                        <Text style={styles.jobDetailText}>{job.estimatedDuration} hours</Text>
                      </View>
                    </View>
                    <View style={styles.jobActions}>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                        <Text style={styles.priorityText}>{job.priority.toUpperCase()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#64748b" />
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>No jobs found matching your criteria</Text>
              )}
            </>
          )}
        </View>

        {/* Daily Schedule */}
        <View style={styles.scheduleSection}>
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
              <Pressable
                style={styles.voiceCancelButton}
                onPress={() => {
                  setShowVoiceInput(false);
                  setVoiceInput('');
                }}
              >
                <Text style={styles.voiceCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.voiceCreateButton}
                onPress={handleCreateJobFromVoice}
              >
                <Text style={styles.voiceCreateText}>Create Job</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Job Details Modal */}
      <Modal visible={showJobDetails} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.jobDetailsContainer}>
          <View style={styles.jobDetailsHeader}>
            <Pressable onPress={() => setShowJobDetails(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </Pressable>
            <Text style={styles.jobDetailsTitle}>Job Details</Text>
            <Pressable onPress={() => selectedJob && handleDeleteJob(selectedJob.id)} style={styles.deleteButton}>
              <Ionicons name="trash" size={20} color="#dc2626" />
            </Pressable>
          </View>
          
          {selectedJob && (
            <ScrollView style={styles.jobDetailsContent}>
              <View style={styles.jobDetailSection}>
                <Text style={styles.jobDetailSectionTitle}>Job Information</Text>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Title:</Text>
                  <Text style={styles.jobDetailValue}>{selectedJob.title}</Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Location:</Text>
                  <Text style={styles.jobDetailValue}>{selectedJob.location}</Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Client:</Text>
                  <Text style={styles.jobDetailValue}>{selectedJob.clientName}</Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>System Type:</Text>
                  <Text style={styles.jobDetailValue}>{selectedJob.systemType.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.jobDetailSection}>
                <Text style={styles.jobDetailSectionTitle}>Scheduling</Text>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Date & Time:</Text>
                  <Text style={styles.jobDetailValue}>
                    {selectedJob.scheduledDate.toLocaleDateString()} at {formatJobTime(selectedJob.scheduledDate)}
                  </Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Technician:</Text>
                  <Text style={styles.jobDetailValue}>{selectedJob.technician}</Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Duration:</Text>
                  <Text style={styles.jobDetailValue}>{selectedJob.estimatedDuration} hours</Text>
                </View>
              </View>

              <View style={styles.jobDetailSection}>
                <Text style={styles.jobDetailSectionTitle}>Status & Priority</Text>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedJob.status) }]}>
                    <Text style={styles.statusText}>{selectedJob.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Priority:</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedJob.priority) }]}>
                    <Text style={styles.priorityText}>{selectedJob.priority.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {selectedJob.notes && (
                <View style={styles.jobDetailSection}>
                  <Text style={styles.jobDetailSectionTitle}>Notes</Text>
                  <Text style={styles.jobDetailNotes}>{selectedJob.notes}</Text>
                </View>
              )}

              <View style={styles.jobDetailActions}>
                {selectedJob.status === 'scheduled' && (
                  <Pressable 
                    style={styles.actionButton} 
                    onPress={() => handleJobStatusUpdate(selectedJob.id, 'in_progress')}
                  >
                    <Ionicons name="play" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Start Job</Text>
                  </Pressable>
                )}
                {selectedJob.status === 'in_progress' && (
                  <Pressable 
                    style={styles.actionButton} 
                    onPress={() => handleJobStatusUpdate(selectedJob.id, 'completed')}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Complete Job</Text>
                  </Pressable>
                )}
                {selectedJob.status === 'completed' && (
                  <Pressable 
                    style={[styles.actionButton, styles.actionButtonSecondary]} 
                    onPress={() => handleJobStatusUpdate(selectedJob.id, 'scheduled')}
                  >
                    <Ionicons name="refresh" size={16} color="#2563eb" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Reopen Job</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          )}
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
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },

  // Professional Header
  professionalHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingTop: 45,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status Overview
  statusOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 12,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Search and Filters
  searchFilterSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterRow: {
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 2,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  viewModeButtonActive: {
    backgroundColor: '#2563eb',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  viewModeTextActive: {
    color: '#ffffff',
  },
  technicianFilter: {
    flex: 1,
    alignItems: 'flex-end',
  },
  technicianFilterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  technicianScroll: {
    flexDirection: 'row',
  },
  technicianChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  technicianChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  technicianChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  technicianChipTextActive: {
    color: '#ffffff',
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  primaryActionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  jobsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  upcomingSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  scheduleSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },

  // Jobs List
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  jobLocation: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  jobClient: {
    fontSize: 14,
    color: '#64748b',
  },
  jobDetails: {
    gap: 8,
    marginTop: 12,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDetailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty State
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
    marginVertical: 20,
  },

  // Technician Schedule
  technicianSchedule: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
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
  jobInfo: {
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Voice Modal
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  voiceModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  voiceInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
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
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voiceCancelText: {
    color: '#64748b',
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },

  // Job Details Modal
  jobDetailsContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  jobDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 8,
  },
  jobDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  deleteButton: {
    padding: 8,
  },
  jobDetailsContent: {
    flex: 1,
    padding: 24,
  },
  jobDetailSection: {
    marginBottom: 24,
  },
  jobDetailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  jobDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  jobDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    flex: 1,
  },
  jobDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 2,
    textAlign: 'right',
  },
  jobDetailNotes: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobDetailActions: {
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonTextSecondary: {
    color: '#2563eb',
  },

  // Calendar View
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayEmpty: {
    width: '14.28%',
    height: 40,
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  calendarDayToday: {
    backgroundColor: '#f8fafc',
  },
  calendarDaySelected: {
    backgroundColor: '#2563eb',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  calendarDayTextToday: {
    color: '#2563eb',
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#ffffff',
  },
  calendarDayDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  calendarDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563eb',
  },
  calendarDayDot2: {
    backgroundColor: '#2563eb',
  },
  calendarDayDot3: {
    backgroundColor: '#2563eb',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  calendarLegendText: {
    fontSize: 12,
    color: '#64748b',
  },
  calendarLegendDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
