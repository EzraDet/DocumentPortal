import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: 'freelancer' | 'client' | 'designer';
  createdAt: string;
}

export interface DbSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DbFile {
  id: string;
  userId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  category: 'image' | 'document' | 'design' | 'archive' | 'other';
  tags: string[];
  notes?: string;
  uploadedAt: string;
  downloadCount: number;
}

interface DatabaseSchema {
  users: DbUser[];
  sessions: DbSession[];
  files: DbFile[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, finalSalt, 64).toString('hex');
  return { hash, salt: finalSalt };
}

function determineCategory(fileName: string, mimeType: string): 'image' | 'document' | 'design' | 'archive' | 'other' {
  const ext = path.extname(fileName).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  if (['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.xlsx', '.xls', '.csv', '.ppt', '.pptx'].includes(ext) || mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) {
    return 'document';
  }
  if (['.fig', '.sketch', '.xd', '.ai', '.psd', '.eps', '.svg'].includes(ext)) {
    return 'design';
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'archive';
  }
  return 'other';
}

function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json, reinitializing:', err);
  }

  const initialDb: DatabaseSchema = {
    users: [],
    sessions: [],
    files: []
  };

  saveDb(initialDb);
  seedInitialData(initialDb);
  return initialDb;
}

function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db.json:', err);
  }
}

