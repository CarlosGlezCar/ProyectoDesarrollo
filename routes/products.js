const express = require('express');
const router = express.Router();

const controller = require('../controllers/products');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

// CREATE
router.post(
    '/',
    authenticate,
    authorize('products', 'create', 'any'),
    controller.create
);

// READ
router.get(
    '/',
    authenticate,
    authorize('products', 'read', 'any'),
    controller.list
);

router.get(
    '/:id',
    authenticate,
    authorize('products', 'read', 'any'),
    controller.find
);

// UPDATE
router.put(
    '/:id',
    authenticate,
    authorize('products', 'update', 'any'),
    controller.update
);

// DELETE
router.delete(
    '/:id',
    authenticate,
    authorize('products', 'delete', 'any'),
    controller.destroy
);

module.exports = router;