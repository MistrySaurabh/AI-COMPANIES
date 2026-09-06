import { Router } from 'express';
import {
  getCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  toggleCityStatus,
} from '../controllers/cityController';

const router = Router();

router.get('/', getCities);
router.get('/:id', getCity);
router.post('/', createCity);
router.put('/:id', updateCity);
router.patch('/:id/toggle', toggleCityStatus);
router.delete('/:id', deleteCity);

export default router;
