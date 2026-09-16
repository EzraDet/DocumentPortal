import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase.ts';
import { handleFirestoreError, OperationType } from './firestoreErrors.ts';
import { FileItem, User, StorageStats } from '../types.ts';

export const firestoreService = {
  // Sync user profile to /users/{userId}
  async syncUserProfile(user: User): Promise<void> {
    const path = `users/${user.id}`;
    try {
      const userRef = doc(db, 'users', user.id);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(userRef, {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'freelancer',
          createdAt: user.createdAt || new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Save uploaded file metadata to /users/{userId}/files/{fileId}
  async saveFileRecord(file: FileItem): Promise<void> {
    const path = `users/${file.userId}/files/${file.id}`;
    try {
      const fileRef = doc(db, 'users', file.userId, 'files', file.id);
      await setDoc(fileRef, {
        id: file.id,
        userId: file.userId,
        originalName: file.originalName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        size: file.size,
        category: file.category,
        tags: file.tags || [],
        notes: file.notes || '',
        uploadedAt: file.uploadedAt,
        downloadCount: file.downloadCount || 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Delete file record from /users/{userId}/files/{fileId}
  async deleteFileRecord(userId: string, fileId: string): Promise<void> {
    const path = `users/${userId}/files/${fileId}`;
    try {
      const fileRef = doc(db, 'users', userId, 'files', fileId);
      await deleteDoc(fileRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Increment download counter
  async incrementDownload(userId: string, fileId: string, currentCount: number): Promise<void> {
    const path = `users/${userId}/files/${fileId}`;
    try {
      const fileRef = doc(db, 'users', userId, 'files', fileId);
      await updateDoc(fileRef, {
        downloadCount: (currentCount || 0) + 1
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Fetch all files for user
  async getUserFiles(userId: string): Promise<FileItem[]> {
    const path = `users/${userId}/files`;
    try {
      const filesRef = collection(db, 'users', userId, 'files');
      const q = query(filesRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: FileItem[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as FileItem);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // Real-time listener for user files
  subscribeToUserFiles(
    userId: string,
    onFilesUpdate: (files: FileItem[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const path = `users/${userId}/files`;
    const filesRef = collection(db, 'users', userId, 'files');
    const q = query(filesRef, orderBy('uploadedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const list: FileItem[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as FileItem);
        });
        onFilesUpdate(list);
      },
      error => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return unsubscribe;
  },

  // Compute stats helper
  calculateStats(files: FileItem[]): StorageStats {
    let totalBytes = 0;
    const categoryBreakdown = {
      images: 0,
      documents: 0,
      designs: 0,
      archives: 0,
      others: 0
    };

    files.forEach(f => {
      totalBytes += f.size;
      if (f.category === 'image') categoryBreakdown.images++;
      else if (f.category === 'document') categoryBreakdown.documents++;
      else if (f.category === 'design') categoryBreakdown.designs++;
      else if (f.category === 'archive') categoryBreakdown.archives++;
      else categoryBreakdown.others++;
    });

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    return {
      totalFiles: files.length,
      totalBytes,
      formattedSize: formatBytes(totalBytes),
      categoryBreakdown
    };
  }
};
