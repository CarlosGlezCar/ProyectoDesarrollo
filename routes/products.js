const express = require('express');
const router = express.Router();

const controller = require('../controllers/products');

// CREATE
router.post('/', controller.create);

// READ
router.get('/', controller.list);
router.get('/:id', controller.find);

// UPDATE
router.put('/:id', controller.update);

// DELETE
router.delete('/:id', controller.destroy);

module.exports = router;