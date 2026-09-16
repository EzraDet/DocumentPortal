import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { dbService, DbUser } from './server/db.ts';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: DbUser;
  token?: string;
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, dbService.getUploadsDir());
  },
  filename: (_req, file, cb) => {
    // Unique stored filename avoiding collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max file size
  }
});

// Authentication & Authorization Middleware
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const user = dbService.getUserByToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.user = user;
  req.token = token;
  next();
}

async function startServer() {
  const app = express();

  // ==========================================
  // SERVER CONFIGURATION (env-configurable)
  // ==========================================
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'ShoppyVault', time: new Date().toISOString() });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // Sign up
  app.post('/api/auth/signup', (req, res) => {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: 'Please provide email, password, and your name.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      const validRoles = ['freelancer', 'client', 'designer'];
      const userRole = validRoles.includes(role) ? role : 'client';

      const user = dbService.createUser(email, password, name, userRole);
      const session = dbService.createSession(user.id);

      res.status(201).json({
        message: 'Account created successfully.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        },
        token: session.token
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create account.' });
    }
  });

  // Sign in
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Please provide both email and password.' });
        return;
      }

      const user = dbService.findUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isValid = dbService.verifyPassword(user, password);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const session = dbService.createSession(user.id);

      res.json({
        message: 'Signed in successfully.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        },
        token: session.token
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Sign in failed. Please try again.' });
    }
  });

  // Firebase Auth sync endpoint
  app.post('/api/auth/firebase-sync', (req, res) => {
    try {
      const { id, email, name, role } = req.body;
      if (!id || !email) {
        res.status(400).json({ error: 'Missing required user identification fields.' });
        return;
      }

      const user = dbService.findOrCreateOAuthUser(id, email, name || email.split('@')[0], role || 'freelancer');
      const session = dbService.createSession(user.id);

      res.json({
        message: 'Firebase session synchronized successfully.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        },
        token: session.token
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to synchronize Firebase session.' });
    }
  });

  // Sign out
  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.token) {
      dbService.destroySession(req.token);
    }
    res.json({ message: 'Signed out successfully.' });
  });

  // Get current user profile & storage statistics
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const stats = dbService.getUserStats(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      },
      stats
    });
  });

  // ==========================================
  // FILE MANAGEMENT ROUTES
  // ==========================================

  // List all files for current user (with search, category filter, sorting)
  app.get('/api/files', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { search, category, sort } = req.query;

      const files = dbService.getUserFiles(userId, {
        search: typeof search === 'string' ? search : undefined,
        category: typeof category === 'string' ? category : undefined,
        sort: typeof sort === 'string' ? sort : undefined
      });

      const stats = dbService.getUserStats(userId);

      res.json({
        files,
        stats
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve files.' });
    }
  });

  // Upload one or multiple files
  app.post('/api/files/upload', requireAuth, upload.array('files', 10), (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const uploadedFiles = req.files as Express.Multer.File[];

      if (!uploadedFiles || uploadedFiles.length === 0) {
        res.status(400).json({ error: 'No files provided for upload.' });
        return;
      }

      const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
      let tags: string[] = [];
      if (typeof req.body.tags === 'string') {
        tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.tags)) {
        tags = req.body.tags.map((t: string) => String(t).trim()).filter(Boolean);
      }

      const results = [];
      for (const file of uploadedFiles) {
        const added = dbService.addFile({
          userId,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          notes,
          tags
        });
        results.push(added);
      }

      const stats = dbService.getUserStats(userId);
      res.status(201).json({
        message: `Successfully uploaded ${results.length} file${results.length > 1 ? 's' : ''}.`,
        files: results,
        stats
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      res.status(500).json({ error: err.message || 'File upload failed.' });
    }
  });

  // View file inline (image, pdf, text, preview)
  app.get('/api/files/:id/view', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const file = dbService.getFileById(userId, req.params.id);

      if (!file) {
        res.status(404).json({ error: 'File not found or access denied.' });
        return;
      }

      const filePath = path.join(dbService.getUploadsDir(), file.storedName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Physical file not found on server.' });
        return;
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to stream file.' });
    }
  });

  // Download file as attachment
  app.get('/api/files/:id/download', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const file = dbService.getFileById(userId, req.params.id);

      if (!file) {
        res.status(404).json({ error: 'File not found or access denied.' });
        return;
      }

      const filePath = path.join(dbService.getUploadsDir(), file.storedName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Physical file not found on server.' });
        return;
      }

      dbService.incrementDownloadCount(file.id);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to download file.' });
    }
  });

  // Delete file (verifies ownership and deletes both disk file and DB record)
  app.delete('/api/files/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const fileId = req.params.id;

      const deleted = dbService.deleteFile(userId, fileId);
      if (!deleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      const stats = dbService.getUserStats(userId);
      res.json({
        message: 'File deleted successfully.',
        fileId,
        stats
      });
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Could not delete file.' });
    }
  });

  // ==========================================
  // VITE & STATIC SPA FALLBACK
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`ShoppyVault server running at http://${displayHost}:${PORT}`);
    if (HOST === '0.0.0.0') {
      console.log(`(Listening on all interfaces — accessible via your LAN IP too)`);
    }
  });
}

startServer();