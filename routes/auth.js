const express = require('express');
const { login, me } = require('../controllers/auth');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, me);

module.exports = router;