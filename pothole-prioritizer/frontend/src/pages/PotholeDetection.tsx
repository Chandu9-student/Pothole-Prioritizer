import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { DetectionResult } from '../types';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Button from '../components/Button';

interface NewPotholeReport {
  latitude: number;
  longitude: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  reporter_name: string;
  image?: File;
}

const PotholeDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [newReport, setNewReport] = useState<NewPotholeReport>({
    latitude: 20.5937,
    longitude: 78.9629,
    severity: 'medium',
    description: '',
    reporter_name: '',
    image: undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [pendingReportData, setPendingReportData] = useState<any>(null);
  
  // Priority confirmation state
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [nearbyPotholes, setNearbyPotholes] = useState<any[]>([]);

  // Reference number dialog state
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [reportedReference, setReportedReference] = useState<string>('');
  const [reportedPothole, setReportedPothole] = useState<any>(null);

  // Create a direct file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to check if file is video
  const isVideoFile = (file: File): boolean => {
    return file.type.startsWith('video/');
  };

  // Helper function to convert base64 data URI to File object
  const convertBase64ToFile = (base64String: string, filename: string): File => {
    // Remove data URI prefix if present
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to binary
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // Create File object
    return new File([byteArray], filename, { type: 'image/jpeg' });
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const isVideo = isVideoFile(file);
      
      setSelectedFile(file);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      setResult(null);
      
      const fileType = isVideo ? 'video' : 'image';
      toast.success(`📁 Selected ${fileType}: ${file.name}`);
    }
  };

  const addToMap = () => {
    if (!result) {
      toast.error('No detection results to add to map');
      return;
    }

    // Handle video results
    if (result.type === 'video') {
      if (!result.total_detections || result.total_detections === 0) {
        toast.error('No detections found in video to add to map');
        return;
      }

      // Find the highest severity from video detection summary
      const detectionSummary = result.detection_summary || { critical: 0, high: 0, medium: 0, low: 0 };
      let highestSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';

      if (detectionSummary.critical && detectionSummary.critical > 0) {
        highestSeverity = 'critical';
      } else if (detectionSummary.high && detectionSummary.high > 0) {
        highestSeverity = 'high';
      } else if (detectionSummary.medium && detectionSummary.medium > 0) {
        highestSeverity = 'medium';
      }

      // Use annotated image if available, otherwise fall back to original file
      const imageToReport = result.annotated_image 
        ? convertBase64ToFile(result.annotated_image, `annotated_${selectedFile?.name || 'video_detection.jpg'}`)
        : selectedFile || undefined;

      setNewReport(prev => ({
        ...prev,
        severity: highestSeverity,
        description: `Video analysis detected ${result.total_detections} potholes across ${result.frames_processed} frames. Severity breakdown: Critical(${detectionSummary.critical || 0}), High(${detectionSummary.high || 0}), Medium(${detectionSummary.medium || 0}), Low(${detectionSummary.low || 0})`,
        image: imageToReport
      }));
      setShowReportModal(true);
      return;
    }

    // Handle image results (existing logic)
    if (!result.detections || result.detections.length === 0) {
      toast.error('No detections to add to map');
      return;
    }

    const firstDetection = result.detections[0];
    
    // Use the same adjusted severity logic
    const adjustedSeverity = getAdjustedSeverity(firstDetection.severity, firstDetection.confidence);
    
    // Use annotated image if available, otherwise fall back to original file
    const imageToReport = result.annotated_image 
      ? convertBase64ToFile(result.annotated_image, `annotated_${selectedFile?.name || 'image_detection.jpg'}`)
      : selectedFile || undefined;
    
    setNewReport(prev => ({
      ...prev,
      severity: adjustedSeverity,
      description: `Auto-detected ${adjustedSeverity} pothole (${(firstDetection.confidence * 100).toFixed(1)}% confidence)${result.detections.length > 1 ? ` - ${result.detections.length} potholes detected` : ''}`,
      image: imageToReport
    }));
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!newReport.description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    if (!newReport.reporter_name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setPendingReportData(newReport);
    setShowConfirmationDialog(true);
  };

  const confirmAndSubmitReport = async () => {
    if (!pendingReportData) return;
    
    setIsSubmitting(true);
    setShowConfirmationDialog(false);
    
    try {
      const response = await apiService.reportPothole(pendingReportData);
      
      // Handle successful pothole reporting
      if (response.status === 'success' && response.pothole?.reference_number) {
        // Successfully created new pothole - show reference number
        const referenceNumber = response.pothole.reference_number;
        toast.success(`🎯 Pothole reported successfully! Reference: ${referenceNumber}`);
        
        // Show reference number prominently
        setShowReportModal(false);
        setPendingReportData(null);
        
        // Store reported pothole data and show reference dialog
        setReportedPothole(response.pothole);
        setShowReferenceDialog(true);
        setReportedReference(referenceNumber);
        
        // Reset form
        setNewReport({
          latitude: 20.5937,
          longitude: 78.9629,
          severity: 'medium',
          description: '',
          reporter_name: '',
          image: undefined
        });
      } else if (response.status === 'nearby_found') {
        // Found nearby potholes - show priority confirmation dialog
        setNearbyPotholes(response.nearby_potholes || []);
        setShowConfirmationDialog(false);
        setShowPriorityDialog(true);
        
        const nearbyCount = response.nearby_potholes?.length || 0;
        toast(`📍 Found ${nearbyCount} nearby pothole(s). Choose to prioritize existing or create new report.`, {
          duration: 4000,
          icon: '⚠️'
        });
      } else {
        toast.error('Unexpected server response format');
        console.error('Unexpected response:', response);
      }
    } catch (error: any) {
      toast.error('Failed to report pothole: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmationDialog(false);
    setPendingReportData(null);
    toast.success('Report submission cancelled');
  };

  const handlePriorityUpdate = async (potholeId: number, priorityBoost: number) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('http://localhost:5002/api/update-priority', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pothole_id: potholeId,
          priority_boost: priorityBoost,
          reporter_name: newReport.reporter_name
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        toast.success(`🔥 Priority updated! Pothole #${potholeId} now has priority score ${data.pothole.priority_score}`);
        setShowPriorityDialog(false);
        setShowReportModal(false);
        setTimeout(() => {
          toast.loading('Navigating to map view...', { duration: 1000 });
          navigate('/map');
        }, 1500);
      } else if (data.status === 'already_voted') {
        toast.error(data.message || 'Please wait a moment before prioritizing again');
      } else {
        toast.error('Failed to update priority');
      }
    } catch (error: any) {
      toast.error('Failed to update priority: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const createNewPotholeAnyway = async () => {
    // Check if this is from AI detection (selectedFile exists) or manual report
    if (selectedFile) {
      // AI detection flow - resubmit with force_create
      setIsSubmitting(true);
      setShowPriorityDialog(false);
      
      try {
        toast.loading('🔍 Creating new report...', { id: 'force-create' });
        
        // Resubmit the detection with force_create flag
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('force_create', 'true');
        
        const response = await fetch('http://localhost:5002/api/analyze', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        toast.dismiss('force-create');
        
        if (data.status === 'success') {
          toast.success(`🎯 New pothole report created successfully!`);
          setShowPriorityDialog(false);
          setNearbyPotholes([]);
          
          // Update result to show success
          const mappedResponse = {
            ...data,
            type: 'image' as const,
            annotated_image: data.annotated_image || null
          };
          setResult(mappedResponse);
        } else {
          toast.error('Failed to create new pothole');
        }
      } catch (error: any) {
        toast.dismiss('force-create');
        toast.error('Force creation failed: ' + (error.message || 'Unknown error'));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    // Manual report flow
    if (!pendingReportData) {
      toast.error('No report data available');
      return;
    }

    setIsSubmitting(true);
    setShowPriorityDialog(false);
    
    try {
      // Create new pothole with force_create flag to bypass duplicate check
      const response = await apiService.reportPothole({
        ...pendingReportData,
        force_create: true
      });
      
      if (response.status === 'success' && response.pothole?.reference_number) {
        const referenceNumber = response.pothole.reference_number;
        toast.success(`🎯 New pothole created successfully! Reference: ${referenceNumber}`);
        setShowReportModal(false);
        setPendingReportData(null);
        setNearbyPotholes([]);
        
        // Store reported pothole data and show reference dialog
        setReportedPothole(response.pothole);
        setShowReferenceDialog(true);
        setReportedReference(referenceNumber);
        
        setNewReport({
          latitude: 20.5937,
          longitude: 78.9629,
          severity: 'medium',
          description: '',
          reporter_name: '',
          image: undefined
        });
      } else {
        toast.error('Failed to create new pothole');
      }
    } catch (error: any) {
      toast.error('Force creation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelPriorityDialog = () => {
    setShowPriorityDialog(false);
    setNearbyPotholes([]);
    toast('Priority update cancelled', { icon: 'ℹ️' });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    const isVideo = isVideoFile(selectedFile);

    setLoading(true);
    try {
      if (isVideo) {
        toast.loading('🎬 Analyzing video... This may take a few minutes.', { id: 'analysis' });
        
        const response = await apiService.detectPotholesInVideo(selectedFile);
        
        // Map enhanced_image to annotated_image for compatibility
        const mappedResponse = {
          ...response,
          type: 'video' as const,  // Set type for video analysis
          annotated_image: response.enhanced_image ? `data:image/jpeg;base64,${response.enhanced_image}` : null
        };
        setResult(mappedResponse);
        
        toast.dismiss('analysis');
        
        if (response.total_detections && response.total_detections > 0) {
          toast.success(`🎯 Found ${response.total_detections} pothole${response.total_detections > 1 ? 's' : ''} across ${response.frames_processed} frames!`);
        } else {
          toast('ℹ️ No potholes detected in this video', { icon: '🎬' });
        }
      } else {
        toast.loading('🔍 Analyzing image...', { id: 'analysis' });
        
        const response = await apiService.detectPotholes(selectedFile);
        
        toast.dismiss('analysis');
        
        // Check if nearby potholes were found (duplicate detection)
        if (response.status === 'nearby_found') {
          setNearbyPotholes(response.nearby_potholes || []);
          setShowPriorityDialog(true);
          
          const nearbyCount = response.nearby_potholes?.length || 0;
          toast(`📍 Found ${nearbyCount} nearby pothole(s). Choose to prioritize existing or create new report.`, {
            duration: 4000,
            icon: '⚠️'
          });
          
          // Store result for later use
          const mappedResponse = {
            ...response,
            type: 'image' as const,
            annotated_image: response.annotated_image || null
          };
          setResult(mappedResponse);
          return; // Don't continue with normal flow
        }
        
        // Use annotated_image from response (backend already includes data URI prefix)
        const mappedResponse = {
          ...response,
          type: 'image' as const,  // Set type for image analysis
          annotated_image: response.annotated_image || null
        };
        setResult(mappedResponse);
        
        if (response.detections && response.detections.length > 0) {
          toast.success(`🎯 Found ${response.detections.length} pothole${response.detections.length > 1 ? 's' : ''}!`);
        } else {
          toast('ℹ️ No potholes detected in this image', { icon: '🔍' });
        }
      }
      
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 300);
      
    } catch (error: any) {
      toast.dismiss('analysis');
      
      if (error.message?.includes('Network Error') || error.message?.includes('500')) {
        toast.error('🚫 AI model server unavailable. Please try again later.');
      } else if (error.message?.includes('timeout')) {
        toast.error('⏱️ Analysis timeout. Please try with a shorter video or smaller image.');
      } else {
        toast.error('❌ Analysis failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    toast.success('🗑️ Cleared all data');
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'from-red-500 to-red-600',
      high: 'from-orange-500 to-orange-600',
      medium: 'from-yellow-500 to-yellow-600',
      low: 'from-green-500 to-green-600'
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getSeverityIcon = (severity: string) => {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '🔶',
      low: '✅'
    };
    return icons[severity as keyof typeof icons] || icons.medium;
  };

  // Helper function to adjust severity based on confidence score
  const getAdjustedSeverity = (originalSeverity: string, confidence: number): 'critical' | 'high' | 'medium' | 'low' => {
    return confidence >= 0.85 ? 'critical' : originalSeverity as 'critical' | 'high' | 'medium' | 'low';
  };

  return (
    <>
      <PageLayout>
        {/* Upload Section */}
        <Card className="p-8 mb-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                📁
              </span>
              Upload Image or Video
            </h2>
            <p className="text-gray-600">Select an image or video to begin pothole detection</p>
          </div>
          
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
              selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {/* File input */}
            <input
              type="file"
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={e => {
                handleFileSelect(e.target.files);
              }}
              className="hidden"
              id="file-input-working"
            />
            
            <div className="space-y-4">
              <div className="text-6xl">
                {selectedFile ? (isVideoFile(selectedFile) ? '🎬' : '✅') : '📷'}
              </div>
              
              {/* Choose File Button */}
              <div className="flex justify-center">
                <label
                  htmlFor="file-input-working"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-semibold text-lg"

                >
                  📁 Choose File
                </label>
              </div>
              
              <div>
                {selectedFile ? (
                  <div>
                    <p className="text-lg font-medium text-green-600">
                      ✅ {isVideoFile(selectedFile) ? 'Video' : 'Image'} ready for analysis!
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{selectedFile.name}</p>
                    <p className="text-xs text-blue-600 mt-2 font-medium">👆 Click "Start AI Analysis" button below</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Click "Choose File" to select an image or video
                    </p>
                    <p className="text-sm text-gray-500">
                      Images: JPG, PNG, GIF, BMP, WebP | Videos: MP4, AVI, MOV
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Image Preview */}
        {previewUrl && (
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                �️
              </span>
              Selected File Preview
            </h3>
            <div className="flex justify-center mb-4">
                            <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              {selectedFile && (
                <Button
                  onClick={handleAnalyze}
                  loading={loading}
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔍</span>
                      Start AI Analysis
                    </>
                  )}
                </Button>
              )}
              
              {selectedFile && (
                <Button
                  onClick={clearAll}
                  variant="secondary"
                  size="lg"
                  className="px-6"
                >
                  🗑️ Clear
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Results Section */}
        {result && (
          <div ref={resultsRef}>
            <Card className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                  🎯
                </span>
                Detection Results - {result.type === 'video' ? 'Video Analysis' : 'Image Analysis'}
              </h3>

      {/* Annotated Image/Video Preview Display */}
      {((result.type === 'video' && result.output_video_base64) || (result.type === 'image' && (result.annotated_image || result.preview_image))) && (
        <div className="mb-8">
          <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-2">
              ✨
            </span>
            AI Detection Results - {result.type === 'video' ? 'Annotated Video with Detected Potholes' : 'Annotated Image'}
          </h4>
          
          <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                    {result.type === 'video' && result.output_video_base64 ? (
                      // Show annotated video player
                      <div className="w-full max-w-4xl">
                        <video
                          controls
                          autoPlay={false}
                          preload="metadata"
                          className="w-full max-h-96 object-contain rounded-lg shadow-lg border-2 border-blue-200"
                          onError={(e) => {
                            (e.target as HTMLVideoElement).poster = '/api/placeholder/640/360';
                          }}
                        >
                          <source 
                            src={`data:video/mp4;base64,${result.output_video_base64}`} 
                            type="video/mp4" 
                          />
                          Your browser does not support the video tag.
                        </video>
                        <div className="text-center mt-2">
                          <p className="text-sm text-gray-600 mb-2">
                            🎬 Annotated video showing all detected potholes with bounding boxes and severity levels
                          </p>
                          <div className="space-x-2">
                            <a
                              href={`data:video/mp4;base64,${result.output_video_base64}`}
                              download={result.output_filename || 'detected_video.mp4'}
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              📥 Download Video
                            </a>
                            <button
                              onClick={() => {
                                const video = document.querySelector('video') as HTMLVideoElement;
                                if (video) {
                                  video.currentTime = 0;
                                  video.play();
                                }
                              }}
                              className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                            >
                              ▶️ Play Video
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : result.type === 'image' && (result.annotated_image || result.preview_image) ? (
                      // Show annotated image (enhanced display)
                      <div className="w-full">
                        {/* Display annotated image with enhanced styling */}
                        <div className="w-full">
                          <img
                            src={result.annotated_image || result.preview_image}
                            alt="AI Detection Results with Bounding Boxes"
                            className="w-full max-h-96 object-contain rounded-lg shadow-lg border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).alt = 'Failed to load image';
                            }}
                          />
                          
                          {/* Enhancement note */}
                          <div className="mt-3 text-center">
                            <p className="text-sm text-gray-600 bg-blue-50 inline-block px-4 py-2 rounded-lg">
                              🎯 <strong>AI-Enhanced Detection:</strong> Red boxes show detected potholes with confidence scores and severity levels
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Detection Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {result.type === 'video' ? (result.total_detections || 0) : (result.detections ? result.detections.length : 0)}
                  </div>
                  <div className="text-sm font-medium text-blue-700">
                    {result.type === 'video' ? 'Total Detections' : 'Potholes Detected'}
                  </div>
                </Card>
                
                <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {result.type === 'video' 
                      ? (result.frames_processed || 0)
                      : result.detections && result.detections.length > 0 
                        ? (result.detections.reduce((sum, d) => sum + d.confidence, 0) / result.detections.length * 100).toFixed(1) + '%'
                        : '0%'
                    }
                  </div>
                  <div className="text-sm font-medium text-green-700">
                    {result.type === 'video' ? 'Frames Processed' : 'Avg. Confidence'}
                  </div>
                </Card>
                
                <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {result.processing_time ? `${result.processing_time.toFixed(2)}s` : 'N/A'}
                  </div>
                  <div className="text-sm font-medium text-purple-700">
                    Processing Time
                  </div>
                </Card>
              </div>

              {/* Video Detection Summary */}
              {result.type === 'video' && result.detection_summary && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">📊 Video Detection Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 text-center bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {result.detection_summary.critical}
                      </div>
                      <div className="text-xs font-medium text-red-700">Critical</div>
                    </Card>
                    <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {result.detection_summary.high}
                      </div>
                      <div className="text-xs font-medium text-orange-700">High</div>
                    </Card>
                    <Card className="p-4 text-center bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600 mb-1">
                        {result.detection_summary.medium}
                      </div>
                      <div className="text-xs font-medium text-yellow-700">Medium</div>
                    </Card>
                    <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {result.detection_summary.low}
                      </div>
                      <div className="text-xs font-medium text-green-700">Low</div>
                    </Card>
                  </div>
                </div>
              )}

              {/* Detection Summary Only - No Individual Details for Videos */}
              {result.type === 'video' ? (
                <Card className="p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="text-4xl mb-4">🎬</div>
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">
                    Video Analysis Complete
                  </h4>
                  <p className="text-gray-600">
                    Processed {result.frames_processed || 0} frames with {result.total_detections || 0} total detections. View the annotated video above to see all detected potholes with their locations and severity levels.
                  </p>
                </Card>
              ) : (result.detections && result.detections.length > 0) ? (
                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3">
                    📋 Detection Details ({result.detections?.length || 0})
                  </h4>
                  
                  <div className="grid gap-4">
                    {result.detections?.map((detection, index) => {
                      const adjustedSeverity = getAdjustedSeverity(detection.severity, detection.confidence);
                      return (
                        <Card key={index} className="p-6 hover:shadow-lg transition-all duration-200" hover>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 bg-gradient-to-r ${getSeverityColor(adjustedSeverity)} rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                                {getSeverityIcon(adjustedSeverity)}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 capitalize text-lg">
                                  {adjustedSeverity} Severity
                                  {detection.confidence >= 0.85 && (
                                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                      High Confidence
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Detection #{index + 1}
                                </div>
                              </div>
                            </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {(detection.confidence * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Confidence</div>
                          </div>
                        </div>
                      </Card>
                      );
                    })}
                  </div>
                </div>
              ) : result.type === 'image' ? (
                <Card className="p-8 text-center bg-gray-50">
                  <div className="text-4xl mb-4">🔍</div>
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">
                    No Potholes Detected
                  </h4>
                  <p className="text-gray-600">
                    The AI analysis didn't find any potholes in this image. Try uploading a different image.
                  </p>
                </Card>
              ) : null}

              {/* Add to Map Button - Show for all results with detections */}
              {((result.detections && result.detections.length > 0) || 
                (result.type === 'video' && result.total_detections && result.total_detections > 0)) && (
                <div className="pt-6 border-t border-gray-200 mt-6">
                  <Button
                    onClick={addToMap}
                    variant="success"
                    size="lg"
                    className="w-full"
                  >
                    📍 Add to Map & Report
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    📝
                  </span>
                  Report Pothole
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={newReport.latitude}
                        onChange={(e) => setNewReport(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={newReport.longitude}
                        onChange={(e) => setNewReport(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            setNewReport(prev => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng
                            }));
                            toast.success('Location updated!');
                          },
                          (error) => {
                            toast.error('Could not get your location');
                          }
                        );
                      } else {
                        toast.error('Geolocation not supported');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📍 Use My Current Location
                  </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={newReport.reporter_name}
                      onChange={(e) => setNewReport(prev => ({ ...prev, reporter_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your name..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={newReport.severity}
                      onChange={(e) => setNewReport(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="critical">🔴 Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newReport.description}
                      onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Description of the pothole..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    onClick={() => setShowReportModal(false)}
                    variant="secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReport}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                  >
                    Report Pothole
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmationDialog && pendingReportData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Confirm Pothole Report</h3>
              
              <div className="space-y-3 mb-6">
                <p className="text-gray-700">
                  <strong>Are you sure you want to submit this pothole report?</strong>
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Location:</span>
                    <span className="text-sm text-gray-800">
                      {pendingReportData.latitude.toFixed(4)}, {pendingReportData.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Severity:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      pendingReportData.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      pendingReportData.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      pendingReportData.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {pendingReportData.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Reporter:</span>
                    <span className="text-sm text-gray-800">{pendingReportData.reporter_name}</span>
                  </div>
                  {pendingReportData.description && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Description:</span>
                      <p className="text-sm text-gray-800 mt-1">{pendingReportData.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelConfirmation}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAndSubmitReport}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>✅</span>
                  <span>{isSubmitting ? 'Submitting...' : 'Confirm & View on Map'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Priority Confirmation Dialog */}
        {showPriorityDialog && nearbyPotholes.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Nearby Potholes Found</h3>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  We found <strong>{nearbyPotholes.length}</strong> existing pothole report(s) within 25 meters of your location. 
                  You can help prioritize existing reports or create a new one.
                </p>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {nearbyPotholes.map((nearby) => (
                    <div key={nearby.id} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">Pothole #{nearby.id}</span>
                          <span className="text-sm text-gray-500">({nearby.distance} away)</span>
                          {nearby.priority_score > 1 && (
                            <span className="text-red-600 font-bold text-sm">🔥{nearby.priority_score}</span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          nearby.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          nearby.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          nearby.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {nearby.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{nearby.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Reported: {new Date(nearby.reported_date).toLocaleDateString()}</span>
                        <span>{nearby.report_count} report(s)</span>
                      </div>

                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => handlePriorityUpdate(nearby.id, 1)}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors"
                        >
                          +1 Priority (Minor)
                        </button>
                        <button
                          onClick={() => handlePriorityUpdate(nearby.id, 2)}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                        >
                          +2 Priority (Urgent)
                        </button>
                        <button
                          onClick={() => handlePriorityUpdate(nearby.id, 3)}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                        >
                          +3 Priority (Critical)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Can't find the same pothole?</strong> You can still create a new report if this is a different pothole.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelPriorityDialog}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewPotholeAnyway}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create New Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reference Number Success Dialog */}
        {showReferenceDialog && reportedReference && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🎯 Pothole Reported Successfully!</h3>
                
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Your reference number:</p>
                  <p className="text-xl font-bold text-blue-600 mb-2">{reportedReference}</p>
                  <p className="text-xs text-gray-500">
                    Save this reference number to track your pothole report
                  </p>
                </div>

                <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm">What happens next?</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Your report has been submitted to authorities</li>
                    <li>• You can track progress using your reference number</li>
                    <li>• No account required - just save the reference number</li>
                    <li>• Status updates will be visible on the tracking page</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      // Navigate to map with the newly reported pothole location
                      if (reportedPothole) {
                        navigate('/map', {
                          state: {
                            focusLocation: {
                              lat: reportedPothole.latitude || reportedPothole.lat,
                              lng: reportedPothole.longitude || reportedPothole.lng
                            },
                            selectedPothole: reportedPothole
                          }
                        });
                        setShowReferenceDialog(false);
                        setReportedPothole(null);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    🗺️ View on Map
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(reportedReference);
                      toast.success('Reference number copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    📋 Copy Reference
                  </button>
                  <button
                    onClick={() => navigate('/track')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                  >
                    🔍 Track Later
                  </button>
                  <button
                    onClick={() => {
                      setShowReferenceDialog(false);
                      setReportedReference('');
                      setReportedPothole(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageLayout>
    </>
  );
};

export default PotholeDetectionPage;
