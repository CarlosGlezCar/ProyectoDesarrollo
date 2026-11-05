const express = require('express');
const router = express.Router();

const controller = require('../controllers/variants');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

/* POST variant create */
router.post(
  '/',
  authenticate,
  authorize('variants', 'create', 'any'),
  controller.create
);

/* GET variants listing */
router.get(
  '/',
  authenticate,
  authorize('variants', 'read', 'any'),
  controller.list
);

/* GET variant by id */
router.get(
  '/:id',
  authenticate,
  authorize('variants', 'read', 'any'),
  controller.find
);

/* PUT variant to update */
router.put(
  '/:id',
  authenticate,
  authorize('variants', 'update', 'any'),
  controller.update
);

/* DELETE variant by id */
router.delete(
  '/:id',
  authenticate,
  authorize('variants', 'delete', 'any'),
  controller.destroy
);

module.exports = router;