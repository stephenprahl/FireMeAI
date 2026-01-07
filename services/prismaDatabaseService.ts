import { NFPAInspection, VoiceTranscription } from '../types/nfpa';

export class PrismaDatabaseService {
  private db: any = null;
  private isInitialized = false;

  async initializeDatabase(): Promise<void> {
    try {
      // Use expo-sqlite for React Native compatibility
      const SQLite = require('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('nfpai.db');
      
      // Create tables using Prisma schema structure
      await this.createTables();
      this.isInitialized = true;
      
      console.log('Prisma Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Prisma database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create inspections table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        location TEXT NOT NULL,
        technician TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create risers table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS risers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id TEXT NOT NULL,
        riser_number INTEGER NOT NULL,
        static_pressure REAL,
        residual_pressure REAL,
        control_valve_status TEXT,
        butterfly_valve_status TEXT,
        corrosion TEXT,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE
      );
    `);

    // Create gauge_readings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS gauge_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        riser_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        pressure REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'psi',
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (riser_id) REFERENCES risers (id) ON DELETE CASCADE
      );
    `);

    // Create transcriptions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        audio_file TEXT NOT NULL,
        transcription TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        inspection_id TEXT,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE
      );
    `);

    // Create jobs table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        technician TEXT,
        notes TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Prisma-like methods with type safety
  async createInspection(data: Omit<NFPAInspection, 'id'>): Promise<NFPAInspection> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `inspection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const inspection: NFPAInspection = {
      ...data,
      id,
      timestamp: data.timestamp || new Date(),
    };

    await this.db.withTransactionAsync(async () => {
      // Insert inspection
      await this.db.runAsync(
        `INSERT INTO inspections 
         (id, timestamp, location, technician, notes, status, sync_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          inspection.timestamp.toISOString(),
          inspection.location,
          inspection.technician,
          inspection.notes || null,
          inspection.status,
          'pending',
          now,
          now
        ]
      );

      // Delete existing risers for this inspection (in case of update)
      await this.db.runAsync(
        'DELETE FROM risers WHERE inspection_id = ?',
        [inspection.id]
      );

      // Insert risers
      for (const riser of inspection.risers) {
        const riserResult = await this.db.runAsync(
          `INSERT INTO risers
           (inspection_id, riser_number, static_pressure, residual_pressure, 
            control_valve_status, butterfly_valve_status, corrosion) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            inspection.id,
            riser.riserNumber,
            riser.staticPressure,
            riser.residualPressure,
            riser.controlValveStatus,
            riser.butterflyValveStatus,
            riser.corrosion
          ]
        );

        const riserId = riserResult.lastInsertRowId;

        // Insert gauge readings
        for (const reading of riser.gaugeReadings) {
          await this.db.runAsync(
            `INSERT INTO gauge_readings 
             (riser_id, type, pressure, unit, timestamp) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              riserId,
              reading.type,
              reading.pressure,
              reading.unit,
              reading.timestamp.toISOString()
            ]
          );
        }
      }
    });

    return inspection;
  }

  async findManyInspections(options?: { 
    where?: { syncStatus?: string }, 
    orderBy?: { timestamp?: 'asc' | 'desc' } 
  }): Promise<NFPAInspection[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM inspections';
    const params: any[] = [];

    if (options?.where?.syncStatus) {
      query += ' WHERE sync_status = ?';
      params.push(options.where.syncStatus);
    }

    if (options?.orderBy?.timestamp) {
      query += ` ORDER BY timestamp ${options.orderBy.timestamp.toUpperCase()}`;
    }

    const rows = await this.db.getAllAsync(query, params) as any[];
    
    const inspections: NFPAInspection[] = [];
    
    for (const row of rows) {
      const risers = await this.db.getAllAsync(
        'SELECT * FROM risers WHERE inspection_id = ?',
        [row.id]
      ) as any[];

      const inspectionRisers = [];
      
      for (const riserRow of risers) {
        const gaugeReadings = await this.db.getAllAsync(
          'SELECT * FROM gauge_readings WHERE riser_id = ?',
          [riserRow.id]
        ) as any[];

        inspectionRisers.push({
          riserNumber: riserRow.riser_number,
          staticPressure: riserRow.static_pressure,
          residualPressure: riserRow.residual_pressure,
          controlValveStatus: riserRow.control_valve_status,
          butterflyValveStatus: riserRow.butterfly_valve_status,
          corrosion: riserRow.corrosion,
          gaugeReadings: gaugeReadings.map((reading: any) => ({
            type: reading.type,
            pressure: reading.pressure,
            unit: reading.unit,
            timestamp: new Date(reading.timestamp)
          }))
        });
      }

      inspections.push({
        id: row.id,
        timestamp: new Date(row.timestamp),
        location: row.location,
        technician: row.technician,
        risers: inspectionRisers,
        notes: row.notes,
        status: row.status
      });
    }

    return inspections;
  }

  async updateInspection(params: { 
    where: { id: string }, 
    data: Partial<NFPAInspection> 
  }): Promise<NFPAInspection> {
    if (!this.db) throw new Error('Database not initialized');

    const { id } = params.where;
    const updates = params.data;
    const now = new Date().toISOString();

    // Build dynamic update query
    const setParts: string[] = ['updatedAt = ?'];
    const values: any[] = [now];

    if (updates.location) {
      setParts.push('location = ?');
      values.push(updates.location);
    }
    if (updates.technician) {
      setParts.push('technician = ?');
      values.push(updates.technician);
    }
    if (updates.notes !== undefined) {
      setParts.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.status) {
      setParts.push('status = ?');
      values.push(updates.status);
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE inspections SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );

    // Return updated inspection
    const updated = await this.findManyInspections({ where: { syncStatus: 'any' } });
    return updated.find((i: NFPAInspection) => i.id === id)!;
  }

  async createTranscription(data: Omit<VoiceTranscription, 'id'>): Promise<VoiceTranscription> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `transcription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transcription: VoiceTranscription = {
      ...data,
      id,
      timestamp: data.timestamp || new Date(),
    };

    await this.db.runAsync(
      `INSERT INTO transcriptions 
       (id, audio_file, transcription, timestamp, processed, sync_status, inspection_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        transcription.audioFile,
        transcription.transcription,
        transcription.timestamp.toISOString(),
        transcription.processed ? 1 : 0,
        'pending',
        null // Will be linked to inspection after processing
      ]
    );

    return transcription;
  }

  async getInspectionCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM inspections'
    ) as { count: number };
    
    return result.count;
  }

  async markAsSynced(table: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`,
      [id]
    );
  }

  async getPendingInspections(): Promise<NFPAInspection[]> {
    return this.findManyInspections({
      where: { syncStatus: 'pending' },
      orderBy: { timestamp: 'desc' }
    });
  }

  // Sync management methods
  async getUnsyncedData(): Promise<{
    inspections: NFPAInspection[];
    transcriptions: VoiceTranscription[];
  }> {
    const inspections = await this.findManyInspections({
      where: { syncStatus: 'pending' },
      orderBy: { timestamp: 'desc' }
    });

    const transcriptions = await this.db.getAllAsync(
      'SELECT * FROM transcriptions WHERE sync_status = "pending" ORDER BY timestamp DESC'
    ) as any[];

    return {
      inspections,
      transcriptions: transcriptions.map((t: any) => ({
        id: t.id,
        audioFile: t.audio_file,
        transcription: t.transcription,
        timestamp: new Date(t.timestamp),
        processed: Boolean(t.processed),
      }))
    };
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }
}
