import React from 'react';
import { X, Download, Trash2, HardDrive, Calendar, FileText, Tag } from 'lucide-react';
import { FileItem } from '../types.ts';
import { api } from '../lib/api.ts';

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDelete: (file: FileItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDelete
}) => {
  if (!file) return null;

  const isImage = file.category === 'image' || file.mimeType.startsWith('image/');
  const isPdf = file.mimeType.includes('pdf');
  const viewUrl = api.getViewUrl(file.id);
  const downloadUrl = api.getDownloadUrl(file.id);

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
      return new Date(isoString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-semibold text-slate-900 truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)} • {file.mimeType}
            </p>
          </div>
          <button
            id="btn-close-preview"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[300px]">
          {isImage ? (
            <div className="max-h-[50vh] flex items-center justify-center overflow-hidden rounded-lg bg-white p-2 border border-slate-200 shadow-xs">
              <img
                src={viewUrl}
                alt={file.originalName}
                referrerPolicy="no-referrer"
                className="max-h-[48vh] max-w-full object-contain rounded-md"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[50vh] rounded-lg overflow-hidden border border-slate-200 bg-white">
              <iframe
                src={viewUrl}
                title={file.originalName}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="py-12 px-6 text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">{file.originalName}</h4>
              <p className="text-xs text-slate-500 mb-4">
                This file format ({file.category}) is stored securely in your vault. You can download it directly to view in your desktop application.
              </p>
              <a
                href={downloadUrl}
                download={file.originalName}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Download to View
              </a>
            </div>
          )}

          {/* Metadata info cards */}
          <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Uploaded On</p>
                <p className="font-medium text-slate-700">{formatDate(file.uploadedAt)}</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Storage Size</p>
                <p className="font-medium text-slate-700">{formatFileSize(file.size)}</p>
              </div>
            </div>
          </div>

          {/* Notes & tags if available */}
          {(file.notes || (file.tags && file.tags.length > 0)) && (
            <div className="w-full mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
              {file.tags && file.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <div className="flex flex-wrap gap-1">
                    {file.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {file.notes && (
                <p className="text-slate-600 italic">
                  "{file.notes}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            id="btn-preview-delete"
            type="button"
            onClick={() => {
              onClose();
              onDelete(file);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete File</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              Close
            </button>
            <a
              id="btn-preview-download"
              href={downloadUrl}
              download={file.originalName}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
