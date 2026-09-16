import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import { firestoreService } from './lib/firestoreService.ts';
import { User, FileItem, StorageStats } from './types.ts';
import { api } from './lib/api.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { UploadZone } from './components/UploadZone.tsx';
import { FileList } from './components/FileList.tsx';
import { FilePreviewModal } from './components/FilePreviewModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { ShieldCheck, Check, AlertCircle, Flame } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Filters & State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Banner / Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Check initial authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await api.getCurrentUser();
        if (data) {
          setUser(data.user);
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch files when user, category, search, or sort changes
  const loadFiles = useCallback(async () => {
    if (!user) return;
    setLoadingFiles(true);
    try {
      const data = await api.getFiles({
        category: activeCategory,
        search: searchQuery,
        sort: sortBy
      });
      setFiles(data.files);
      setStats(data.stats);
    } catch (err: any) {
      showNotification(err.message || 'Failed to load files', 'error');
    } finally {
      setLoadingFiles(false);
    }
  }, [user, activeCategory, searchQuery, sortBy]);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user, loadFiles]);

  // Auth Handlers
  const handleAuthSuccess = (authenticatedUser: User, initialStats: StorageStats) => {
    setUser(authenticatedUser);
    setStats(initialStats);
    showNotification(`Welcome, ${authenticatedUser.name}!`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore firebase signout error
    }
    await api.logout();
    setUser(null);
    setFiles([]);
    setStats(null);
    showNotification('Signed out successfully.');
  };

  // File Handlers
  const handleUploadSuccess = (newFiles: FileItem[], updatedStats: StorageStats) => {
    setStats(updatedStats);
    // Sync newly uploaded files into Firestore collection
    for (const f of newFiles) {
      firestoreService.saveFileRecord(f).catch(err => {
        console.warn('Firestore file sync notice:', err);
      });
    }
    loadFiles();
    showNotification(`Uploaded ${newFiles.length} file${newFiles.length > 1 ? 's' : ''} to your vault.`);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      const result = await api.deleteFile(fileToDelete.id);
      // Remove from Firestore collection
      if (user?.id) {
        firestoreService.deleteFileRecord(user.id, fileToDelete.id).catch(err => {
          console.warn('Firestore delete record notice:', err);
        });
      }
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      setStats(result.stats);
      showNotification(`File "${fileToDelete.originalName}" was permanently deleted.`);
      setFileToDelete(null);
      if (previewFile?.id === fileToDelete.id) {
        setPreviewFile(null);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete file', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Initial loader while verifying session
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading ShoppyVault...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Login / Signup Screen
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Authenticated: Show Portal Dashboard
  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Dark Navy Sidebar */}
      <Sidebar
        user={user}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onSignOut={handleSignOut}
        stats={stats}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area (White and Light Gray) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Navbar
          user={user}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
          onSignOut={handleSignOut}
        />

        {/* Floating Toast Notification */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div
              className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 ${
                notification.type === 'success'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-rose-900 text-white border-rose-800'
              }`}
            >
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{notification.text}</span>
            </div>
          </div>
        )}

        {/* Dashboard Content Container */}
        <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Client File Portal
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Welcome, <span className="font-semibold text-slate-700">{user.name}</span>. Securely upload, view, and organize deliverables for your projects.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Firestore Enabled</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vault Protected</span>
              </span>
            </div>
          </div>

          {/* File Upload Zone */}
          <UploadZone onUploadSuccess={handleUploadSuccess} />

          {/* Uploaded Files List */}
          <FileList
            files={files}
            loading={loadingFiles}
            onPreview={file => setPreviewFile(file)}
            onRequestDelete={file => setFileToDelete(file)}
          />
        </main>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={file => {
          setPreviewFile(null);
          setFileToDelete(file);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        file={fileToDelete}
        isOpen={!!fileToDelete}
        deleting={isDeleting}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
