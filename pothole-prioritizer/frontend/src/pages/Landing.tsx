import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Stats {
  total_detected: number;
  fixed_count: number;
  pending_count: number;
  avg_response_days: number;
}

const Landing: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    total_detected: 0,
    fixed_count: 0,
    pending_count: 0,
    avg_response_days: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAfter, setShowAfter] = useState(false);
  const [currentPair, setCurrentPair] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Image pairs for slideshow - defined outside to prevent re-creation
  const imagePairs = React.useMemo(() => [
    { before: '/images/demo/before1.jpeg', after: '/images/demo/after1.jpeg' },
    { before: '/images/demo/before2.jpeg', after: '/images/demo/after2.jpeg' },
    { before: '/images/demo/before3.jpeg', after: '/images/demo/after3.jpeg' }
  ], []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(getApiUrl('api/public-stats'));
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Auto-slideshow effect for before/after images
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAfter(prev => {
        // If showing after, switch to next pair's before
        if (prev) {
          setCurrentPair(p => (p + 1) % imagePairs.length);
          return false;
        }
        // If showing before, switch to after
        return true;
      });
    }, 3000); // Switch every 3 seconds

    return () => clearInterval(interval);
  }, [imagePairs.length]);

  // Show scroll hint after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScrollHint(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  // Scroll to AI Detection Demo section
  const scrollToDemo = () => {
    const demoSection = document.getElementById('ai-demo-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowScrollHint(false); // Hide after clicking
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="pt-10 pb-14 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium mb-4 border border-emerald-200">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Smart Roads Initiative
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Safer Roads Through
              <br />
              <span className="text-emerald-600">AI Technology</span>
            </h1>
            
            <p className="text-xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed">
              AI-powered road monitoring for safer streets and faster repairs.
            </p>
          </div>

          {/* Service Impact Stats - Real-time from Database */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {/* Total Detected */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {loading ? '...' : stats.total_detected.toLocaleString()}
              </div>
              <div className="text-lg font-medium text-gray-700 mb-1">Total Detected</div>
              <div className="text-sm text-gray-500">Potholes found</div>
            </div>
            
            {/* Fixed Count */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {loading ? '...' : stats.fixed_count.toLocaleString()}
              </div>
              <div className="text-lg font-medium text-gray-700 mb-1">Repaired</div>
              <div className="text-sm text-gray-500">Issues fixed</div>
            </div>
            
            {/* Average Response Time */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {loading ? '...' : stats.avg_response_days}
              </div>
              <div className="text-lg font-medium text-gray-700 mb-1">Days Average</div>
              <div className="text-sm text-gray-500">Response time</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center relative">
            {/* Scroll Down Indicator - appears after 8 seconds */}
            {showScrollHint && (
              <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-10">
                <button 
                  onClick={scrollToDemo}
                  className="bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 border border-emerald-200 shadow-sm animate-bounce hover:bg-white/80 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="text-sm font-medium">Scroll down</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                to="/detection"
                className="group bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition-all duration-300 text-lg font-semibold shadow-lg"
              >
                Detect Pothole
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
              </Link>
              <Link
                to="/about"
                className="border-2 border-emerald-600 text-emerald-700 px-8 py-4 rounded-lg hover:bg-emerald-50 transition-all duration-300 text-lg font-semibold"
              >
                Learn More
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  24/7 Monitoring
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Transparent
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                  </svg>
                  Free to Use
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Detection Demo Section */}
      <section id="ai-demo-section" className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-4 border border-emerald-200">
              AI in Action
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See Instant Detection
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              AI identifies potholes and rates severity in under 1 second
            </p>
          </div>

          {/* Slideshow Container */}
          <div className="max-w-3xl mx-auto mb-10">
            <div className="relative">
              {/* Before Image */}
              <div className={`transition-all duration-1000 ${showAfter ? 'opacity-0 absolute inset-0' : 'opacity-100 relative'}`}>
                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                  <div className="text-center mb-4">
                    <span className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold">
                      📷 Original Photo
                    </span>
                  </div>
                  {/* Original image */}
                  <img 
                    src={imagePairs[currentPair].before}
                    alt="Road with potholes before AI detection"
                    className="rounded-lg aspect-video object-cover w-full"
                  />
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Standard road photograph
                  </div>
                </div>
              </div>

              {/* After Image */}
              <div className={`transition-all duration-1000 ${showAfter ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'}`}>
                <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-300 shadow-xl">
                  <div className="text-center mb-4">
                    <span className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      ✓ AI Detected
                    </span>
                  </div>
                  {/* AI annotated image */}
                  <img 
                    src={imagePairs[currentPair].after}
                    alt="Road with AI-detected potholes highlighted"
                    className="rounded-lg aspect-video object-cover w-full"
                  />
                </div>
              </div>
            </div>

            {/* Slideshow Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {imagePairs.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentPair(index);
                    setShowAfter(false);
                  }}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentPair === index ? 'bg-emerald-600 w-8' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Show image pair ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Features of Detection */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Instant Analysis</h3>
              <p className="text-sm text-gray-600">Results in under 1 second</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Severity Rating</h3>
              <p className="text-sm text-gray-600">Low, Medium, High, Critical</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Location Tagged</h3>
              <p className="text-sm text-gray-600">Auto-pinned on map</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/detection"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Try It Yourself
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-sm text-gray-500 mt-3">No login required • Upload any road photo</p>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-14 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Core Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need for efficient road maintenance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI Detection</h3>
              <p className="text-gray-600 text-sm">Upload a photo and AI instantly identifies potholes with severity rating</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Duplicate Prevention</h3>
              <p className="text-gray-600 text-sm">System checks 25m radius to prevent duplicate reports on same pothole</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Priority</h3>
              <p className="text-gray-600 text-sm">AI ranks issues by severity, multiple reports, and safety impact</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Live Tracking</h3>
              <p className="text-gray-600 text-sm">Track your report status anytime using reference number</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Route Planning</h3>
              <p className="text-gray-600 text-sm">Plan safer routes that avoid high-risk pothole areas</p>
            </div>

            {/* Feature 7 */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Multi-Level Admin</h3>
              <p className="text-gray-600 text-sm">Panchayat, Municipality, District, State & National authorities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Information Section */}
      <section className="py-14 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Safer Roads Together
            </h2>
            <p className="text-xl text-emerald-100 mb-8">
              Questions? We're here to help.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                to="/detection"
                className="bg-white text-emerald-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors text-lg font-bold shadow-lg"
              >
                Detect Pothole
              </Link>
              <Link
                to="/about"
                className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-emerald-600 transition-colors text-lg font-semibold"
              >
                Contact Us
              </Link>
            </div>
            
            <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm">
              <div className="grid md:grid-cols-3 gap-6 text-emerald-100">
                <div>
                  <h4 className="font-semibold text-white mb-2">Emergency</h4>
                  <p className="text-sm">(555) 123-4567</p>
                  <p className="text-sm">24/7 Available</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Office</h4>
                  <p className="text-sm">Mon-Fri: 8AM - 5PM</p>
                  <p className="text-sm">(555) 123-4568</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Online</h4>
                  <p className="text-sm">Report anytime</p>
                  <p className="text-sm">Track status</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">Road Monitor</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                AI-powered road monitoring for safer communities.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link></li>
                <li><Link to="/detection" className="hover:text-emerald-400 transition-colors">Detect</Link></li>
                <li><Link to="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-sm">
                <p>City Hall Drive 123</p>
                <p>State 12345</p>
                <p>(555) 123-4567</p>
                <p>info@city.gov</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Road Monitor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
