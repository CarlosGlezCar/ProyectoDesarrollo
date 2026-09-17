const express = require('express');
const router = express.Router();

const controller = require('../controllers/roles')

/* GET users and its roles. */
router.get('/', controller.list);

/*GET user role by id*/
router.get('/:id', controller.find);

/*PUT update user role*/
router.put('/:id', controller.update);

module.exports = router;
