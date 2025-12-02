import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';

interface Invitation {
  id: number;
  code: string;
  role: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
}

const AdminPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    role: 'panchayath_admin',
    recipientEmail: '',
    recipientName: '',
    department: ''
  });

  // Check if user has admin privileges (only admins can generate invitations)
  const canGenerateInvitations = user?.role && 
    ['state_admin', 'district_admin', 'national_admin'].includes(user.role);

  const roleOptions = [
    { value: 'panchayath_admin', label: 'Panchayat Admin (Mandal Level)' },
    { value: 'municipality_admin', label: 'Municipal Admin (Mandal Level)' },
    { value: 'district_authority', label: 'District Authority' },
    { value: 'state_authority', label: 'State Authority' },
    { value: 'national_authority', label: 'National Authority' }
  ];

  const fetchInvitations = async () => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5002/api/auth/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const generateAndSendEmail = async () => {
    if (!token || !newInvitation.recipientEmail) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/auth/generate-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newInvitation,
          sendEmail: true
        }),
      });

      if (response.ok) {
        await response.json();
        toast.success(`Invitation sent to ${newInvitation.recipientEmail}!`);
        fetchInvitations(); // Refresh the list
        // Reset form
        setNewInvitation({
          role: 'district_admin',
          recipientEmail: '',
          recipientName: '',
          department: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('Failed to send invitation email');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvitation = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/auth/generate-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newInvitation),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Invitation code generated: ${data.invitation.code}`);
        fetchInvitations(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate invitation');
      }
    } catch (error) {
      toast.error('Failed to generate invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invitation code copied to clipboard!');
  };

  const deleteInvitation = async (code: string) => {
    if (!token) return;
    
    if (!window.confirm(`Are you sure you want to delete invitation code: ${code}?\n\nNote: If this invitation was used to create an authority account, that account will also be deleted.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5002/api/auth/invitations/${code}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.deleted_user) {
          toast.success(`Invitation code and authority account (${result.deleted_user}) deleted successfully!`);
        } else {
          toast.success('Invitation code deleted successfully!');
        }
        fetchInvitations(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete invitation code');
      }
    } catch (error) {
      toast.error('Failed to delete invitation code');
    }
  };

  useEffect(() => {
    if (canGenerateInvitations) {
      fetchInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerateInvitations, token]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h2>
          <p className="text-red-600">Please login to access the admin panel.</p>
        </Card>
      </div>
    );
  }

  if (!canGenerateInvitations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">🔒 Access Restricted</h2>
          <p className="text-red-600 mb-4">
            Only District, State, and National administrators can generate invitation codes.
          </p>
          <p className="text-sm text-red-500">
            Current role: <span className="font-semibold">{user.role}</span>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">🏛️ Admin Panel</h1>
          <p className="text-sm md:text-base text-gray-600">Government Authority Invitation Management</p>
          <div className="mt-3 md:mt-4">
            <span className="inline-flex items-center px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium bg-blue-100 text-blue-800">
              👤 {user.name} - {user.role}
            </span>
          </div>
        </div>

        {/* Generate New Invitation */}
        <Card className="p-3 md:p-6">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-3 md:mb-4">🔑 Generate New Invitation</h2>
          <div className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Authority Level
                </label>
                <select
                  id="role"
                  value={newInvitation.role}
                  onChange={(e) => setNewInvitation({ ...newInvitation, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email (Optional)
                </label>
                <input
                  id="recipientEmail"
                  type="email"
                  value={newInvitation.recipientEmail || ''}
                  onChange={(e) => setNewInvitation({ ...newInvitation, recipientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="authority@municipality.gov"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name (Optional)
                </label>
                <input
                  id="recipientName"
                  type="text"
                  value={newInvitation.recipientName || ''}
                  onChange={(e) => setNewInvitation({ ...newInvitation, recipientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Officer Name"
                />
              </div>
              
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department (Optional)
                </label>
                <input
                  id="department"
                  type="text"
                  value={newInvitation.department || ''}
                  onChange={(e) => setNewInvitation({ ...newInvitation, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Municipality Office"
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <Button
                onClick={generateInvitation}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 w-full md:w-auto"
              >
                {isLoading ? 'Generating...' : '🔑 Generate Code'}
              </Button>
              {newInvitation.recipientEmail && (
                <Button
                  onClick={() => generateAndSendEmail()}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 w-full md:w-auto"
                >
                  📧 Generate & Email
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 md:mt-4 p-3 md:p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-1 md:mb-2">ℹ️ Important Notes:</h4>
            <ul className="text-xs md:text-sm text-amber-700 space-y-1">
              <li>• Invitation codes expire after 30 days</li>
              <li>• Each code can only be used once</li>
              <li>• Share codes securely with authorized personnel only</li>
              <li>• Monitor usage to ensure proper access control</li>
            </ul>
          </div>
        </Card>

        {/* Invitation History */}
        <Card className="p-3 md:p-6">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-3 md:mb-4">📋 Invitation History</h2>
          {invitations.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <p className="text-gray-500">No invitation codes generated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">Code</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">Role</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">Status</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">Created</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">Expires</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 md:py-3 font-mono text-blue-600">
                        {invitation.code}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <span className="inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {invitation.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        {invitation.is_used ? (
                          <span className="inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Used by {invitation.used_by}
                          </span>
                        ) : new Date(invitation.expires_at) < new Date() ? (
                          <span className="inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ⏰ Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            🕐 Active
                          </span>
                        )}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-gray-600">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-gray-600">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(invitation.code)}
                            className="text-blue-600 hover:text-blue-800 text-xs md:text-sm font-medium"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={() => deleteInvitation(invitation.code)}
                            className="text-red-600 hover:text-red-800 text-xs md:text-sm font-medium"
                            title="Delete invitation code"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Access Instructions */}
        <Card className="p-3 md:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <h3 className="text-base md:text-lg font-semibold text-green-800 mb-2 md:mb-3">
            📖 How to Share Invitation Codes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm text-green-700">
            <div>
              <h4 className="font-semibold mb-1 md:mb-2">🔐 Security Best Practices:</h4>
              <ul className="space-y-1">
                <li>• Send codes through secure channels only</li>
                <li>• Verify recipient identity before sharing</li>
                <li>• Monitor usage and report suspicious activity</li>
                <li>• Don't share codes publicly or via email</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1 md:mb-2">📋 Instructions for Recipients:</h4>
              <ul className="space-y-1">
                <li>• Visit the government registration page</li>
                <li>• Enter the invitation code in the required field</li>
                <li>• Complete registration with official details</li>
                <li>• Contact admin if code doesn't work</li>
              </ul>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default AdminPanel;