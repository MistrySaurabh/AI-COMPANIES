import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import companyRoutes from './routes/companies';
import stateRoutes from './routes/states';
import cityRoutes from './routes/cities';
import roleRoutes from './routes/roles';
import emailRoutes from './routes/email';
import emailSettingsRoutes from './routes/emailSettings';
import bulkEmailRoutes from './routes/bulkEmail';
import personalInfoRoutes from './routes/personalInfo';
import emailLogRoutes from './routes/emailLogs';
import bounceRoutes from './routes/bounce';
import scraperRoutes from './routes/scraper';
import placesRoutes from './routes/places';
import backupRoutes from './routes/backup';
import emailTemplateRoutes from './routes/emailTemplates';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-companies';

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/api/companies', companyRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/bulk-email', bulkEmailRoutes);
app.use('/api/personal-info', personalInfoRoutes);
app.use('/api/email-logs', emailLogRoutes);
app.use('/api/bounce', bounceRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/email-templates', emailTemplateRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
