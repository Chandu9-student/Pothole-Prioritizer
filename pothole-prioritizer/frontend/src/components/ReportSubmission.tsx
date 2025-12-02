import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { LocationData, AddressInfo } from '../types/location';
import { analyzeImageWithFallback, aiService, AIAnalysisResult } from '../services/aiService';
import apiService from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';

interface ReportSubmissionProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
  initialLocation?: LocationData;
}

const ReportSubmission: React.FC<ReportSubmissionProps> = ({
  onSubmitSuccess,
  onCancel,
  initialLocation
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'location' | 'images' | 'details' | 'review'>('location');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(initialLocation || null);
  const [address, setAddress] = useState<AddressInfo | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [manualSeverity, setManualSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      setLocation(locationData);
      
      // Reverse geocoding - replace with actual API call
      const mockAddress: AddressInfo = {
        formattedAddress: `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`,
        locality: 'Sample Area',
        city: 'Bangalore',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001'
      };
      setAddress(mockAddress);
      
      toast.success('Location captured successfully!');
    } catch (error) {
      toast.error('Failed to get current location. Please try again.');
      console.error('Location error:', error);
    } finally {
      setIsGettingLocation(false);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - images.length); // Max 5 images
    if (newFiles.length !== files.length) {
      toast.error('Maximum 5 images allowed');
    }

    setImages(prev => [...prev, ...newFiles]);

    // Create previews
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setIsAnalyzing(true);
    try {
      const file = images[0];
      const isVideo = file.type.startsWith('video/');
      
      console.log(`Analyzing ${isVideo ? 'video' : 'image'} file:`, file.name, file.type);
      
      let result;
      if (isVideo) {
        result = await aiService.analyzeVideo(file);
      } else {
        result = await analyzeImageWithFallback(file);
      }
      
      console.log('AI Analysis Result:', result); // Debug log
      console.log('Enhanced image present:', !!result.enhanced_image); // Debug log
      console.log('Enhanced image length:', result.enhanced_image ? result.enhanced_image.length : 'N/A'); // Debug log
      console.log('Detections found:', result.detections ? result.detections.length : 'N/A'); // Debug log
      
      setAiAnalysisResult(result);
      setManualSeverity(result.severity);
      
      console.log('🔄 State updated - aiAnalysisResult:', !!result);
      console.log('🔄 State updated - enhanced_image:', !!result.enhanced_image);
      console.log('🔄 State updated - detections:', result.detections?.length || 0);
      
      if (result.confidence > 0) {
        const mediaType = isVideo ? 'video' : 'image';
        toast.success(`AI ${mediaType} analysis complete: ${result.severity} severity detected!`);
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed. Please try manual classification.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitReport = async () => {
    if (!user || !location || images.length === 0) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data for API call
      const reportData = {
        latitude: location.latitude,
        longitude: location.longitude,
        severity: manualSeverity,
        description: description || 'Pothole detected via mobile app',
        reporter_name: user.name || user.email || 'Anonymous User',
        image: images[0] // Send the first image
      };

      console.log('Submitting report to API:', {
        ...reportData,
        image: reportData.image ? `${reportData.image.name} (${reportData.image.size} bytes)` : 'No image'
      });
      
      // Make actual API call
      const response = await apiService.reportPothole(reportData);
      
      console.log('Report submitted successfully:', response);
      toast.success('Pothole report submitted successfully!');
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      // Reset form
      setStep('location');
      setLocation(null);
      setAddress(null);
      setImages([]);
      setImagePreviews([]);
      setDescription('');
      setManualSeverity('medium');
      setAiAnalysisResult(null);
      
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLocationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📍 Location</h3>
        <p className="text-gray-600">Where is the pothole located?</p>
      </div>

      {location ? (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <div className="text-green-600">✅</div>
            <div>
              <div className="font-medium text-green-900">Location Captured</div>
              <div className="text-sm text-green-700">
                {address?.formattedAddress || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Accuracy: ±{location.accuracy?.toFixed(0) || 'N/A'}m
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-gray-600 mb-4">
            We need your current location to accurately report the pothole.
          </p>
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full"
          >
            {isGettingLocation ? 'Getting Location...' : '📍 Get Current Location'}
          </Button>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => setStep('images')}
          disabled={!location}
        >
          Next: Add Photos →
        </Button>
      </div>
    </div>
  );

  const renderImagesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📸 Photos</h3>
        <p className="text-gray-600">Take clear photos of the pothole</p>
      </div>

      <Card className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {images.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-gray-600 mb-4">Upload photos of the pothole</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              📸 Choose Photos
            </Button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {images.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400"
                >
                  <span className="text-2xl">+</span>
                </button>
              )}
            </div>
            
            <Button
              onClick={analyzeImages}
              disabled={!images.length || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? '🤖 Analyzing...' : '🤖 Analyze with AI'}
            </Button>
            
            {/* DEBUG: Always visible state information */}
            <div className="mt-4 p-3 bg-gray-100 border rounded text-sm">
              <div className="font-bold mb-2">🐛 DEBUG INFO:</div>
              <div>aiAnalysisResult exists: {aiAnalysisResult ? 'YES' : 'NO'}</div>
              {aiAnalysisResult && (
                <>
                  <div>enhanced_image exists: {aiAnalysisResult.enhanced_image ? 'YES' : 'NO'}</div>
                  <div>enhanced_image length: {aiAnalysisResult.enhanced_image?.length || 'N/A'}</div>
                  <div>detections count: {aiAnalysisResult.detections?.length || 0}</div>
                  <div>severity: {aiAnalysisResult.severity}</div>
                </>
              )}
            </div>
            
            {aiAnalysisResult && (
              <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
                <div className="text-sm">
                  {(() => {
                    console.log('🎨 Rendering AI analysis card - enhanced_image present:', !!aiAnalysisResult.enhanced_image);
                    return null;
                  })()}
                  <div className="font-medium text-blue-900 mb-2">🤖 AI Analysis Result:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="text-blue-800">
                      <span className="font-medium">Detected Severity:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        aiAnalysisResult.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        aiAnalysisResult.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        aiAnalysisResult.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {aiAnalysisResult.severity}
                      </span>
                    </div>
                    <div className="text-blue-700">
                      <span className="font-medium">Confidence:</span>
                      <span className="ml-1">{Math.round(aiAnalysisResult.confidence * 100)}%</span>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${aiAnalysisResult.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  {aiAnalysisResult.suggestions && aiAnalysisResult.suggestions.length > 0 && (
                    <div>
                      <div className="font-medium text-blue-900 mb-2">💡 AI Suggestions:</div>
                      <ul className="text-blue-700 text-xs space-y-1">
                        {aiAnalysisResult.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {aiAnalysisResult.enhanced_image && (
                    <div className="mt-4">
                      <div className="font-medium text-blue-900 mb-2">🎯 Detected Potholes:</div>
                      <div className="rounded-lg overflow-hidden border border-blue-200">
                        <img 
                          src={`data:image/jpeg;base64,${aiAnalysisResult.enhanced_image}`}
                          alt="AI Analysis - Detected Potholes" 
                          className="w-full h-auto"
                          onLoad={() => console.log('✅ Enhanced image loaded successfully')}
                          onError={(e) => console.error('❌ Enhanced image failed to load:', e)}
                          style={{ minHeight: '200px', backgroundColor: '#f0f0f0' }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1 italic">
                        Red boxes show detected potholes with confidence scores
                      </p>
                      <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs">
                        ✅ Enhanced image data: {aiAnalysisResult.enhanced_image.length} characters
                      </div>
                    </div>
                  )}
                  
                  {/* Debug: Show if enhanced_image exists but is empty */}
                  {!aiAnalysisResult.enhanced_image && (
                    <div className="mt-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                      ⚠️ Debug: No enhanced_image received from backend
                      <br />
                      <small>Detections: {aiAnalysisResult.detections ? aiAnalysisResult.detections.length : 0}</small>
                      <br />
                      <small>Analysis Status: {aiAnalysisResult.severity || 'Unknown'}</small>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setStep('location')}>
          ← Back
        </Button>
        <Button
          onClick={() => setStep('details')}
          disabled={images.length === 0}
        >
          Next: Add Details →
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Details</h3>
        <p className="text-gray-600">Provide additional information</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the pothole, its impact, and any safety concerns..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
              <button
                key={severity}
                onClick={() => setManualSeverity(severity)}
                className={`p-3 rounded-lg border text-sm font-medium capitalize ${
                  manualSeverity === severity
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {severity}
              </button>
            ))}
          </div>
          {aiAnalysisResult && (
            <p className="text-xs text-gray-500 mt-1">
              AI suggested: {aiAnalysisResult.severity} ({Math.round(aiAnalysisResult.confidence * 100)}% confidence)
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setStep('images')}>
          ← Back
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={!description.trim()}
        >
          Next: Review →
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">✅ Review</h3>
        <p className="text-gray-600">Review your report before submitting</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">📍 Location</h4>
          <p className="text-sm text-gray-600">
            {address?.formattedAddress || `${location?.latitude.toFixed(6)}, ${location?.longitude.toFixed(6)}`}
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">📸 Photos</h4>
          <div className="flex space-x-2">
            {imagePreviews.slice(0, 3).map((preview, index) => (
              <img
                key={index}
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-16 h-16 object-cover rounded border"
              />
            ))}
            {images.length > 3 && (
              <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-600">
                +{images.length - 3}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">📝 Details</h4>
          <p className="text-sm text-gray-600 mb-2">{description}</p>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Severity:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              manualSeverity === 'critical' ? 'bg-red-100 text-red-800' :
              manualSeverity === 'high' ? 'bg-orange-100 text-orange-800' :
              manualSeverity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {manualSeverity}
            </span>
          </div>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setStep('details')}>
          ← Back
        </Button>
        <Button
          onClick={submitReport}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? 'Submitting...' : '🚀 Submit Report'}
        </Button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Required</h3>
        <p className="text-gray-600 mb-4">Please login to submit a pothole report.</p>
        <Button onClick={() => window.location.href = '/login'}>
          Go to Login
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* DEBUG: Global state information - ALWAYS VISIBLE */}
      <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 rounded text-sm">
        <div className="font-bold mb-2">🚨 GLOBAL DEBUG - Current Step: {step}</div>
        <div>aiAnalysisResult exists: {aiAnalysisResult ? 'YES' : 'NO'}</div>
        {aiAnalysisResult && (
          <>
            <div>enhanced_image exists: {aiAnalysisResult.enhanced_image ? 'YES' : 'NO'}</div>
            <div>enhanced_image length: {aiAnalysisResult.enhanced_image?.length || 'N/A'}</div>
          </>
        )}
      </div>
      
      <Card className="p-6">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {(['location', 'images', 'details', 'review'] as const).map((stepName, index) => (
              <div
                key={stepName}
                className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? 'bg-blue-600 text-white'
                      : ['location', 'images', 'details', 'review'].indexOf(step) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {['location', 'images', 'details', 'review'].indexOf(step) > index ? '✓' : index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      ['location', 'images', 'details', 'review'].indexOf(step) > index
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 'location' && renderLocationStep()}
        {step === 'images' && renderImagesStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'review' && renderReviewStep()}
      </Card>
    </div>
  );
};

export default ReportSubmission;
