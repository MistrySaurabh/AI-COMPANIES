import { Router } from 'express';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  toggleRoleStatus,
} from '../controllers/roleController';

const router = Router();

router.get('/', getRoles);
router.get('/:id', getRole);
router.post('/', createRole);
router.put('/:id', updateRole);
router.patch('/:id/toggle', toggleRoleStatus);
router.delete('/:id', deleteRole);

export default router;
