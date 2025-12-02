export interface Detection {
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  bbox: [number, number, number, number];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Video-specific properties
  frame_number?: number;
  frame_timestamp?: number;
  detection_id?: string;
}

export interface DetectionResult {
  detections?: Detection[];
  enhanced_image_path?: string;
  enhanced_image?: string;  // Base64 encoded annotated image from backend
  annotated_image?: string;
  processing_time?: number;
  // Video analysis properties
  type?: 'image' | 'video';
  total_detections?: number;
  frames_processed?: number;
  detection_summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  all_detections?: Detection[];  // Individual detections with frame info
  preview_image?: string;
  output_video_base64?: string;
  output_filename?: string;
  metrics?: {
    process_time?: string;
    detection_count?: number;
    total_detections?: number;
    frames_processed?: number;
    detection_rate?: string;
  };
}

export interface Pothole {
  id: number;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  image_url?: string;
  reported_at?: string;
  created_at?: string;
  reporter_name: string;
  status: 'reported' | 'in_progress' | 'fixed' | 'under_review' | 'completed';
  // Additional properties for API compatibility
  confidence?: number;
  reporter?: string;
  reported_date?: string;
  image_path?: string;
  source?: string;
}

export interface Analytics {
  total_potholes: number;
  severity_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  status_distribution: {
    reported: number;
    in_progress: number;
    fixed: number;
  };
  recent_reports: number;
}

export interface PrioritizationResult {
  prioritized_potholes: Pothole[];
  analytics: Analytics;
}
