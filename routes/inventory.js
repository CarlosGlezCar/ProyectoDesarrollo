const express = require('express');
const router = express.Router();

const controller = require('../controllers/inventory')


/* GET users listing. */
router.get('/', controller.list);

/*GET user by id*/
router.get('/:id', controller.find);

/*PUT user to update*/
router.put('/:id', controller.update);

module.exports = router;