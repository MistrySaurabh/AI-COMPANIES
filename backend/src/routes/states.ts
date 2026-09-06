import { Router } from 'express';
import {
  getStates,
  getState,
  createState,
  updateState,
  deleteState,
  toggleStateStatus,
  getAllActiveStates,
} from '../controllers/stateController';

const router = Router();

router.get('/all-active', getAllActiveStates);
router.get('/', getStates);
router.get('/:id', getState);
router.post('/', createState);
router.put('/:id', updateState);
router.patch('/:id/toggle', toggleStateStatus);
router.delete('/:id', deleteState);

export default router;
