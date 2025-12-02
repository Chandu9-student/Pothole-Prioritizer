import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About Our System
            </h1>
            <p className="text-xl md:text-2xl opacity-90">
              AI-powered road monitoring for safer communities
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Mission Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg p-10">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl leading-relaxed mb-4">
                    We're building a safer future by connecting citizens directly with their local authorities through AI-powered road monitoring.
                  </p>
                  <p className="text-lg leading-relaxed opacity-90">
                    Our system helps communities report dangerous road conditions instantly, while giving authorities the tools to prioritize and fix the most critical issues first.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-emerald-500">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">📷</span>
                </div>
                <div className="flex items-center mb-4">
                  <span className="text-3xl font-bold text-emerald-600 mr-3">01</span>
                  <h3 className="text-xl font-semibold text-gray-900">Upload Photo</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Take a photo of the pothole using your phone or camera. Our system accepts any image format.
                </p>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-sm text-emerald-800">
                    <strong>No login required!</strong> Citizens can report immediately without creating an account.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-teal-500">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">🤖</span>
                </div>
                <div className="flex items-center mb-4">
                  <span className="text-3xl font-bold text-teal-600 mr-3">02</span>
                  <h3 className="text-xl font-semibold text-gray-900">AI Analysis</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Our AI instantly analyzes the image, detects potholes, and rates severity (Low, Medium, High, Critical).
                </p>
                <div className="bg-teal-50 rounded-lg p-4">
                  <p className="text-sm text-teal-800">
                    <strong>Smart Prevention:</strong> System checks 25m radius to avoid duplicate reports of same pothole.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-amber-500">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">✅</span>
                </div>
                <div className="flex items-center mb-4">
                  <span className="text-3xl font-bold text-amber-600 mr-3">03</span>
                  <h3 className="text-xl font-semibold text-gray-900">Auto Dispatch</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Authorities receive notifications with location, severity, and photos. System prioritizes dangerous issues first.
                </p>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Track Progress:</strong> Get a reference number to monitor repair status anytime.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Who Is This For? */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Who Is This For?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-900">Citizens</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Anyone can report potholes they encounter on roads. Help your community by reporting road damage.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>No login required</strong> - Report instantly</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Get reference number</strong> - Track repair status</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Takes 1 minute</strong> - Quick and easy reporting</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>View live map</strong> - See all reported potholes</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Plan safer routes</strong> - Avoid pothole-heavy roads</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      <path d="M13.5 10.5a1 1 0 011 1v4a1 1 0 01-2 0v-4a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-blue-900">Authorities</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Government officials from Panchayat, Municipality, District, and State levels can manage repairs.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Auto-prioritized list</strong> - Most dangerous first</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Jurisdiction filtering</strong> - See only your area</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Update status</strong> - Mark as in-progress or fixed</span>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700"><strong>Dashboard analytics</strong> - Track performance metrics</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Route Planning Feature */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Smart Route Planning</h2>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-8 border-2 border-indigo-200">
              <div className="flex items-start space-x-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-4">Plan Routes That Avoid Potholes</h3>
                  <p className="text-gray-700 mb-6 text-lg">
                    Our intelligent route planner helps you choose safer roads by showing which routes have fewer potholes and less road damage.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-indigo-900">Compare Routes</span>
                      </div>
                      <p className="text-sm text-gray-600">See multiple route options with pothole count for each</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-indigo-900">Risk Assessment</span>
                      </div>
                      <p className="text-sm text-gray-600">See critical pothole warnings along your route</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-indigo-900">Alternative Paths</span>
                      </div>
                      <p className="text-sm text-gray-600">Get suggestions for smoother, safer routes</p>
                    </div>
                  </div>
                  <div className="mt-6 bg-indigo-100 rounded-lg p-4">
                    <p className="text-indigo-800 text-sm">
                      <strong>💡 Pro Tip:</strong> Use Route Planning on the map page to find the safest path to your destination. Perfect for daily commutes or planning trips!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h2>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">📞</div>
                  <h3 className="font-semibold mb-2">Emergency</h3>
                  <p className="text-gray-600">(555) 123-4567</p>
                  <p className="text-sm text-gray-500">24/7 Available</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🏢</div>
                  <h3 className="font-semibold mb-2">Office</h3>
                  <p className="text-gray-600">Mon-Fri: 8AM - 5PM</p>
                  <p className="text-sm text-gray-500">(555) 123-4568</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📧</div>
                  <h3 className="font-semibold mb-2">Email</h3>
                  <p className="text-gray-600">info@city.gov</p>
                  <p className="text-sm text-gray-500">We reply within 24h</p>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg p-8">
              <h2 className="text-3xl font-bold mb-4">Ready to Report?</h2>
              <p className="text-xl mb-6 opacity-90">
                Help make our roads safer. It takes less than a minute!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/detection"
                  className="inline-block bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Start Detecting Now
                </Link>
                <Link 
                  to="/map"
                  className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-colors"
                >
                  Explore Live Map
                </Link>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default About;