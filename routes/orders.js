const express = require('express');
const router = express.Router();

const controller = require('../controllers/orders');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

// CREATE
router.post(
    '/',
    authenticate,
    authorize('orders', 'create', 'ownOrAny'),
    controller.create
);

// READ: todas las órdenes
router.get(
    '/',
    authenticate,
    authorize('orders', 'read', 'any'),
    controller.list
);

// READ: órdenes propias
router.get(
    '/own',
    authenticate,
    authorize('orders', 'read', 'own'),
    controller.list
);

// READ: orden individual
router.get(
    '/:id',
    authenticate,
    authorize('orders', 'read', 'ownOrAny'),
    controller.find
);

// UPDATE
router.put(
    '/:id',
    authenticate,
    authorize('orders', 'update', 'ownOrAny'),
    controller.update
);

// DELETE
router.delete(
    '/:id',
    authenticate,
    authorize('orders', 'delete', 'ownOrAny'),
    controller.destroy
);

module.exports = router;