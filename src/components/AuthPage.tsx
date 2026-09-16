import React, { useState } from 'react';
import { FolderLock, Mail, Lock, User as UserIcon, ArrowRight, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.ts';
import { firestoreService } from '../lib/firestoreService.ts';
import { api } from '../lib/api.ts';
import { User, StorageStats } from '../types.ts';

interface AuthPageProps {
  onAuthSuccess: (user: User, stats: StorageStats) => void;
}

const EMPTY_STATS: StorageStats = {
  totalFiles: 0,
  totalBytes: 0,
  formattedSize: '0 B',
  categoryBreakdown: { images: 0, documents: 0, designs: 0, archives: 0, others: 0 }
};

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'freelancer' | 'designer'>('client');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup' && !name) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await api.signup({ email, password, name, role });
        const currentUserData = await api.getCurrentUser();
        if (currentUserData) {
          onAuthSuccess(currentUserData.user, currentUserData.stats);
        } else {
          // Signup succeeded and token was stored, but /me failed.
          // Fall back to what signup returned, with empty stats.
          onAuthSuccess(result.user, EMPTY_STATS);
        }
      } else {
        await api.login({ email, password });
        const currentUserData = await api.getCurrentUser();
        if (currentUserData) {
          onAuthSuccess(currentUserData.user, currentUserData.stats);
        } else {
          setErrorMessage('Signed in, but failed to load your profile. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;

      const userProfile: User = {
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        role: 'freelancer',
        createdAt: new Date().toISOString()
      };

      // Sync with Firestore collection /users/{userId}
      await firestoreService.syncUserProfile(userProfile);

      // Sync session with backend API
      const syncResult = await api.syncFirebaseUser({
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role
      });

      const current = await api.getCurrentUser();

      onAuthSuccess(syncResult.user, current?.stats || EMPTY_STATS);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      // Don't show a harsh error if the user just closed the popup
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await api.login({ email: demoEmail, password: 'password123' });
      const currentUserData = await api.getCurrentUser();
      if (currentUserData) {
        onAuthSuccess(currentUserData.user, currentUserData.stats);
      } else {
        setErrorMessage('Demo sign in failed to load profile.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#090f1f] text-white shadow-lg mb-4">
          <FolderLock className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Data Portal</h2>
        <p className="mt-2 text-sm text-slate-600">
          Secure client file portal for designers, freelancers, and clients
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {/* Primary Firebase Auth: Google Sign-in */}
          <button
            id="btn-google-auth"
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 mb-5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
              or email &amp; password
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              id="tab-signin"
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                mode === 'signin'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                mode === 'signup'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create an Account
            </button>
          </div>

          {errorMessage && (
            <div
              id="auth-error-alert"
              className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Jordan Miller"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    I am a
                  </label>
                  <select
                    id="auth-role"
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="client">Client (Reviewing &amp; uploading files)</option>
                    <option value="freelancer">Freelancer (Sharing project files)</option>
                    <option value="designer">Designer (Creative assets &amp; specs)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === 'signin' ? (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Create an Account</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 text-center mb-3">
              Fast Preview with Pre-loaded Demo Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-quick-login-designer"
                type="button"
                onClick={() => handleQuickLogin('alex@designstudio.com')}
                className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-center transition-colors border border-slate-200/60"
              >
                Alex (Designer)
              </button>
              <button
                id="btn-quick-login-client"
                type="button"
                onClick={() => handleQuickLogin('sarah@clientbrand.co')}
                className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-center transition-colors border border-slate-200/60"
              >
                Sarah (Client)
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict per-user data isolation &amp; encrypted storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
