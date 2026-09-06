import { Router } from 'express';
import multer from 'multer';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  bulkDeleteCompanies,
  getFilterOptions,
  exportCompanies,
  downloadSampleImport,
  toggleCompanyActive,
} from '../controllers/companyController';
import { importCompanies } from '../controllers/importController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .xls files are allowed'));
    }
  },
});

const router = Router();

router.get('/filter-options', getFilterOptions);
router.get('/export', exportCompanies);
router.get('/sample', downloadSampleImport);
router.get('/', getCompanies);
router.get('/:id', getCompany);
router.post('/import', upload.single('file'), importCompanies);
router.post('/', createCompany);
router.put('/:id', updateCompany);
router.patch('/:id/toggle-active', toggleCompanyActive);
router.delete('/bulk', bulkDeleteCompanies);
router.delete('/:id', deleteCompany);

export default router;
