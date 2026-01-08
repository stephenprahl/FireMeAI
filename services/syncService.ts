import { NFPAInspection, VoiceTranscription } from '../types/nfpa';
import { PrismaDatabaseService } from './prismaDatabaseService';

// For React Native, we'll use a simpler approach
// In production, you can add @react-native-community/netinfo
// For now, we'll assume online and use manual sync

export class SyncService {
  private databaseService: PrismaDatabaseService;
  private isOnline: boolean = true;
  private syncInterval: any = null;
  private retryAttempts: number = 0;
  private maxRetries: number = 3;

  constructor(databaseService: PrismaDatabaseService) {
    this.databaseService = databaseService;
    this.initializeConnectivityMonitoring();
  }

  private initializeConnectivityMonitoring(): void {
    // Simple React Native approach - assume online for MVP
    this.isOnline = true;
    console.log('React Native environment - assuming online connectivity');

    // Start periodic sync
    this.startPeriodicSync();
  }

  private handleConnectionChange(online: boolean): void {
    this.isOnline = online;
    console.log(`Network status: ${online ? 'online' : 'offline'}`);

    if (online) {
      this.retryAttempts = 0;
      this.syncPendingData();
    }
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingData();
      }
    }, 30000);
  }

  async syncPendingData(): Promise<void> {
    if (!this.isOnline) {
      console.log('Device offline, skipping sync');
      return;
    }

    // Ensure database is initialized before syncing
    if (!this.databaseService["db"] || !this.databaseService["isInitialized"]) {
      try {
        await this.databaseService.initializeDatabase();
        console.log('Database was not initialized, now initialized for sync.');
      } catch (initError) {
        console.error('Failed to initialize database before sync:', initError);
        return;
      }
    }

    try {
      console.log('Starting sync of pending data...');
      const unsyncedData = await this.databaseService.getUnsyncedData();

      // Sync inspections
      for (const inspection of unsyncedData.inspections) {
        await this.syncInspection(inspection);
      }

      // Sync transcriptions
      for (const transcription of unsyncedData.transcriptions) {
        await this.syncTranscription(transcription);
      }

      console.log('Sync completed successfully');
      this.retryAttempts = 0;
    } catch (error) {
      console.error('Sync failed:', error);
      this.handleSyncError(error);
    }
  }

  private async syncInspection(inspection: NFPAInspection): Promise<void> {
    try {
      // In a real implementation, this would send data to your cloud backend
      const response = await this.sendToCloud('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inspection),
      });

      if (response.ok) {
        // Mark as synced locally
        await this.databaseService.markAsSynced('inspections', inspection.id);
        console.log(`Inspection ${inspection.id} synced successfully`);
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to sync inspection ${inspection.id}:`, error);
      throw error;
    }
  }

  private async syncTranscription(transcription: VoiceTranscription): Promise<void> {
    try {
      // In a real implementation, this would send data to your cloud backend
      const response = await this.sendToCloud('/api/transcriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transcription),
      });

      if (response.ok) {
        // Mark as synced locally
        await this.databaseService.markAsSynced('transcriptions', transcription.id);
        console.log(`Transcription ${transcription.id} synced successfully`);
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to sync transcription ${transcription.id}:`, error);
      throw error;
    }
  }

  private async sendToCloud(url: string, options: RequestInit): Promise<Response> {
    // Mock implementation for MVP
    // In production, this would be your actual API endpoint
    console.log(`Mock sending to ${url}:`, options.body);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful response 90% of the time
    if (Math.random() > 0.1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => 'OK',
      } as Response;
    } else {
      throw new Error('Simulated network error');
    }
  }

  private handleSyncError(error: any): void {
    this.retryAttempts++;

    if (this.retryAttempts < this.maxRetries) {
      console.log(`Retrying sync (${this.retryAttempts}/${this.maxRetries})...`);
      setTimeout(() => this.syncPendingData(), 5000 * this.retryAttempts);
    } else {
      console.error('Max retry attempts reached, giving up until next connectivity change');
      this.retryAttempts = 0;
    }
  }

  // Manual sync trigger
  async forceSync(): Promise<void> {
    console.log('Manual sync triggered');
    await this.syncPendingData();
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingInspections: number;
    pendingTranscriptions: number;
    lastSyncTime: Date | null;
  }> {
    const unsyncedData = await this.databaseService.getUnsyncedData();

    return {
      isOnline: this.isOnline,
      pendingInspections: unsyncedData.inspections.length,
      pendingTranscriptions: unsyncedData.transcriptions.length,
      lastSyncTime: new Date(), // In production, track actual last sync time
    };
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
