import { Request, Response } from 'express';
import mongoose from 'mongoose';

const COLLECTIONS = [
  'companies',
  'states',
  'cities',
  'roles',
  'personalinfos',
  'emailsettings',
  'emaillogs',
  'scrapedcompanies',
];

export const getBackupInfo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(503).json({ message: 'Database not connected' });
      return;
    }

    const dbStats = await db.stats();
    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);

    const collections = await Promise.all(
      collectionNames.map(async (name) => {
        const count = await db.collection(name).countDocuments();
        const stats = await db.command({ collStats: name }).catch(() => ({ storageSize: 0, size: 0 }));
        return {
          name,
          count,
          storageSize: stats.storageSize || 0,
          dataSize: stats.size || 0,
        };
      })
    );

    res.json({
      database: db.databaseName,
      totalCollections: collectionNames.length,
      totalDocuments: collections.reduce((s, c) => s + c.count, 0),
      dataSize: dbStats.dataSize || 0,
      storageSize: dbStats.storageSize || 0,
      collections,
    });
  } catch (err) {
    console.error('Backup info error:', err);
    res.status(500).json({ message: 'Failed to fetch backup info' });
  }
};

export const downloadBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(503).json({ message: 'Database not connected' });
      return;
    }

    const requestedCollections = req.query.collections
      ? (req.query.collections as string).split(',').map((c) => c.trim())
      : null;

    const allCollectionNames = (await db.listCollections().toArray()).map((c) => c.name);
    const targetCollections = requestedCollections
      ? allCollectionNames.filter((name) => requestedCollections.includes(name))
      : allCollectionNames;

    const dump: Record<string, unknown> = {};
    for (const name of targetCollections) {
      dump[name] = await db.collection(name).find({}).toArray();
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-companies-backup-${timestamp}.json`;

    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        database: db.databaseName,
        collections: targetCollections,
        data: dump,
      },
      null,
      2
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(payload, 'utf8'));
    res.send(payload);
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ message: 'Failed to generate backup' });
  }
};
