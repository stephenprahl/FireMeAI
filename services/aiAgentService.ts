import { NFPAInspection, RiserInspection } from '../types/nfpa';

export interface ParsedInspectionData {
  risers: RiserInspection[];
  notes: string;
  missingFields: string[];
}

export class AIAgentService {
  // For MVP, we'll use pattern matching. In production, this would use GPT-4/Claude API
  parseTranscriptionToInspection(transcription: string): ParsedInspectionData {
    const risers: RiserInspection[] = [];
    const notes = transcription;
    const missingFields: string[] = [];

    // Normalize text for parsing
    const normalizedText = transcription.toLowerCase();
    
    // Extract riser information
    const riserMatches = transcription.match(/riser\s*(\d+)/gi) || [];
    
    for (const match of riserMatches) {
      const riserNumber = parseInt(match.match(/(\d+)/)?.[1] || '1');
      
      // Extract pressure readings
      const staticPressureMatch = transcription.match(/static\s*pressure\s*(?:is\s*)?(\d+)\s*psi/i);
      const residualPressureMatch = transcription.match(/residual\s*pressure\s*(?:is\s*)?(\d+)\s*psi/i);
      
      // Extract valve status
      const controlValveOpen = /control\s*valve\s*open/i.test(normalizedText);
      const controlValveClosed = /control\s*valve\s*closed/i.test(normalizedText);
      const butterflyDetected = /butterfly\s*valve\s*detected/i.test(normalizedText);
      const butterflyClear = /butterfly\s*valve\s*clear/i.test(normalizedText);
      
      // Extract corrosion information
      const corrosionNone = /no\s*corrosion/i.test(normalizedText);
      const corrosionMinor = /minor\s*corrosion/i.test(normalizedText);
      const corrosionModerate = /moderate\s*corrosion/i.test(normalizedText);
      const corrosionSevere = /severe\s*corrosion/i.test(normalizedText);
      
      const riser: RiserInspection = {
        riserNumber,
        staticPressure: staticPressureMatch ? parseInt(staticPressureMatch[1]) : 0,
        residualPressure: residualPressureMatch ? parseInt(residualPressureMatch[1]) : 0,
        controlValveStatus: controlValveOpen ? 'open' : controlValveClosed ? 'closed' : 'partially_open',
        butterflyValveStatus: butterflyDetected ? 
          (butterflyClear ? 'detected_clear' : 'detected_obstructed') : 'not_detected',
        corrosion: corrosionNone ? 'none' : 
                  corrosionMinor ? 'minor' : 
                  corrosionModerate ? 'moderate' : 
                  corrosionSevere ? 'severe' : 'none',
        gaugeReadings: []
      };
      
      // Add gauge readings if pressures were found
      if (staticPressureMatch) {
        riser.gaugeReadings.push({
          type: 'static',
          pressure: parseInt(staticPressureMatch[1]),
          unit: 'psi',
          timestamp: new Date()
        });
      }
      
      if (residualPressureMatch) {
        riser.gaugeReadings.push({
          type: 'residual',
          pressure: parseInt(residualPressureMatch[1]),
          unit: 'psi',
          timestamp: new Date()
        });
      }
      
      risers.push(riser);
    }

    // Check for missing required fields
    risers.forEach((riser, index) => {
      if (riser.staticPressure === 0) {
        missingFields.push(`Riser ${riser.riserNumber}: Static pressure`);
      }
      if (riser.controlValveStatus === 'partially_open' && !/control\s*valve/i.test(normalizedText)) {
        missingFields.push(`Riser ${riser.riserNumber}: Control valve status`);
      }
      if (riser.butterflyValveStatus === 'not_detected' && !/butterfly\s*valve/i.test(normalizedText)) {
        missingFields.push(`Riser ${riser.riserNumber}: Butterfly valve status`);
      }
    });

    return {
      risers,
      notes,
      missingFields
    };
  }

  generateFollowUpQuestions(missingFields: string[]): string[] {
    return missingFields.map(field => `I didn't hear the ${field}. Could you provide that information?`);
  }

  createInspectionFromParsedData(
    parsedData: ParsedInspectionData,
    technician: string,
    location: string
  ): NFPAInspection {
    return {
      id: `inspection_${Date.now()}`,
      timestamp: new Date(),
      location,
      technician,
      risers: parsedData.risers,
      notes: parsedData.notes,
      status: 'completed'
    };
  }
}
