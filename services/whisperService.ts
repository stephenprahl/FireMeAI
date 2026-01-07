import * as FileSystem from 'expo-file-system';

export interface TranscriptionResult {
  text: string;
  confidence?: number;
}

export class WhisperService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/audio/transcriptions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
    try {
      // Create FormData for the API request
      const formData = new FormData();
      
      // Read the audio file and append to form data
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      // Append the audio file
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a', // Expo records in m4a format by default
        name: 'audio.m4a',
      } as any);

      // Append model and other parameters
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'json');

      // Make the API request
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Whisper API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      return {
        text: result.text,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  // For development/testing without API key
  async mockTranscribeAudio(audioUri: string): Promise<TranscriptionResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock transcription based on common NFPA inspection phrases
    const mockTranscriptions = [
      "Scanning Riser 1. Gauge pressure is 55 PSI static. Control valve is open. No corrosion detected.",
      "Riser 2 inspection complete. Static pressure 60 PSI. Residual pressure 45 PSI. Butterfly valve detected and clear.",
      "Checking Riser 3. Pressure reading 52 PSI. Control valve open. Minor corrosion noted on fittings.",
      "Riser 1 static pressure 58 PSI. Residual 42 PSI. All valves operational. No corrosion found.",
    ];
    
    return {
      text: mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)],
      confidence: 0.95,
    };
  }
}
