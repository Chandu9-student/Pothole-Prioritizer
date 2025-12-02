import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'citizen' as 'citizen' | 'authority' | 'panchayath_admin' | 'municipality_admin' | 'city_admin' | 'district_authority' | 'state_authority' | 'national_authority' | 'district_admin' | 'state_admin' | 'national_admin',
    jurisdictionLevel: '',
    jurisdictionArea: '',
    invitationCode: '', // Add invitation code field
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'verification'>('register');
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const { register } = useAuth();
  const navigate = useNavigate();

  // Determine role type - default to government/authority
  const isGovernmentRole = !roleParam || roleParam === 'government' || roleParam === 'authority';
  const isCitizenRole = roleParam === 'citizen';

  // Set default role to government admin (default to panchayath_admin if no role specified)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      role: roleParam === 'citizen' ? 'citizen' : 'panchayath_admin'
    }));
  }, [roleParam]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }

    if (!formData.email) {
      toast.error('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    // Validate government-specific fields
    if (isGovernmentRole) {
      if (!formData.invitationCode.trim()) {
        toast.error('Invitation code is required for government account registration');
        return false;
      }
      
      if (!formData.jurisdictionArea.trim()) {
        toast.error('Jurisdiction area is required for government officials');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        jurisdictionLevel: formData.jurisdictionLevel,
        jurisdictionArea: formData.jurisdictionArea.trim(),
        invitationCode: formData.invitationCode.trim(), // Include invitation code
      });
      
      toast.success('Registration successful! Please check your email to verify your account.');
      setStep('verification');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Get role-specific display info
  const getRoleInfo = () => {
    if (isGovernmentRole) {
      return {
        icon: '🏛️',
        title: 'Create Government Account',
        subtitle: 'Register as a government official to manage pothole repairs',
        bgGradient: 'from-orange-600 to-amber-600',
        buttonGradient: 'from-orange-500 to-amber-500'
      };
    } else if (isCitizenRole) {
      return {
        icon: '👥',
        title: 'Create Citizen Account',
        subtitle: 'Join the community to report and track pothole repairs',
        bgGradient: 'from-green-600 to-emerald-600',
        buttonGradient: 'from-green-500 to-emerald-500'
      };
    }
    return {
      icon: '🕳️',
      title: 'Create Account',
      subtitle: 'Join the community to track and prioritize pothole repairs',
      bgGradient: 'from-blue-600 to-indigo-600',
      buttonGradient: 'from-blue-500 to-indigo-500'
    };
  };

  const roleInfo = getRoleInfo();

  if (step === 'verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{formData.email}</strong>. 
              Please click the link in the email to activate your account.
            </p>
            <div className="space-y-3">
              <Button onClick={handleBackToLogin} className="w-full">
                Back to Login
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3 md:mb-4">
            <div className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r ${roleInfo.bgGradient} rounded-full flex items-center justify-center`}>
              <span className="text-2xl md:text-3xl">{roleInfo.icon}</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{roleInfo.title}</h2>
          <p className="text-sm md:text-base text-gray-600 mt-2">{roleInfo.subtitle}</p>
          
          {/* Role Indicator */}
          {roleParam && (
            <div className="mt-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isGovernmentRole 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {isGovernmentRole ? '🏛️ Government Official' : '👥 Citizen'}
              </span>
            </div>
          )}
        </div>

        <Card className="p-4 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Create a password (min. 6 characters)"
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            {/* Government-specific fields */}
            {isGovernmentRole && (
              <>
                {/* Invitation Code Field - FIRST for government users */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <label htmlFor="invitationCode" className="block text-sm font-medium text-amber-800 mb-2">
                    🔒 Invitation Code (Required)
                  </label>
                  <input
                    id="invitationCode"
                    name="invitationCode"
                    type="text"
                    required
                    value={formData.invitationCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    placeholder="Enter your government invitation code"
                  />
                  <p className="text-xs text-amber-700 mt-1">
                    Government accounts require a valid invitation code from an administrator
                  </p>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Government Level
                  </label>
                  <select
                    id="role"
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="panchayath_admin">Panchayat Admin (Mandal Level)</option>
                    <option value="municipality_admin">Municipal Admin (Mandal Level)</option>
                    <option value="district_authority">District Authority</option>
                    <option value="state_authority">State Authority</option>
                    <option value="national_authority">National Authority</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="jurisdictionArea" className="block text-sm font-medium text-gray-700 mb-2">
                    Jurisdiction Area
                  </label>
                  <input
                    id="jurisdictionArea"
                    name="jurisdictionArea"
                    type="text"
                    required
                    value={formData.jurisdictionArea}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Mumbai City, Maharashtra State, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Specify the area you have administrative authority over
                  </p>
                </div>
              </>
            )}

            {/* Register Button */}
            <Button
              type="submit"
              className={`w-full bg-gradient-to-r ${roleInfo.buttonGradient} hover:opacity-90`}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Change Role Link */}
          {roleParam && (
            <div className="mt-4 text-center">
              <Link
                to="/role-selection"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Wrong account type? Change role
              </Link>
            </div>
          )}

          {/* Divider - only show for citizens */}
          {!isGovernmentRole && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>
            </div>
          )}

          {/* Guest Continue - only for citizens */}
          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to={`/login${roleParam ? `?role=${roleParam}` : ''}`}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </Card>

        {/* Terms */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
