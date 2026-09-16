export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'freelancer' | 'client' | 'designer';
  createdAt: string;
}

export interface FileItem {
  id: string;
  userId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  category: 'image' | 'document' | 'design' | 'archive' | 'other';
  tags?: string[];
  notes?: string;
  uploadedAt: string;
  downloadCount: number;
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  formattedSize: string;
  categoryBreakdown: {
    images: number;
    documents: number;
    designs: number;
    archives: number;
    others: number;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}
