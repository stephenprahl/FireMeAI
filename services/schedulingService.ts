export interface Job {
  id: string;
  title: string;
  location: string;
  scheduledDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  technician: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  estimatedDuration: number; // in hours
  clientName?: string;
  clientPhone?: string;
  systemType: 'sprinkler' | 'fire_alarm' | 'fire_pump' | 'emergency_lighting' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleRequest {
  type: 'inspection' | 'maintenance' | 'repair' | 'installation';
  location: string;
  clientInfo: {
    name: string;
    phone?: string;
    email?: string;
  };
  systemType: Job['systemType'];
  priority: Job['priority'];
  preferredDates: Date[];
  notes?: string;
  estimatedDuration: number;
}

export interface ScheduleConflict {
  conflictingJob: Job;
  conflictType: 'overlap' | 'technician_unavailable' | 'equipment_conflict';
  resolution: 'reschedule' | 'reassign' | 'accept';
}

export class SchedulingService {
  private jobs: Map<string, Job> = new Map();
  private technicians: string[] = ['John Smith', 'Mike Johnson', 'Sarah Davis', 'Tom Wilson'];
  
  constructor() {
    this.initializeSampleJobs();
  }

  private initializeSampleJobs(): void {
    // Initialize with some sample jobs for K&E Fire
    const sampleJobs: Job[] = [
      {
        id: 'job-1',
        title: 'Annual NFPA 25 Inspection',
        location: '123 Main St, Office Building',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'scheduled',
        technician: 'John Smith',
        priority: 'medium',
        estimatedDuration: 2,
        clientName: 'ABC Corporation',
        clientPhone: '555-0123',
        systemType: 'sprinkler',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'job-2',
        title: 'Emergency Repair - Leaking Valve',
        location: '456 Oak Ave, Warehouse',
        scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        status: 'scheduled',
        technician: 'Mike Johnson',
        priority: 'emergency',
        estimatedDuration: 3,
        clientName: 'XYZ Logistics',
        clientPhone: '555-0456',
        systemType: 'sprinkler',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleJobs.forEach(job => this.jobs.set(job.id, job));
  }

  async createJobFromVoiceInput(voiceInput: string): Promise<Job> {
    // Parse voice input to extract job details
    const parsedRequest = this.parseVoiceInput(voiceInput);
    
    // Find best available slot
    const availableSlot = this.findAvailableTimeSlot(
      parsedRequest.preferredDates,
      parsedRequest.estimatedDuration
    );

    if (!availableSlot) {
      throw new Error('No available time slots found for the requested dates');
    }

    // Create job
    const job: Job = {
      id: `job-${Date.now()}`,
      title: this.generateJobTitle(parsedRequest),
      location: parsedRequest.location,
      scheduledDate: availableSlot.date,
      status: 'scheduled',
      technician: availableSlot.technician,
      priority: parsedRequest.priority,
      estimatedDuration: parsedRequest.estimatedDuration,
      clientName: parsedRequest.clientInfo.name,
      clientPhone: parsedRequest.clientInfo.phone,
      systemType: parsedRequest.systemType,
      notes: parsedRequest.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(job.id, job);
    return job;
  }

  private parseVoiceInput(voiceInput: string): ScheduleRequest {
    // Simple parsing - in production, this would use AI
    const normalizedInput = voiceInput.toLowerCase();
    
    // Extract location
    const locationMatch = voiceInput.match(/(?:at|in|for)\s+([^,.]+?)(?:\s+(?:building|warehouse|office|facility))/i);
    const location = locationMatch ? locationMatch[1].trim() : 'Unknown Location';

    // Extract client name
    const clientMatch = voiceInput.match(/(?:for|client|customer)\s+([^,.]+?)(?:\s+(?:corporation|inc|llc|company))/i);
    const clientName = clientMatch ? clientMatch[1].trim() : 'Unknown Client';

    // Extract phone
    const phoneMatch = voiceInput.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
    const phone = phoneMatch ? phoneMatch[1] : undefined;

    // Determine priority
    let priority: Job['priority'] = 'medium';
    if (normalizedInput.includes('emergency') || normalizedInput.includes('urgent')) {
      priority = 'emergency';
    } else if (normalizedInput.includes('high priority')) {
      priority = 'high';
    } else if (normalizedInput.includes('low priority')) {
      priority = 'low';
    }

    // Determine system type
    let systemType: Job['systemType'] = 'sprinkler';
    if (normalizedInput.includes('fire alarm') || normalizedInput.includes('alarm')) {
      systemType = 'fire_alarm';
    } else if (normalizedInput.includes('fire pump') || normalizedInput.includes('pump')) {
      systemType = 'fire_pump';
    } else if (normalizedInput.includes('emergency light') || normalizedInput.includes('lighting')) {
      systemType = 'emergency_lighting';
    }

    // Estimate duration based on job type
    let estimatedDuration = 2; // default 2 hours
    if (priority === 'emergency') {
      estimatedDuration = 3;
    } else if (normalizedInput.includes('installation')) {
      estimatedDuration = 4;
    } else if (normalizedInput.includes('repair')) {
      estimatedDuration = 2.5;
    }

    return {
      type: 'inspection', // Default, could be enhanced with voice parsing
      location,
      clientInfo: {
        name: clientName,
        phone
      },
      systemType,
      priority,
      preferredDates: [new Date(Date.now() + 24 * 60 * 60 * 1000)], // Default to tomorrow
      notes: voiceInput,
      estimatedDuration
    };
  }

  private generateJobTitle(request: ScheduleRequest): string {
    const priorityPrefix = request.priority === 'emergency' ? 'EMERGENCY: ' : '';
    const systemTypeMap = {
      'sprinkler': 'Sprinkler System',
      'fire_alarm': 'Fire Alarm',
      'fire_pump': 'Fire Pump',
      'emergency_lighting': 'Emergency Lighting',
      'other': 'Fire Safety System'
    };

    return `${priorityPrefix}${systemTypeMap[request.systemType]} ${request.type === 'inspection' ? 'Inspection' : 'Service'}`;
  }

  private findAvailableTimeSlot(preferredDates: Date[], duration: number): { date: Date; technician: string } | null {
    for (const preferredDate of preferredDates) {
      for (const technician of this.technicians) {
        const isAvailable = this.isTechnicianAvailable(technician, preferredDate, duration);
        if (isAvailable) {
          return { date: new Date(preferredDate), technician };
        }
      }
    }
    return null;
  }

  private isTechnicianAvailable(technician: string, date: Date, duration: number): boolean {
    const endTime = new Date(date.getTime() + duration * 60 * 60 * 1000);
    
    for (const job of this.jobs.values()) {
      if (job.technician === technician && job.status !== 'cancelled') {
        const jobStart = new Date(job.scheduledDate);
        const jobEnd = new Date(jobStart.getTime() + job.estimatedDuration * 60 * 60 * 1000);
        
        // Check for overlap
        if ((date >= jobStart && date < jobEnd) || (endTime > jobStart && endTime <= jobEnd)) {
          return false;
        }
      }
    }
    return true;
  }

  async getJobsForDate(date: Date): Promise<Job[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.jobs.values()).filter(job => {
      const jobDate = new Date(job.scheduledDate);
      return jobDate >= startOfDay && jobDate <= endOfDay;
    });
  }

  async getJobsForTechnician(technician: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(job => 
      job.technician === technician && job.status !== 'cancelled'
    );
  }

  async updateJobStatus(jobId: string, status: Job['status']): Promise<Job> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    job.status = status;
    job.updatedAt = new Date();
    
    return job;
  }

  async rescheduleJob(jobId: string, newDate: Date): Promise<Job> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Check availability for new time
    const isAvailable = this.isTechnicianAvailable(job.technician, newDate, job.estimatedDuration);
    if (!isAvailable) {
      throw new Error('Technician not available at the requested time');
    }

    job.scheduledDate = newDate;
    job.updatedAt = new Date();
    
    return job;
  }

  async checkForConflicts(newJob: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    for (const existingJob of this.jobs.values()) {
      if (existingJob.technician === newJob.technician && existingJob.status !== 'cancelled') {
        const newJobStart = new Date(newJob.scheduledDate);
        const newJobEnd = new Date(newJobStart.getTime() + newJob.estimatedDuration * 60 * 60 * 1000);
        
        const existingJobStart = new Date(existingJob.scheduledDate);
        const existingJobEnd = new Date(existingJobStart.getTime() + existingJob.estimatedDuration * 60 * 60 * 1000);

        // Check for time overlap
        if ((newJobStart >= existingJobStart && newJobStart < existingJobEnd) || 
            (newJobEnd > existingJobStart && newJobEnd <= existingJobEnd)) {
          conflicts.push({
            conflictingJob: existingJob,
            conflictType: 'overlap',
            resolution: 'reschedule'
          });
        }
      }
    }

    return conflicts;
  }

  async generateDailySchedule(date: Date): Promise<{ technician: string; jobs: Job[] }[]> {
    const jobs = await this.getJobsForDate(date);
    const schedule: { technician: string; jobs: Job[] }[] = [];

    for (const technician of this.technicians) {
      const technicianJobs = jobs.filter(job => job.technician === technician);
      schedule.push({ technician, jobs: technicianJobs });
    }

    return schedule;
  }

  async getUpcomingJobs(days: number = 7): Promise<Job[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.jobs.values())
      .filter(job => job.scheduledDate >= now && job.scheduledDate <= futureDate)
      .filter(job => job.status !== 'cancelled')
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async deleteJob(jobId: string): Promise<void> {
    const deleted = this.jobs.delete(jobId);
    if (!deleted) {
      throw new Error('Job not found');
    }
  }
}
