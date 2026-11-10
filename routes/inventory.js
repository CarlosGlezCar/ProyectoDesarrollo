const express = require('express');
const router = express.Router();

const controller = require('../controllers/inventory');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

/* POST inventory create */
router.post(
  '/',
  authenticate,
  authorize('inventory', 'create', 'any'),
  controller.create
);

/* GET inventory listing */
router.get(
  '/',
  authenticate,
  authorize('inventory', 'read', 'any'),
  controller.list
);

/* GET inventory by id */
router.get(
  '/:id',
  authenticate,
  authorize('inventory', 'read', 'any'),
  controller.find
);

/* PUT inventory to update */
router.put(
  '/:id',
  authenticate,
  authorize('inventory', 'update', 'any'),
  controller.update
);

/* DELETE inventory by id */
router.delete(
  '/:id',
  authenticate,
  authorize('inventory', 'delete', 'any'),
  controller.destroy
);

module.exports = router;