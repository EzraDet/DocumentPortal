import React from 'react';
import { Menu, Search, X, ArrowDownUp, LogOut } from 'lucide-react';
import { User } from '../types.ts';

interface NavbarProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onToggleMobileSidebar: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onToggleMobileSidebar,
  onSignOut
}) => {
  return (
    <header className="h-18 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          id="btn-open-sidebar"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-file-search"
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search files by name, tags, or notes..."
            className="w-full pl-9 pr-8 py-2 bg-slate-100/70 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-400 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Sort Dropdown */}
        <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
          <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            id="select-sort-order"
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name (A - Z)</option>
            <option value="name-desc">Name (Z - A)</option>
            <option value="size-desc">Largest Size</option>
            <option value="size-asc">Smallest Size</option>
          </select>
        </div>

        {/* User Role Badge */}
        {user?.role && (
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 capitalize">
            {user.role}
          </span>
        )}

        {/* Mobile Sign Out Button */}
        <button
          id="btn-navbar-signout"
          onClick={onSignOut}
          title="Sign Out"
          className="lg:hidden p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
