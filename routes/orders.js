const express = require('express');
const router = express.Router();

const controller = require('../controllers/orders');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

// CREATE
router.post(
    '/',
    authenticate,
    authorize('orders', 'create', 'any'),
    controller.create
);

// READ: permite lectura propia o general, según los permisos del rol
router.get(
    '/:id',
    authenticate,
    authorize('orders', 'read', 'ownOrAny'),
    controller.find
);

// UPDATE: solo pedidos propios
router.put(
    '/:id',
    authenticate,
    authorize('orders', 'update', 'own'),
    controller.update
);

// DELETE: solo pedidos propios
router.delete(
    '/:id',
    authenticate,
    authorize('orders', 'delete', 'own'),
    controller.destroy
);

module.exports = router;