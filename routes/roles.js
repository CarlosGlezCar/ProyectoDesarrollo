const express = require('express');
const router = express.Router();

const controller = require('../controllers/roles');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

router.post('/', controller.create);

router.get('/', controller.list);

router.get('/:id', controller.find);

router.put('/:id', controller.update);

router.delete(
    '/:id',
    authenticate,
    authorize('roles', 'delete', 'any'),
    controller.destroy
);

module.exports = router;