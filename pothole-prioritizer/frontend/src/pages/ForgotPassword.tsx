import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Card from '../components/Card';
import Button from '../components/Button';
import { getApiUrl } from '../config/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(getApiUrl('api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reset email');
      }

      setIsSubmitted(true);
      toast.success('Password reset instructions sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-3xl">✉️</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
            <p className="text-gray-600 mt-2">We've sent password reset instructions to your email</p>
          </div>

          <Card className="p-8">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                If an account exists with <strong>{email}</strong>, you will receive an email with instructions to reset your password.
              </p>
              <p className="text-xs text-gray-500">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  ← Back to login
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-gray-600 mt-2">Enter your email to receive reset instructions</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to login
            </Link>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">💡 Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Check your spam/junk folder if you don't see the email</li>
              <li>• The reset link will expire in 1 hour</li>
              <li>• Contact support if you need additional help</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
