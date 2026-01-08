// Simple test for PDF generation functionality
// This can be run in the browser console or used for testing

import { PDFService } from './services/pdfService';
import { NFPAInspection } from './types/nfpa';

// Create sample inspection data for testing
const sampleInspection: NFPAInspection = {
  id: 'test_inspection_001',
  timestamp: new Date(),
  location: 'P&R Mechanical - Test Site A',
  technician: 'Test Technician',
  risers: [
    {
      riserNumber: 1,
      staticPressure: 55,
      residualPressure: 42,
      controlValveStatus: 'open',
      butterflyValveStatus: 'detected_clear',
      corrosion: 'none',
      gaugeReadings: [
        {
          type: 'static',
          pressure: 55,
          unit: 'psi',
          timestamp: new Date()
        },
        {
          type: 'residual',
          pressure: 42,
          unit: 'psi',
          timestamp: new Date()
        }
      ]
    },
    {
      riserNumber: 2,
      staticPressure: 60,
      residualPressure: 45,
      controlValveStatus: 'open',
      butterflyValveStatus: 'detected_clear',
      corrosion: 'minor',
      gaugeReadings: [
        {
          type: 'static',
          pressure: 60,
          unit: 'psi',
          timestamp: new Date()
        }
      ]
    }
  ],
  notes: 'Test inspection completed successfully. All systems operational.',
  status: 'completed'
};

// Test function
async function testPDFGeneration() {
  console.log('Testing PDF generation...');
  
  try {
    const pdfService = new PDFService();
    const pdfUri = await pdfService.generateNFPAReport(sampleInspection);
    
    console.log('✅ PDF generated successfully!');
    console.log('PDF URI:', pdfUri);
    
    // Test sharing (will only work on mobile devices)
    // await pdfService.sharePDF(pdfUri);
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
  }
}

export { sampleInspection, testPDFGeneration };

