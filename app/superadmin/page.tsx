'use client';

import { useState, useEffect } from 'react';
import { Settings, Clock, MessageSquare, Save, LogOut, Activity } from 'lucide-react';

interface SuperadminSettings {
  id: string;
  instanceName: string;
  targetGroupId: string;
  scheduleHour: number;
  messageTemplate: string;
  isEnabled: boolean;
  lastSentAt: string | null;
}

export default function SuperadminPage() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [settings, setSettings] = useState<SuperadminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      if (parsedUser.role === 'superadmin') {
        fetchSettings();
      } else {
        setLoading(false);
      }
    } else {
      setShowLoginModal(true);
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSaving(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowLoginModal(false);

        if (data.user.role === 'superadmin') {
          fetchSettings();
        } else {
          setLoading(false);
        }
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (error) {
      setLoginError('Login failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelLogin = () => {
    setLoginError('Auth required');
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/superadmin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setSettings(null);
    setShowLoginModal(true);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerReport = async () => {
    if (!settings) return;

    if (!settings.instanceName || !settings.targetGroupId) {
      alert('Please configure instance name and target group ID first');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/trigger-report', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('Daily report sent successfully!');
        // Refresh settings to update lastSentAt
        fetchSettings();
      } else {
        alert(data.error || 'Failed to send daily report');
      }
    } catch (error) {
      alert('Error sending daily report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 font-sans">
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white mx-auto w-fit mb-4">
                <Activity size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Authentication Required</h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelLogin}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Superadmin Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure daily WhatsApp reports</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </header>

        {settings && (
          <main className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Evolution API Configuration</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instance Name
                  </label>
                  <input
                    type="text"
                    value={settings.instanceName}
                    onChange={(e) => setSettings({ ...settings, instanceName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g., my-whatsapp-instance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Group ID
                  </label>
                  <input
                    type="text"
                    value={settings.targetGroupId}
                    onChange={(e) => setSettings({ ...settings, targetGroupId: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g., 6281234567890@g.us"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Settings</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Hour (WIB)
                  </label>
                  <select
                    value={settings.scheduleHour}
                    onChange={(e) => setSettings({ ...settings, scheduleHour: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00 WIB
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isEnabled"
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable daily report
                  </label>
                </div>

                {settings.lastSentAt && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last sent: {new Date(settings.lastSentAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Message Template</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message Template
                  </label>
                  <textarea
                    value={settings.messageTemplate}
                    onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                    placeholder="Use placeholders: {activeUsers}, {totalMessages}, {aiImanMessages}, {likes}, {dislikes}, {feedbackNotes}"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Available Placeholders:</h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{activeUsers}"}</code> - Total active users in group</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{activeInternalUsers}"}</code> - Active internal team users</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{activeFosterParents}"}</code> - Active foster parents</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{totalMessages}"}</code> - Total messages sent</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{aiImanMessages}"}</code> - Messages to AI Iman</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{likes}"}</code> - Total likes on AI Iman responses</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{dislikes}"}</code> - Total dislikes on AI Iman responses</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{feedbackNotes}"}</code> - Total feedback notes</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{dayName}"}</code> - Day name (e.g., Senin, Selasa)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{dateStr}"}</code> - Date number (e.g., 1, 15, 30)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{monthName}"}</code> - Month name (e.g., Januari, Februari)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{year}"}</code> - Year (e.g., 2026)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{"{fullDate}"}</code> - Full date (e.g., Senin, 2 September 2026)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleTriggerReport}
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare size={20} />
                {saving ? 'Sending...' : 'Send Report Now'}
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
