const express = require('express');
const controller = require('../../controllers/web/auth');
const webPost = require('../../middlewares/web-post');

const router = express.Router();

router.get('/login', controller.showLogin);

router.post('/login', webPost, controller.login);

router.post('/logout', webPost, controller.logout);

module.exports = router;