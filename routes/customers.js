const express = require('express');
const router = express.Router();

const controller = require('../controllers/customers');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

/* POST customer create */
router.post(
  '/',
  authenticate,
  authorize('customers', 'create', 'any'),
  controller.create
);

/* GET customers listing */
router.get(
  '/',
  authenticate,
  authorize('customers', 'read', 'ownOrAny'),
  controller.list
);

/* GET customer by id */
router.get(
  '/:id',
  authenticate,
  authorize('customers', 'read', 'ownOrAny'),
  controller.find
);

/* PUT customer to update */
router.put(
  '/:id',
  authenticate,
  authorize('customers', 'update', 'any'),
  controller.update
);

/* DELETE customer by id */
router.delete(
  '/:id',
  authenticate,
  authorize('customers', 'delete', 'any'),
  controller.destroy
);

module.exports = router;