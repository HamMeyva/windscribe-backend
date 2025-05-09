const express = require('express');
const contentController = require('../controllers/content.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get all content (paginated)
router.get('/', contentController.getAllContent);

// Daily content routes
router.get('/daily', contentController.getDailyContent);

// Get content by pool
router.get('/pool', contentController.getContentByPool);

// Saved content route
router.get('/user/saved', contentController.getSavedContent);

// Content item routes
router.get('/:id', contentController.getContent);
router.post('/:id/rate', contentController.rateContent);
router.post('/:id/save', contentController.saveContent);
router.delete('/:id/save', contentController.unsaveContent);
router.post('/:id/share', contentController.shareContent);
router.post(
  '/:id/rewrite',
  authController.restrictTo('admin', 'content-creator', 'moderator'),
  contentController.rewriteContent
);

// Content generation (restricted to admins and content creators)
router.post(
  '/generate',
  authController.restrictTo('admin', 'content-creator', 'moderator'),
  contentController.generateContent
);

// Multiple content generation
router.post(
  '/generate-multiple',
  authController.restrictTo('admin', 'content-creator', 'moderator'),
  contentController.generateMultipleContent
);

module.exports = router; 