import { NFPAInspection } from '../types/nfpa';

export interface ComplianceCheck {
  requirement: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  nfpaReference: string;
}

export interface FollowUpQuestion {
  question: string;
  priority: 'critical' | 'recommended' | 'optional';
  context: string;
}

export interface AgentResponse {
  transcription: string;
  parsedData: any;
  complianceChecks: ComplianceCheck[];
  followUpQuestions: FollowUpQuestion[];
  missingCriticalFields: string[];
  overallStatus: 'compliant' | 'non_compliant' | 'requires_attention';
}

export class LangGraphAgentService {
  private apiKey: string;
  private ollamaBaseUrl: string = 'http://localhost:11434/api/chat';
  private model: string = 'gpt-oss:120b-cloud'; // Use the available Ollama model

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OLLAMA_API_KEY || ''; // Ollama doesn't require API key
  }

  // This simulates a LangGraph agent - in production this would connect to actual LangGraph
  async processInspectionInput(
    transcription: string,
    existingInspection?: NFPAInspection
  ): Promise<AgentResponse> {

    // Parse the transcription
    const parsedData = await this.parseTranscriptionWithAI(transcription);

    // Run NFPA compliance checks
    const complianceChecks = this.runNFPAComplianceChecks(parsedData);

    // Generate follow-up questions
    const followUpQuestions = this.generateContextualQuestions(parsedData, complianceChecks);

    // Identify missing critical fields
    const missingCriticalFields = this.identifyMissingCriticalFields(parsedData);

    // Determine overall status
    const overallStatus = this.determineOverallStatus(complianceChecks, missingCriticalFields);

    return {
      transcription,
      parsedData,
      complianceChecks,
      followUpQuestions,
      missingCriticalFields,
      overallStatus
    };
  }

  private async parseTranscriptionWithAI(transcription: string): Promise<any> {
    const hasApiKey = this.apiKey && this.apiKey !== 'your-api-key-here';

    if (hasApiKey) {
      try {
        const response = await fetch(this.ollamaBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: `You are an expert NFPA fire safety inspection AI assistant. Parse fire safety inspection transcriptions and extract structured data.

Extract the following information and respond in JSON format:
- riserNumber: The riser number mentioned
- staticPressure: Static pressure in PSI
- residualPressure: Residual pressure in PSI (if mentioned)
- controlValveStatus: "open", "closed", or "partially_open"
- butterflyValveStatus: "detected_clear", "detected_obstructed", or "not_detected"
- corrosion: "none", "minor", "moderate", or "severe"

Respond only with valid JSON, no explanations:
{
  "risers": [
    {
      "riserNumber": 1,
      "staticPressure": 55,
      "residualPressure": 45,
      "controlValveStatus": "open",
      "butterflyValveStatus": "detected_clear",
      "corrosion": "none"
    }
  ]
}`
              },
              {
                role: 'user',
                content: `Parse this inspection transcription: "${transcription}"`
              }
            ],
            stream: false,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.message?.content;

          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (error) {
        console.error('AI parsing failed, falling back to pattern matching:', error);
      }
    }

    // Fallback to pattern matching
    return this.parseTranscriptionWithPatterns(transcription);
  }

  private parseTranscriptionWithPatterns(transcription: string): any {
    // Enhanced parsing that understands context and NFPA terminology
    const normalizedText = transcription.toLowerCase();

    // Extract riser information with better pattern recognition
    const riserMatches = transcription.match(/riser\s*(\d+)/gi) || [];
    const risers = [];

    for (const match of riserMatches) {
      const riserNumber = parseInt(match.match(/(\d+)/)?.[1] || '1');

      // Enhanced pressure extraction
      const staticPressureMatch = transcription.match(/static\s*pressure\s*(?:is\s*)?(\d+)\s*psi/i);
      const residualPressureMatch = transcription.match(/residual\s*pressure\s*(?:is\s*)?(\d+)\s*psi/i);

      // Enhanced valve status detection
      const controlValveOpen = /control\s*valve\s*open/i.test(normalizedText);
      const controlValveClosed = /control\s*valve\s*closed/i.test(normalizedText);
      const controlValvePartially = /control\s*valve\s*partially/i.test(normalizedText);

      // Enhanced butterfly valve detection
      const butterflyDetected = /butterfly\s*valve\s*detected/i.test(normalizedText);
      const butterflyClear = /butterfly\s*valve\s*clear/i.test(normalizedText);
      const butterflyObstructed = /butterfly\s*valve\s*obstructed/i.test(normalizedText);

      // Enhanced corrosion detection
      const corrosionNone = /no\s*corrosion/i.test(normalizedText) || /corrosion\s*free/i.test(normalizedText);
      const corrosionMinor = /minor\s*corrosion/i.test(normalizedText) || /slight\s*corrosion/i.test(normalizedText);
      const corrosionModerate = /moderate\s*corrosion/i.test(normalizedText);
      const corrosionSevere = /severe\s*corrosion/i.test(normalizedText) || /heavy\s*corrosion/i.test(normalizedText);

      const riser = {
        riserNumber,
        staticPressure: staticPressureMatch ? parseInt(staticPressureMatch[1]) : null,
        residualPressure: residualPressureMatch ? parseInt(residualPressureMatch[1]) : null,
        controlValveStatus: controlValveOpen ? 'open' :
          controlValveClosed ? 'closed' :
            controlValvePartially ? 'partially_open' : 'unknown',
        butterflyValveStatus: butterflyDetected ?
          (butterflyClear ? 'detected_clear' :
            butterflyObstructed ? 'detected_obstructed' : 'detected_clear') : 'not_detected',
        corrosion: corrosionNone ? 'none' :
          corrosionMinor ? 'minor' :
            corrosionModerate ? 'moderate' :
              corrosionSevere ? 'severe' : 'unknown',
        gaugeReadings: [] as Array<{ type: string; pressure: number; unit: string; timestamp: Date }>
      };

      // Add gauge readings
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

    return { risers, notes: transcription };
  }

  private runNFPAComplianceChecks(parsedData: any): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    if (!parsedData.risers || parsedData.risers.length === 0) {
      checks.push({
        requirement: 'Riser Inspection Required',
        status: 'fail',
        message: 'No riser data found in inspection',
        nfpaReference: 'NFPA 25 5.3.1'
      });
      return checks;
    }

    parsedData.risers.forEach((riser: any) => {
      // Static pressure check
      if (!riser.staticPressure || riser.staticPressure < 30 || riser.staticPressure > 250) {
      } else {
        checks.push({
          requirement: `Riser ${riser.riserNumber} Static Pressure`,
          status: 'pass',
          message: `Static pressure ${riser.staticPressure} PSI is within acceptable range`,
          nfpaReference: 'NFPA 25 5.3.2.1'
        });
      }

      // Control valve check
      if (riser.controlValveStatus !== 'open') {
        checks.push({
          requirement: `Riser ${riser.riserNumber} Control Valve`,
          status: 'fail',
          message: `Control valve is ${riser.controlValveStatus}, must be open for inspection`,
          nfpaReference: 'NFPA 25 5.3.3.1'
        });
      } else {
        checks.push({
          requirement: `Riser ${riser.riserNumber} Control Valve`,
          status: 'pass',
          message: 'Control valve is properly open',
          nfpaReference: 'NFPA 25 5.3.3.1'
        });
      }

      // Corrosion check
      if (riser.corrosion === 'severe') {
        checks.push({
          requirement: `Riser ${riser.riserNumber} Corrosion Inspection`,
          status: 'fail',
          message: 'Severe corrosion detected - immediate maintenance required',
          nfpaReference: 'NFPA 25 5.2.1.1'
        });
      } else if (riser.corrosion === 'moderate') {
        checks.push({
          requirement: `Riser ${riser.riserNumber} Corrosion Inspection`,
          status: 'warning',
          message: 'Moderate corrosion detected - maintenance recommended',
          nfpaReference: 'NFPA 25 5.2.1.1'
        });
      } else {
        checks.push({
          requirement: `Riser ${riser.riserNumber} Corrosion Inspection`,
          status: 'pass',
          message: 'No significant corrosion detected',
          nfpaReference: 'NFPA 25 5.2.1.1'
        });
      }
    });

    return checks;
  }

  private generateContextualQuestions(parsedData: any, complianceChecks: ComplianceCheck[]): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];

    // Check for missing residual pressure
    const hasStaticPressure = parsedData.risers?.some((r: any) => r.staticPressure);
    const hasResidualPressure = parsedData.risers?.some((r: any) => r.residualPressure);

    if (hasStaticPressure && !hasResidualPressure) {
      questions.push({
        question: 'I noticed static pressure readings but no residual pressure. Did you perform a flow test?',
        priority: 'critical',
        context: 'NFPA 25 requires residual pressure testing during annual inspections'
      });
    }

    // Check for failed compliance items
    const failedChecks = complianceChecks.filter(check => check.status === 'fail');
    if (failedChecks.length > 0) {
      questions.push({
        question: `I found ${failedChecks.length} compliance issues that need immediate attention. Should I document these for follow-up maintenance?`,
        priority: 'critical',
        context: 'Failed compliance items require immediate corrective action'
      });
    }

    return questions;
  }

  private identifyMissingCriticalFields(parsedData: any): string[] {
    const missing: string[] = [];

    if (!parsedData.risers || parsedData.risers.length === 0) {
      missing.push('No riser inspection data found');
      return missing;
    }

    parsedData.risers.forEach((riser: any) => {
      if (!riser.staticPressure) {
        missing.push(`Riser ${riser.riserNumber}: Missing static pressure reading`);
      }
      if (riser.controlValveStatus === 'unknown') {
        missing.push(`Riser ${riser.riserNumber}: Control valve status unclear`);
      }
      if (riser.corrosion === 'unknown') {
        missing.push(`Riser ${riser.riserNumber}: Corrosion assessment missing`);
      }
    });

    return missing;
  }

  private determineOverallStatus(complianceChecks: ComplianceCheck[], missingCriticalFields: string[]): 'compliant' | 'non_compliant' | 'requires_attention' {
    // If any critical fields are missing, mark as non-compliant
    if (missingCriticalFields.length > 0) {
      return 'non_compliant';
    }

    // If any compliance checks failed, mark as non-compliant
    if (complianceChecks.some(check => check.status === 'fail')) {
      return 'non_compliant';
    }

    // If any warnings, mark as requires attention
    if (complianceChecks.some(check => check.status === 'warning')) {
      return 'requires_attention';
    }

    // Otherwise, compliant
    return 'compliant';
  }

  // Real-time interruption logic
  shouldInterruptForMissingInfo(transcription: string, context: string): boolean {
    // In a real LangGraph implementation, this would use the agent's state
    // to determine if interruption is needed based on the conversation flow

    const normalizedText = transcription.toLowerCase();

    // Check if user is moving on without providing critical info
    if (context.includes('missing_static_pressure') &&
      !/pressure|psi/i.test(normalizedText)) {
      return true;
    }

    if (context.includes('missing_control_valve') &&
      !/valve|open|close/i.test(normalizedText)) {
      return true;
    }

    return false;
  }

  generateInterruptionMessage(missingField: string): string {
    const messages: Record<string, string> = {
      'static_pressure': "I didn't hear the static pressure reading. Could you provide the PSI reading?",
      'control_valve': "I didn't hear the control valve status. Is the valve open or closed?",
      'butterfly_valve': "I didn't hear about the butterfly valve. Is it detected and clear?",
      'corrosion': "I didn't hear about corrosion. Did you notice any corrosion on the fittings?"
    };

    return messages[missingField] || "I need a bit more information. Could you provide the missing details?";
  }
}
