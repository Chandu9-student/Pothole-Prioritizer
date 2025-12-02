import { toast } from 'react-hot-toast';

export interface AIAnalysisResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  suggestions: string[];
  detections?: Array<{
    class: string;
    bbox: number[];
    confidence: number;
    severity: string;
  }>;
  enhanced_image?: string;
  gps_info?: any;
}

export interface AIAnalysisService {
  analyzeImage: (imageFile: File) => Promise<AIAnalysisResult>;
  analyzeVideo: (videoFile: File) => Promise<AIAnalysisResult>;
}

class PotholeAIService implements AIAnalysisService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:5002') {
    this.baseURL = baseURL;
  }

  async analyzeImage(imageFile: File): Promise<AIAnalysisResult> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${this.baseURL}/api/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Raw API Response:', result); // Debug log
    console.log('Enhanced image field exists:', 'enhanced_image' in result); // Debug log
    console.log('Enhanced image value:', result.enhanced_image ? 'Present' : 'Missing/Empty'); // Debug log
    return this.processAnalysisResult(result);
  }

  async analyzeVideo(videoFile: File): Promise<AIAnalysisResult> {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await fetch(`${this.baseURL}/api/analyze-video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Video analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Raw Video API Response:', result); // Debug log
    return this.processAnalysisResult(result);
  }

  private processAnalysisResult(apiResult: any): AIAnalysisResult {
    // Handle video analysis results
    if (apiResult.video_analysis) {
      return {
        severity: this.mapSeverity(apiResult.overall_severity),
        confidence: apiResult.overall_confidence || 0.5,
        suggestions: this.generateVideoSuggestions(apiResult),
        detections: apiResult.detections,
        enhanced_image: apiResult.enhanced_image,
        gps_info: apiResult.gps_info
      };
    }
    
    // Handle image analysis results
    if (apiResult.detections && apiResult.detections.length > 0) {
      // Use the highest confidence detection
      const detection = apiResult.detections[0];
      
      return {
        severity: this.mapSeverity(detection.severity),
        confidence: detection.confidence || 0.5,
        suggestions: this.generateSuggestions(detection, apiResult),
        detections: apiResult.detections,
        enhanced_image: apiResult.enhanced_image,
        gps_info: apiResult.gps_info
      };
    } else {
      // No potholes detected
      return {
        severity: 'low',
        confidence: 0.1,
        suggestions: [
          'No potholes detected in this image',
          'Please ensure the image clearly shows the pothole',
          'Try taking a closer or clearer photo',
          'Manual severity selection may be more appropriate'
        ],
        detections: [],
        enhanced_image: apiResult.enhanced_image
      };
    }
  }

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
      // Handle model class names
      'minor_pothole': 'low',
      'medium_pothole': 'medium',
      'severe_pothole': 'critical'
    };
    return severityMap[severity] || 'medium';
  }

  private generateSuggestions(detection: any, apiResult: any): string[] {
    const suggestions: string[] = [];
    
    // Confidence-based suggestions
    if (detection.confidence > 0.9) {
      suggestions.push(`High confidence detection (${Math.round(detection.confidence * 100)}%) - immediate attention recommended`);
    } else if (detection.confidence > 0.7) {
      suggestions.push(`Good confidence detection (${Math.round(detection.confidence * 100)}%) - likely requires repair`);
    } else {
      suggestions.push(`Moderate confidence (${Math.round(detection.confidence * 100)}%) - manual verification suggested`);
    }

    // Class-based suggestions
    if (detection.class) {
      const className = detection.class.replace('_', ' ');
      suggestions.push(`Detected as: ${className}`);
    }

    // Size-based suggestions
    if (detection.bbox) {
      const area = (detection.bbox[2] - detection.bbox[0]) * (detection.bbox[3] - detection.bbox[1]);
      if (area > 0.2) {
        suggestions.push('Large pothole area detected - high priority for repair');
      } else if (area > 0.1) {
        suggestions.push('Medium-sized pothole - monitor for expansion');
      } else {
        suggestions.push('Small pothole detected - consider preventive maintenance');
      }
    }

    // GPS-based suggestions
    if (apiResult.gps_info && apiResult.gps_info.latitude && apiResult.gps_info.longitude) {
      suggestions.push('GPS coordinates extracted from image metadata');
    } else {
      suggestions.push('No GPS data in image - using current location');
    }

    // Severity-based suggestions
    if (detection.severity === 'critical') {
      suggestions.push('⚠️ Critical severity - immediate repair recommended');
    } else if (detection.severity === 'high') {
      suggestions.push('🟠 High priority - schedule repair within 1-2 weeks');
    } else if (detection.severity === 'medium') {
      suggestions.push('🟡 Medium priority - schedule repair within 1 month');
    } else {
      suggestions.push('🟢 Low priority - monitor and include in routine maintenance');
    }

    return suggestions;
  }

  private generateVideoSuggestions(apiResult: any): string[] {
    const suggestions: string[] = [];
    const detectionCount = apiResult.detections ? apiResult.detections.length : 0;
    
    if (detectionCount > 0) {
      suggestions.push(`🎬 Video analysis found ${detectionCount} pothole detection${detectionCount > 1 ? 's' : ''} across multiple frames`);
      
      if (apiResult.overall_confidence > 0.8) {
        suggestions.push(`High overall confidence (${Math.round(apiResult.overall_confidence * 100)}%) - multiple consistent detections`);
      } else if (apiResult.overall_confidence > 0.6) {
        suggestions.push(`Good overall confidence (${Math.round(apiResult.overall_confidence * 100)}%) - detections found in video`);
      } else {
        suggestions.push(`Moderate confidence (${Math.round(apiResult.overall_confidence * 100)}%) - manual verification of video recommended`);
      }
      
      // Count severe potholes
      const severeCount = apiResult.detections.filter((d: any) => 
        d.severity === 'critical' || d.severity === 'high'
      ).length;
      
      if (severeCount > 0) {
        suggestions.push(`⚠️ ${severeCount} severe pothole${severeCount > 1 ? 's' : ''} detected - priority attention needed`);
      }
      
      suggestions.push('🎯 Best detection frame shown - check video for full context');
    } else {
      suggestions.push('🎬 No potholes detected in video frames');
      suggestions.push('Try a video with clearer road surface visibility');
      suggestions.push('Ensure good lighting and stable camera movement');
    }
    
    return suggestions;
  }

  // Health check method
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, { 
        method: 'GET',
        timeout: 5000 
      } as any);
      return response.ok;
    } catch (error) {
      console.warn('AI service health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const aiService = new PotholeAIService();

// Enhanced analysis function with error handling and fallback
export const analyzeImageWithFallback = async (imageFile: File): Promise<AIAnalysisResult> => {
  try {
    // Check if service is available
    const isHealthy = await aiService.checkServiceHealth();
    if (!isHealthy) {
      throw new Error('AI service is not available');
    }

    // Perform analysis
    return await aiService.analyzeImage(imageFile);

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Show user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        toast.error('Cannot connect to AI service. Please check if the backend is running.');
      } else if (error.message.includes('500')) {
        toast.error('AI service error. Please try again or contact support.');
      } else {
        toast.error('AI analysis failed. Using manual classification.');
      }
    }

    // Return fallback result for manual classification
    return {
      severity: 'medium',
      confidence: 0,
      suggestions: [
        '🔧 AI analysis unavailable - using manual classification',
        '👤 Please select appropriate severity level manually',
        '📡 Ensure backend server is running on port 5002',
        '🌐 Check network connection and try again',
        '💡 Manual assessment can be as accurate as AI detection'
      ]
    };
  }
};

export default aiService;
