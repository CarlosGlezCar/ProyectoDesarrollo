const express = require('express');
const router = express.Router();

const controller = require('../controllers/roles');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

router.post('/', authenticate, authorize('roles', 'create', 'any'), controller.create);
router.get('/', authenticate, authorize('roles', 'read', 'any'), controller.list);
router.get('/:id', authenticate, authorize('roles', 'read', 'any'), controller.find);
router.put('/:id', authenticate, authorize('roles', 'update', 'any'), controller.update);

<<<<<<< HEAD
router.get('/', controller.list);

router.get('/:id', controller.find);

router.put('/:id', controller.update);

router.delete(
    '/:id',
    authenticate,
    authorize('roles', 'delete', 'any'),
    controller.destroy
);

=======
>>>>>>> origin/staging
module.exports = router;