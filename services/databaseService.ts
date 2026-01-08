import * as SQLite from 'expo-sqlite';
import { NFPAInspection, VoiceTranscription } from '../types/nfpa';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('nfpai.db');
      
      // Create inspections table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS inspections (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          location TEXT NOT NULL,
          technician TEXT NOT NULL,
          notes TEXT,
          status TEXT NOT NULL,
          sync_status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create risers table
      await this.db.runAsync(`
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
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS gauge_readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          riser_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          pressure REAL NOT NULL,
          unit TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (riser_id) REFERENCES risers (id) ON DELETE CASCADE
        );
      `);

      // Create transcriptions table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS transcriptions (
          id TEXT PRIMARY KEY,
          audio_file TEXT NOT NULL,
          transcription TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          processed INTEGER DEFAULT 0,
          inspection_id TEXT,
          sync_status TEXT DEFAULT 'pending',
          FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE
        );
      `);

      // Create jobs table for scheduling
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          location TEXT NOT NULL,
          scheduled_date TEXT NOT NULL,
          status TEXT DEFAULT 'scheduled',
          technician TEXT,
          notes TEXT,
          sync_status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async saveInspection(inspection: NFPAInspection): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const db = this.db; // Capture non-null reference
    try {
      // Start transaction
      await db.withTransactionAsync(async () => {
        // Insert inspection
        await db.runAsync(
          `INSERT OR REPLACE INTO inspections 
           (id, timestamp, location, technician, notes, status, sync_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            inspection.id,
            inspection.timestamp.toISOString(),
            inspection.location,
            inspection.technician,
            inspection.notes,
            inspection.status,
            'pending' // Mark for sync
          ]
        );

        // Delete existing risers for this inspection (in case of update)
        await db.runAsync(
          'DELETE FROM risers WHERE inspection_id = ?',
          [inspection.id]
        );

        // Insert risers
        for (const riser of inspection.risers) {
          const riserResult = await db.runAsync(
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
            await db.runAsync(
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

      console.log('Inspection saved successfully');
    } catch (error) {
      console.error('Failed to save inspection:', error);
      throw error;
    }
  }

  async saveTranscription(transcription: VoiceTranscription): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const db = this.db; // Capture non-null reference
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO transcriptions 
         (id, audio_file, transcription, timestamp, processed, inspection_id, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transcription.id,
          transcription.audioFile,
          transcription.transcription,
          transcription.timestamp.toISOString(),
          transcription.processed ? 1 : 0,
          null, // Will be linked to inspection after processing
          'pending'
        ]
      );

      console.log('Transcription saved successfully');
    } catch (error) {
      console.error('Failed to save transcription:', error);
      throw error;
    }
  }

  async getPendingInspections(): Promise<NFPAInspection[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const db = this.db; // Capture non-null reference
    try {
      const inspections = await db.getAllAsync(`
        SELECT * FROM inspections 
        WHERE sync_status = 'pending' 
        ORDER BY timestamp DESC
      `) as any[];

      const result: NFPAInspection[] = [];

      for (const inspectionRow of inspections) {
        const risers = await db.getAllAsync(`
          SELECT * FROM risers WHERE inspection_id = ?
        `, [inspectionRow.id]) as any[];

        const inspectionRisers = [];

        for (const riserRow of risers) {
          const gaugeReadings = await db.getAllAsync(`
            SELECT * FROM gauge_readings WHERE riser_id = ?
          `, [riserRow.id]) as any[];

          inspectionRisers.push({
            riserNumber: riserRow.riser_number,
            staticPressure: riserRow.static_pressure,
            residualPressure: riserRow.residual_pressure,
            controlValveStatus: riserRow.control_valve_status,
            butterflyValveStatus: riserRow.butterfly_valve_status,
            corrosion: riserRow.corrosion,
            gaugeReadings: gaugeReadings.map(reading => ({
              type: reading.type,
              pressure: reading.pressure,
              unit: reading.unit,
              timestamp: new Date(reading.timestamp)
            }))
          });
        }

        result.push({
          id: inspectionRow.id,
          timestamp: new Date(inspectionRow.timestamp),
          location: inspectionRow.location,
          technician: inspectionRow.technician,
          risers: inspectionRisers,
          notes: inspectionRow.notes,
          status: inspectionRow.status
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to get pending inspections:', error);
      throw error;
    }
  }

  async markAsSynced(table: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const db = this.db; // Capture non-null reference
    try {
      await db.runAsync(
        `UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error('Failed to mark as synced:', error);
      throw error;
    }
  }

  async getInspectionCount(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const db = this.db; // Capture non-null reference
    try {
      const result = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM inspections'
      ) as { count: number };
      
      return result.count;
    } catch (error) {
      console.error('Failed to get inspection count:', error);
      throw error;
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