function seedInitialData(db: DatabaseSchema) {
  // Pre-seed demo users for immediate testing
  const demoUsers = [
    {
      id: 'usr_demo_freelancer',
      email: 'alex@designstudio.com',
      name: 'Alex Rivera (Designer)',
      password: 'password123',
      role: 'freelancer' as const
    },
    {
      id: 'usr_demo_client',
      email: 'sarah@clientbrand.co',
      name: 'Sarah Chen (Client)',
      password: 'password123',
      role: 'client' as const
    }
  ];

  for (const u of demoUsers) {
    const { hash, salt } = hashPassword(u.password);
    db.users.push({
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: hash,
      salt,
      role: u.role,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // Seed some starter files for demonstration so the client portal is immediately previewable
  const sampleFiles = [
    {
      id: 'file_brand_guide_01',
      userId: 'usr_demo_freelancer',
      originalName: 'Brand_Identity_Guidelines_v2.pdf',
      storedContent: '%PDF-1.4 sample brand guidelines document for ShoppyVault clients. Contains typography, color palettes, and logo usage instructions.',
      mimeType: 'application/pdf',
      category: 'document' as const,
      tags: ['Brand Assets', 'Approved'],
      notes: 'Finalized brand colors, typography rules, and logo spacing guidelines for Q4 release.',
      daysAgo: 3
    },
    {
      id: 'file_ui_mockups_02',
      userId: 'usr_demo_freelancer',
      originalName: 'E-Commerce_Checkout_Mockups.png',
      storedContent: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0f172a"/><text x="400" y="240" font-family="sans-serif" font-size="28" fill="#ffffff" text-anchor="middle" font-weight="bold">Checkout Redesign UI Spec</text><text x="400" y="280" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">ShoppyVault Client Portal Preview</text></svg>',
      mimeType: 'image/svg+xml',
      category: 'image' as const,
      tags: ['Mockup', 'Draft'],
      notes: 'Updated step-by-step cart and payment authorization flow mockup.',
      daysAgo: 2
    },
    {
      id: 'file_client_assets_03',
      userId: 'usr_demo_client',
      originalName: 'High_Res_Product_Photos.zip',
      storedContent: 'ZIP_ARCHIVE_DATA_SAMPLE: Pack of 12 uncompressed high-resolution campaign photography shots.',
      mimeType: 'application/zip',
      category: 'archive' as const,
      tags: ['Client Upload', 'Raw Assets'],
      notes: 'Please find attached the product photos from last weeks studio shoot for the catalog redesign.',
      daysAgo: 1
    }
  ];

  for (const f of sampleFiles) {
    const storedName = `${f.id}-${f.originalName}`;
    const filePath = path.join(UPLOADS_DIR, storedName);
    fs.writeFileSync(filePath, f.storedContent, 'utf-8');
    const stats = fs.statSync(filePath);

    db.files.push({
      id: f.id,
      userId: f.userId,
      originalName: f.originalName,
      storedName,
      mimeType: f.mimeType,
      size: stats.size,
      category: f.category,
      tags: f.tags,
      notes: f.notes,
      uploadedAt: new Date(Date.now() - f.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      downloadCount: 3
    });
  }

  saveDb(db);
}

export const dbService = {
  getUploadsDir: () => UPLOADS_DIR,

  // User Management
  findUserByEmail: (email: string): DbUser | undefined => {
    const db = loadDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },

  findUserById: (id: string): DbUser | undefined => {
    const db = loadDb();
    return db.users.find(u => u.id === id);
  },

  findOrCreateOAuthUser: (id: string, email: string, name: string, role: 'freelancer' | 'client' | 'designer' = 'freelancer'): DbUser => {
    const db = loadDb();
    let user = db.users.find(u => u.id === id || u.email.toLowerCase() === email.toLowerCase().trim());
    if (user) {
      if (user.id !== id) {
        user.id = id;
      }
      if (name && !user.name) {
        user.name = name;
      }
      saveDb(db);
      return user;
    }

    const { hash, salt } = hashPassword(crypto.randomBytes(16).toString('hex'));
    user = {
      id,
      email: email.toLowerCase().trim(),
      name: name.trim() || email.split('@')[0],
      passwordHash: hash,
      salt,
      role,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDb(db);
    return user;
  },

  createUser: (email: string, password: string, name: string, role: 'freelancer' | 'client' | 'designer' = 'client'): DbUser => {
    const db = loadDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const { hash, salt } = hashPassword(password);
    const newUser: DbUser = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash: hash,
      salt,
      role,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);
    return newUser;
  },

  verifyPassword: (user: DbUser, password: string): boolean => {
    const { hash } = hashPassword(password, user.salt);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
  },

  // Session Management
  createSession: (userId: string): DbSession => {
    const db = loadDb();
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const session: DbSession = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    db.sessions.push(session);
    saveDb(db);
    return session;
  },

  getUserByToken: (token: string): DbUser | null => {
    if (!token) return null;
    const db = loadDb();
    const session = db.sessions.find(s => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }
    const user = db.users.find(u => u.id === session.userId);
    return user || null;
  },

  destroySession: (token: string) => {
    const db = loadDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDb(db);
  },

  // File Management
  getUserFiles: (userId: string, options?: { search?: string; category?: string; sort?: string }): DbFile[] => {
    const db = loadDb();
    // Security Rule: Users can strictly only see files belonging to their user ID
    let files = db.files.filter(f => f.userId === userId);

    if (options?.category && options.category !== 'all') {
      files = files.filter(f => f.category === options.category);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      files = files.filter(f =>
        f.originalName.toLowerCase().includes(q) ||
        (f.notes && f.notes.toLowerCase().includes(q)) ||
        f.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sort = options?.sort || 'newest';
    files.sort((a, b) => {
      if (sort === 'newest') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sort === 'oldest') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sort === 'name-asc') return a.originalName.localeCompare(b.originalName);
      if (sort === 'name-desc') return b.originalName.localeCompare(a.originalName);
      if (sort === 'size-desc') return b.size - a.size;
      if (sort === 'size-asc') return a.size - b.size;
      return 0;
    });

    return files;
  },

  getFileById: (userId: string, fileId: string): DbFile | null => {
    const db = loadDb();
    const file = db.files.find(f => f.id === fileId);
    if (!file) return null;

    // Security Rule: Users can ONLY access their own files
    if (file.userId !== userId) {
      return null;
    }
    return file;
  },

  addFile: (params: {
    userId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    notes?: string;
    tags?: string[];
  }): DbFile => {
    const db = loadDb();
    const category = determineCategory(params.originalName, params.mimeType);

    const newFile: DbFile = {
      id: 'file_' + crypto.randomBytes(8).toString('hex'),
      userId: params.userId,
      originalName: params.originalName,
      storedName: params.storedName,
      mimeType: params.mimeType,
      size: params.size,
      category,
      tags: params.tags && params.tags.length > 0 ? params.tags : ['Upload'],
      notes: params.notes || '',
      uploadedAt: new Date().toISOString(),
      downloadCount: 0
    };

    db.files.push(newFile);
    saveDb(db);
    return newFile;
  },

  deleteFile: (userId: string, fileId: string): boolean => {
    const db = loadDb();
    const fileIndex = db.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return false;

    const file = db.files[fileIndex];
    // Security Rule: User must own the file to delete it
    if (file.userId !== userId) {
      throw new Error('Unauthorized: You do not have permission to delete this file.');
    }

    // Remove file from disk
    const filePath = path.join(UPLOADS_DIR, file.storedName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('Could not delete physical file on disk:', err);
    }

    db.files.splice(fileIndex, 1);
    saveDb(db);
    return true;
  },

  incrementDownloadCount: (fileId: string) => {
    const db = loadDb();
    const file = db.files.find(f => f.id === fileId);
    if (file) {
      file.downloadCount = (file.downloadCount || 0) + 1;
      saveDb(db);
    }
  },

  getUserStats: (userId: string) => {
    const db = loadDb();
    const userFiles = db.files.filter(f => f.userId === userId);
    const totalFiles = userFiles.length;
    const totalBytes = userFiles.reduce((acc, f) => acc + f.size, 0);

    const categoryBreakdown = {
      images: userFiles.filter(f => f.category === 'image').length,
      documents: userFiles.filter(f => f.category === 'document').length,
      designs: userFiles.filter(f => f.category === 'design').length,
      archives: userFiles.filter(f => f.category === 'archive').length,
      others: userFiles.filter(f => f.category === 'other').length
    };

    let formattedSize = '0 B';
    if (totalBytes > 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes > 1024) {
      formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
    } else {
      formattedSize = `${totalBytes} B`;
    }

    return {
      totalFiles,
      totalBytes,
      formattedSize,
      categoryBreakdown
    };
  }
};
