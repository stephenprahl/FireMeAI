export interface VisionAnalysisResult {
  pressure: number;
  confidence: number;
  corrosion: {
    detected: boolean;
    severity: 'none' | 'minor' | 'moderate' | 'severe';
    confidence: number;
  };
  gaugeType: 'analog' | 'digital';
  imageBase64: string;
}

export class VisionService {
  private apiKey: string;
  private openaiBaseUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeGaugeImage(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      // Use OpenAI GPT-4 Vision for gauge reading and corrosion detection
      const response = await fetch(this.openaiBaseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // GPT-4o has vision capabilities
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this pressure gauge image and provide:
1. The pressure reading value (number only)
2. Confidence level (0-1)
3. Whether corrosion is detected (yes/no)
4. Corrosion severity if detected (none/minor/moderate/severe)
5. Gauge type (analog/digital)

Respond in JSON format:
{
  "pressure": 55,
  "confidence": 0.95,
  "corrosion": {
    "detected": false,
    "severity": "none",
    "confidence": 0.98
  },
  "gaugeType": "analog"
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1, // Low temperature for consistent results
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Vision API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from vision API');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse vision analysis result');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        pressure: analysis.pressure || 0,
        confidence: analysis.confidence || 0,
        corrosion: analysis.corrosion || { detected: false, severity: 'none', confidence: 0 },
        gaugeType: analysis.gaugeType || 'analog',
        imageBase64: imageBase64
      };

    } catch (error) {
      console.error('Error analyzing gauge image:', error);
      throw error;
    }
  }

  // For development/testing without API key
  async mockAnalyzeGaugeImage(imageBase64: string): Promise<VisionAnalysisResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate realistic gauge readings with corrosion detection
    const mockReadings = [
      {
        pressure: 55,
        confidence: 0.92,
        corrosion: { detected: false, severity: 'none' as const, confidence: 0.95 },
        gaugeType: 'analog' as const,
        imageBase64: imageBase64
      },
      {
        pressure: 58,
        confidence: 0.89,
        corrosion: { detected: true, severity: 'minor' as const, confidence: 0.87 },
        gaugeType: 'analog' as const,
        imageBase64: imageBase64
      },
      {
        pressure: 52,
        confidence: 0.95,
        corrosion: { detected: false, severity: 'none' as const, confidence: 0.98 },
        gaugeType: 'digital' as const,
        imageBase64: imageBase64
      },
      {
        pressure: 60,
        confidence: 0.87,
        corrosion: { detected: true, severity: 'moderate' as const, confidence: 0.82 },
        gaugeType: 'analog' as const,
        imageBase64: imageBase64
      },
      {
        pressure: 48,
        confidence: 0.91,
        corrosion: { detected: true, severity: 'severe' as const, confidence: 0.94 },
        gaugeType: 'analog' as const,
        imageBase64: imageBase64
      },
    ];

    return mockReadings[Math.floor(Math.random() * mockReadings.length)];
  }
}
