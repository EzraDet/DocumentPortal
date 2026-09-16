import React from 'react';
import {
  FolderLock,
  Files,
  FileText,
  Image as ImageIcon,
  Archive,
  Palette,
  HardDrive,
  LogOut,
  User as UserIcon,
  X
} from 'lucide-react';
import { User, StorageStats } from '../types.ts';

interface SidebarProps {
  user: User | null;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onSignOut: () => void;
  stats: StorageStats | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeCategory,
  onSelectCategory,
  onSignOut,
  stats,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'all', label: 'All Files', icon: Files, count: stats?.totalFiles ?? 0 },
    { id: 'document', label: 'Documents', icon: FileText, count: stats?.categoryBreakdown.documents ?? 0 },
    { id: 'image', label: 'Images & Photos', icon: ImageIcon, count: stats?.categoryBreakdown.images ?? 0 },
    { id: 'design', label: 'Design Specs', icon: Palette, count: stats?.categoryBreakdown.designs ?? 0 },
    { id: 'archive', label: 'Archives & Zips', icon: Archive, count: stats?.categoryBreakdown.archives ?? 0 }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#090f1f] text-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 border-r border-slate-800/80 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="h-18 px-6 flex items-center justify-between border-b border-slate-800/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
                <FolderLock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">Data Portal</h1>
                <p className="text-xs text-slate-400 font-normal mt-1">Client File Portal</p>
              </div>
            </div>

            <button
              id="btn-close-mobile-sidebar"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
              File Collections
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeCategory === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      onSelectCategory(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-blue-700/80 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Vault Storage Summary Box */}
          <div className="px-4 py-2">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>Vault Storage</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{stats?.formattedSize || '0 B'} Used</span>
                <span>{stats?.totalFiles || 0} Files</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(5, ((stats?.totalBytes || 0) / (50 * 1024 * 1024)) * 100))}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-light">
                Encrypted & restricted to your account
              </p>
            </div>
          </div>
        </div>

        {/* Bottom User Profile & Sign Out */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-800/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-300 font-semibold text-sm shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            </div>

            <button
              id="btn-sidebar-signout"
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
