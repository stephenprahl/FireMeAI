export interface NFPAInspection {
  id: string;
  timestamp: Date;
  location: string;
  technician: string;
  risers: RiserInspection[];
  notes: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface RiserInspection {
  riserNumber: number;
  staticPressure: number;
  residualPressure: number;
  controlValveStatus: 'open' | 'closed' | 'partially_open';
  butterflyValveStatus: 'detected_clear' | 'detected_obstructed' | 'not_detected';
  corrosion: 'none' | 'minor' | 'moderate' | 'severe';
  gaugeReadings: GaugeReading[];
}

export interface GaugeReading {
  type: 'static' | 'residual';
  pressure: number;
  unit: 'psi';
  timestamp: Date;
}

export interface VoiceTranscription {
  id: string;
  audioFile: string;
  transcription: string;
  timestamp: Date;
  processed: boolean;
}
