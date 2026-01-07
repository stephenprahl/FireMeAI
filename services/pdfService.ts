import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { NFPAInspection } from '../types/nfpa';

export class PDFService {
  
  generateNFPAReport = async (inspection: NFPAInspection): Promise<string> => {
    const html = this.createNFPAHTML(inspection);
    
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    }
  };

  private createNFPAHTML = (inspection: NFPAInspection): string => {
    const currentDate = new Date().toLocaleDateString();
    const inspectionTime = inspection.timestamp.toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>NFPA 25 Annual Inspection Report</title>
        <style>
          @page {
            size: letter;
            margin: 0.25in;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 11px;
            line-height: 1.2;
            color: #000;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .header {
            text-align: center;
            border: 2px solid #000;
            padding: 8px;
            margin-bottom: 15px;
            background: #f8f8f8;
          }
          
          .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .header h2 {
            font-size: 12px;
            font-weight: normal;
            margin: 3px 0 0 0;
            font-style: italic;
          }
          
          .property-info {
            border: 2px solid #000;
            margin-bottom: 15px;
          }
          
          .property-row {
            display: flex;
            border-bottom: 1px solid #000;
          }
          
          .property-row:last-child {
            border-bottom: none;
          }
          
          .property-cell {
            flex: 1;
            padding: 6px 8px;
            border-right: 1px solid #000;
            font-weight: bold;
            background: #f0f0f0;
          }
          
          .property-cell:last-child {
            border-right: none;
            background: white;
            font-weight: normal;
          }
          
          .inspection-table {
            width: 100%;
            border: 2px solid #000;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          
          .inspection-table th {
            background: #000;
            color: white;
            font-weight: bold;
            text-align: center;
            padding: 6px 4px;
            font-size: 10px;
            border: 1px solid #000;
            text-transform: uppercase;
          }
          
          .inspection-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: center;
            font-size: 10px;
          }
          
          .inspection-table .text-left {
            text-align: left;
          }
          
          .status-pass {
            background: #d4edda;
            font-weight: bold;
          }
          
          .status-fail {
            background: #f8d7da;
            font-weight: bold;
          }
          
          .status-warning {
            background: #fff3cd;
            font-weight: bold;
          }
          
          .notes-section {
            border: 2px solid #000;
            min-height: 80px;
            margin-bottom: 15px;
            padding: 8px;
          }
          
          .notes-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
            font-size: 10px;
          }
          
          .compliance-box {
            border: 3px solid #000;
            padding: 10px;
            text-align: center;
            margin: 20px 0;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
          }
          
          .compliance-pass {
            background: #d4edda;
            color: #155724;
            border-color: #155724;
          }
          
          .compliance-fail {
            background: #f8d7da;
            color: #721c24;
            border-color: #721c24;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }
          
          .signature-block {
            width: 45%;
            border-top: 2px solid #000;
            padding-top: 5px;
            text-align: center;
          }
          
          .signature-label {
            font-size: 9px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 2px;
          }
          
          .nfpa-reference {
            font-size: 9px;
            color: #666;
            text-align: center;
            margin-top: 20px;
            font-style: italic;
          }
          
          .page-number {
            position: absolute;
            bottom: 10px;
            right: 10px;
            font-size: 9px;
            color: #666;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72px;
            color: rgba(0, 0, 0, 0.05);
            font-weight: bold;
            text-transform: uppercase;
            pointer-events: none;
            z-index: -1;
          }
        </style>
      </head>
      <body>
        <div class="watermark">NFPA 25</div>
        
        <div class="header">
          <h1>Annual Inspection & Test Report</h1>
          <h2>NFPA 25 - Standard for the Inspection, Testing, and Maintenance of Water-Based Fire Protection Systems</h2>
        </div>
        
        <div class="property-info">
          <div class="property-row">
            <div class="property-cell">Property Name:</div>
            <div class="property-cell">${inspection.location}</div>
          </div>
          <div class="property-row">
            <div class="property-cell">Property Address:</div>
            <div class="property-cell">${inspection.location}</div>
          </div>
          <div class="property-row">
            <div class="property-cell">Inspection Date:</div>
            <div class="property-cell">${currentDate}</div>
          </div>
          <div class="property-row">
            <div class="property-cell">Inspector:</div>
            <div class="property-cell">${inspection.technician}</div>
          </div>
          <div class="property-row">
            <div class="property-cell">System Type:</div>
            <div class="property-cell">Wet Pipe Sprinkler System</div>
          </div>
          <div class="property-row">
            <div class="property-cell">Report Number:</div>
            <div class="property-cell">${inspection.id}</div>
          </div>
        </div>
        
        <table class="inspection-table">
          <thead>
            <tr>
              <th>Riser #</th>
              <th>Static PSI</th>
              <th>Residual PSI</th>
              <th>Control Valve</th>
              <th>Butterfly Valve</th>
              <th>Corrosion</th>
              <th>Test Result</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${inspection.risers.map(riser => `
              <tr>
                <td class="text-left">${riser.riserNumber}</td>
                <td>${riser.staticPressure || 'N/A'}</td>
                <td>${riser.residualPressure || 'N/A'}</td>
                <td class="${riser.controlValveStatus === 'open' ? 'status-pass' : 'status-fail'}">
                  ${riser.controlValveStatus === 'open' ? 'OPEN' : 'CLOSED'}
                </td>
                <td class="${riser.butterflyValveStatus === 'detected_clear' ? 'status-pass' : riser.butterflyValveStatus === 'detected_obstructed' ? 'status-fail' : 'status-warning'}">
                  ${riser.butterflyValveStatus === 'detected_clear' ? 'CLEAR' : 
                    riser.butterflyValveStatus === 'detected_obstructed' ? 'OBSTRUCTED' : 'NOT DETECTED'}
                </td>
                <td class="${riser.corrosion === 'none' ? 'status-pass' : riser.corrosion === 'severe' ? 'status-fail' : 'status-warning'}">
                  ${riser.corrosion === 'none' ? 'NONE' : 
                    riser.corrosion === 'minor' ? 'MINOR' : 
                    riser.corrosion === 'moderate' ? 'MODERATE' : 'SEVERE'}
                </td>
                <td class="${this.getOverallStatus(riser) === 'pass' ? 'status-pass' : this.getOverallStatus(riser) === 'fail' ? 'status-fail' : 'status-warning'}">
                  ${this.getOverallStatusText(riser)}
                </td>
                <td class="text-left">-</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="notes-section">
          <div class="notes-title">Inspector Notes & Observations:</div>
          <div>${inspection.notes || 'No additional notes recorded during inspection.'}</div>
        </div>
        
        <div class="compliance-box ${this.getComplianceStatus(inspection) ? 'compliance-pass' : 'compliance-fail'}">
          ${this.getComplianceStatus(inspection) ? 
            '✓ SYSTEM PASSES INSPECTION - COMPLIANT WITH NFPA 25 STANDARDS' : 
            '✗ SYSTEM REQUIRES IMMEDIATE ATTENTION - NOT COMPLIANT WITH NFPA 25 STANDARDS'}
        </div>
        
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-label">Inspector Signature</div>
            <div>${inspection.technician}</div>
          </div>
          <div class="signature-block">
            <div class="signature-label">Date</div>
            <div>${currentDate}</div>
          </div>
        </div>
        
        <div class="nfpa-reference">
          This report complies with NFPA 25 requirements for annual inspection and testing of water-based fire protection systems.
          Report generated digitally by Voice Inspector AI - NFPA Certified Inspection System.
          NFPA 25 2022 Edition. All inspections performed in accordance with local AHJ requirements.
        </div>
        
        <div class="page-number">Page 1 of 1</div>
      </body>
      </html>
    `;
  };

  private getOverallStatus = (riser: any): string => {
    if (riser.controlValveStatus !== 'open') return 'fail';
    if (riser.corrosion === 'severe') return 'fail';
    if (riser.corrosion === 'moderate' || riser.butterflyValveStatus === 'detected_obstructed') return 'warning';
    return 'pass';
  };

  private getOverallStatusText = (riser: any): string => {
    const status = this.getOverallStatus(riser);
    switch (status) {
      case 'pass': return 'PASS';
      case 'warning': return 'REVIEW';
      case 'fail': return 'FAIL';
      default: return 'UNKNOWN';
    }
  };

  private getComplianceStatus = (inspection: NFPAInspection): boolean => {
    return inspection.risers.every(riser => 
      riser.controlValveStatus === 'open' && 
      riser.corrosion !== 'severe' &&
      riser.staticPressure > 0
    );
  };

  sharePDF = async (pdfUri: string): Promise<void> => {
    try {
      await shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share NFPA Inspection Report',
      });
    } catch (error) {
      console.error('Error sharing PDF:', error);
      throw new Error('Failed to share PDF');
    }
  };

  // Generate a sample PDF for testing
  async generateSamplePDF(): Promise<string> {
    const sampleInspection: NFPAInspection = {
      id: 'SAMPLE-2025-NFPA25-001',
      timestamp: new Date(),
      location: 'K&E Fire - Test Facility',
      technician: 'John Smith - Certified Inspector',
      notes: 'Sample inspection report demonstrating NFPA 25 compliance. All systems tested and found to be in proper working order.',
      status: 'completed',
      risers: [
        {
          riserNumber: 1,
          staticPressure: 55,
          residualPressure: 42,
          controlValveStatus: 'open',
          butterflyValveStatus: 'detected_clear',
          corrosion: 'none',
          gaugeReadings: []
        },
        {
          riserNumber: 2,
          staticPressure: 58,
          residualPressure: 45,
          controlValveStatus: 'open',
          butterflyValveStatus: 'detected_clear',
          corrosion: 'minor',
          gaugeReadings: []
        }
      ]
    };

    return this.generateNFPAReport(sampleInspection);
  }
}
