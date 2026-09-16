import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Archive,
  Palette,
  File as GenericFileIcon,
  Download,
  Eye,
  Trash2,
  Copy,
  Check,
  LayoutGrid,
  List,
  Calendar,
  HardDrive
} from 'lucide-react';
import { FileItem } from '../types.ts';
import { api } from '../lib/api.ts';

interface FileListProps {
  files: FileItem[];
  loading: boolean;
  onPreview: (file: FileItem) => void;
  onRequestDelete: (file: FileItem) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  loading,
  onPreview,
  onRequestDelete
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  const getFileIcon = (category: string, mimeType: string) => {
    if (category === 'image' || mimeType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-emerald-600" />;
    }
    if (category === 'document' || mimeType.includes('pdf')) {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    if (category === 'design') {
      return <Palette className="w-4 h-4 text-purple-600" />;
    }
    if (category === 'archive') {
      return <Archive className="w-4 h-4 text-amber-600" />;
    }
    return <GenericFileIcon className="w-4 h-4 text-slate-500" />;
  };

  const handleCopyLink = (file: FileItem) => {
    const fullUrl = window.location.origin + api.getViewUrl(file.id);
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (file: FileItem) => {
    const url = api.getDownloadUrl(file.id);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.originalName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading files from your vault...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* List Header Controls */}
      <div className="p-4 sm:px-6 border-b border-slate-200/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">Your Files</h2>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
            {files.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-view-table"
            onClick={() => setViewMode('table')}
            title="Table View"
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            id="btn-view-grid"
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <GenericFileIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No files found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload files in the section above to share deliverables, drafts, and client feedback securely.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Tags &amp; Notes</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map(file => (
                <tr
                  key={file.id}
                  id={`file-row-${file.id}`}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getFileIcon(file.category, file.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <p
                          onClick={() => onPreview(file)}
                          className="font-medium text-slate-900 truncate max-w-xs sm:max-w-md hover:text-blue-600 cursor-pointer"
                          title={file.originalName}
                        >
                          {file.originalName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-light truncate">
                          {file.mimeType}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                    {formatFileSize(file.size)}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatDate(file.uploadedAt)}
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex flex-col gap-1">
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {file.tags.map(t => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {file.notes && (
                        <p className="text-[11px] text-slate-500 italic truncate" title={file.notes}>
                          "{file.notes}"
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View / Preview */}
                      <button
                        id={`btn-preview-${file.id}`}
                        onClick={() => onPreview(file)}
                        title="View & Preview"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Download */}
                      <button
                        id={`btn-download-${file.id}`}
                        onClick={() => handleDownload(file)}
                        title="Download File"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Copy Link */}
                      <button
                        id={`btn-copylink-${file.id}`}
                        onClick={() => handleCopyLink(file)}
                        title="Copy Private File Link"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {copiedId === file.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        id={`btn-delete-${file.id}`}
                        onClick={() => onRequestDelete(file)}
                        title="Delete File"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(file => (
            <div
              key={file.id}
              id={`file-card-${file.id}`}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {getFileIcon(file.category, file.mimeType)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPreview(file)}
                      title="Preview"
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      title="Download"
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRequestDelete(file)}
                      title="Delete"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p
                  onClick={() => onPreview(file)}
                  className="text-sm font-semibold text-slate-900 truncate hover:text-blue-600 cursor-pointer mb-1"
                  title={file.originalName}
                >
                  {file.originalName}
                </p>

                {file.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2 italic mb-2">
                    "{file.notes}"
                  </p>
                )}

                {file.tags && file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {file.tags.map(t => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  {formatFileSize(file.size)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(file.uploadedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
