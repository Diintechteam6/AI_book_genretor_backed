const express = require('express');
const router = express.Router();
const { generateBook } = require('../controllers/generateController');

router.post('/', generateBook);

module.exports = router;
