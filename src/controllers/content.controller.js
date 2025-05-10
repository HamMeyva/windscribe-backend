const Content = require('../models/content.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const contentService = require('../services/content.service');

// Get all content with pagination and filtering
exports.getAllContent = catchAsync(async (req, res, next) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    category, 
    contentType, 
    difficulty,
    search,
    pool
  } = req.query;
  
  // Build query filter
  const filter = {};
  
  // Only admins and content creators can see non-published content
  if (['admin', 'content-creator', 'moderator'].includes(req.user.role)) {
    if (status) filter.status = status;
  } else {
    filter.status = 'published';
  }
  
  // Add other filters if provided
  if (category) filter.category = category;
  if (contentType) filter.contentType = contentType;
  if (difficulty) filter.difficulty = difficulty;
  if (pool) filter.pool = pool;
  
  // Add search filter if provided
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
      { body: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }
  
  console.log('Content filter query:', JSON.stringify(filter, null, 2));
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Count total matching documents
  const total = await Content.countDocuments(filter);
  
  // Get content with pagination
  const content = await Content.find(filter)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: content.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
    data: {
      content,
    },
  });
});

// Get daily content for user
exports.getDailyContent = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { category, contentType = 'hack' } = req.query;
  let query = { status: 'published' };
  
  // Apply category filter if provided
  if (category) {
    const categoryDoc = await Category.findOne({ slug: category, active: true });
    if (!categoryDoc) {
      return next(new AppError('Category not found', 404));
    }
    query.category = categoryDoc._id;
  }
  
  // Apply content type filter
  if (contentType) {
    query.contentType = contentType;
  }
  
  // Apply premium content filter based on subscription
  if (user.subscription.tier === 'free') {
    query.premium = false;
  }
  
  // Get today's date range (start and end of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Find content published today or recycled for today
  query.publishDate = { $gte: today, $lt: tomorrow };
  
  // Get content for user with limit based on subscription tier
  let limit = 5; // Default for free tier
  
  if (user.subscription.tier === 'basic') limit = 10;
  else if (user.subscription.tier === 'premium') limit = 20;
  else if (user.subscription.tier === 'enterprise') limit = 100;
  
  const content = await Content.find(query)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-publishDate')
    .limit(limit);
  
  // If not enough content, add some fresh content that hasn't been used recently
  if (content.length < limit) {
    const remainingCount = limit - content.length;
    
    // Get user's previously viewed content IDs to exclude
    const viewedContentIds = user.progress.completedContent.map(id => id.toString());
    
    // Find content that hasn't been shown recently, prioritizing by pool
    const pools = ['highly_liked', 'accepted', 'regular'];
    let freshContent = [];
    
    for (const pool of pools) {
      if (freshContent.length >= remainingCount) break;
      
      const poolQuery = {
        status: 'published',
        _id: { $nin: [...viewedContentIds, ...content.map(c => c._id)] },
        pool,
      };
      
      // Apply category and contentType filters
      if (category) poolQuery.category = query.category;
      if (contentType) poolQuery.contentType = contentType;
      
      // Apply premium filter based on subscription
      if (user.subscription.tier === 'free') {
        poolQuery.premium = false;
      }
      
      // Get content from this pool
      const poolContent = await Content.find(poolQuery)
        .populate('category', 'name slug icon color')
        .populate('authorId', 'name')
        .sort({ usageCount: 1, lastUsedDate: 1 }) // Prioritize least used content
        .limit(remainingCount - freshContent.length);
      
      freshContent.push(...poolContent);
    }
    
    // Update usage tracking for the fresh content
    const now = new Date();
    await Promise.all(freshContent.map(item => 
      Content.findByIdAndUpdate(item._id, {
        $inc: { usageCount: 1 },
        lastUsedDate: now
      })
    ));
    
    // Combine fresh and current content
    content.push(...freshContent);
  }
  
  res.status(200).json({
    status: 'success',
    results: content.length,
    data: {
      content,
    },
  });
});

// Get single content by ID
exports.getContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  
  const content = await Content.findById(id)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name');
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Check if premium content is accessible to user
  if (content.premium && user.subscription.tier === 'free') {
    return next(new AppError('Premium content requires subscription', 403));
  }
  
  // Increment view count
  content.stats.views += 1;
  await content.save({ validateBeforeSave: false });
  
  // Update user stats and progress
  user.stats.totalContentViewed += 1;
  
  // Add to completed content if not already there
  if (!user.progress.completedContent.includes(content._id)) {
    user.progress.completedContent.push(content._id);
  }
  
  // Update category progress
  const categoryIndex = user.progress.categoryProgress.findIndex(
    cp => cp.category.toString() === content.category._id.toString()
  );
  
  if (categoryIndex !== -1) {
    user.progress.categoryProgress[categoryIndex].contentViewed += 1;
    user.progress.categoryProgress[categoryIndex].lastViewedAt = Date.now();
  } else {
    user.progress.categoryProgress.push({
      category: content.category._id,
      contentViewed: 1,
      lastViewedAt: Date.now(),
    });
    
    // Increment categories explored if this is first content in category
    user.stats.categoriesExplored += 1;
  }
  
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    data: {
      content,
    },
  });
});

// Rate content (like/dislike)
exports.rateContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating } = req.body;
  const user = req.user;
  
  if (rating !== 'like' && rating !== 'dislike') {
    return next(new AppError('Rating must be like or dislike', 400));
  }
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Update content stats
  if (rating === 'like') {
    content.stats.likes += 1;
    user.stats.totalLikes += 1;
  } else {
    content.stats.dislikes += 1;
    user.stats.totalDislikes += 1;
  }
  
  // Update content pool based on new ratings
  content.updatePool();
  
  await content.save({ validateBeforeSave: false });
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    data: {
      rating: rating,
      likes: content.stats.likes,
      dislikes: content.stats.dislikes,
      pool: content.pool
    },
  });
});

// Save content to user's library
exports.saveContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Check if already saved
  if (user.progress.savedContent.includes(content._id)) {
    return next(new AppError('Content already saved', 400));
  }
  
  // Add to saved content
  user.progress.savedContent.push(content._id);
  await user.save({ validateBeforeSave: false });
  
  // Increment save count on content
  content.stats.saves += 1;
  await content.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Content saved successfully',
  });
});

// Remove saved content from user's library
exports.unsaveContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  
  // Remove from saved content
  user.progress.savedContent = user.progress.savedContent.filter(
    contentId => contentId.toString() !== id
  );
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Content removed from saved items',
  });
});

// Get user's saved content
exports.getSavedContent = catchAsync(async (req, res, next) => {
  const user = req.user;
  
  const savedContent = await Content.find({
    _id: { $in: user.progress.savedContent },
  })
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-updatedAt');
  
  res.status(200).json({
    status: 'success',
    results: savedContent.length,
    data: {
      content: savedContent,
    },
  });
});

// Share content (track share count)
exports.shareContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Increment share count
  content.stats.shares += 1;
  await content.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Share count updated',
    data: {
      shares: content.stats.shares,
    },
  });
});

// Add an endpoint for generating content for multiple categories
exports.generateContent = catchAsync(async (req, res, next) => {
  const { categoryIds, count = 10 } = req.body;
  
  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    return next(new AppError('At least one category ID is required', 400));
  }
  
  const contentService = require('../services/content.service');
  const allGeneratedContent = [];
  const failedCategories = [];
  
  try {
    // Process each category
    for (const categoryId of categoryIds) {
      try {
        // Get the full category with its prompts and settings
        const category = await Category.findById(categoryId);
        
        if (!category) {
          failedCategories.push({ id: categoryId, error: 'Category not found' });
          continue;
        }
        
        // Get a user for attribution
        const user = req.user;
        if (!user) {
          return next(new AppError('Authentication required', 401));
        }
        
        // Use the category's own contentType - no need to provide it in the request
        console.log(`Generating content for category ${category.name} (${category.contentType || 'hack'})`);
        
        // Generate the content for this category
        const categoryContent = await contentService.generateMultipleContent(
          category,
          user,
          undefined, // Use category's own contentType
          count,
          'beginner' // Default difficulty
        );
        
        allGeneratedContent.push(...categoryContent);
      } catch (error) {
        console.error(`Error generating content for category ${categoryId}:`, error);
        failedCategories.push({ id: categoryId, error: error.message || 'Unknown error' });
      }
    }
    
    if (allGeneratedContent.length === 0 && failedCategories.length > 0) {
      return next(new AppError(`Failed to generate content for any category: ${failedCategories.map(fc => fc.error).join(', ')}`, 500));
    }
    
    res.status(201).json({
      status: 'success',
      results: allGeneratedContent.length,
      failedCategories: failedCategories.length > 0 ? failedCategories : undefined,
      data: {
        content: allGeneratedContent
      }
    });
  } catch (error) {
    console.error('Error in content generation:', error);
    return next(new AppError(`Content generation error: ${error.message}`, 500));
  }
});

// Generate multiple content items
exports.generateMultipleContent = async (req, res, next) => {
  try {
    const { categoryId, contentType, count, difficulty, model } = req.body;
    
    if (!categoryId) {
      return next(new AppError('Category ID is required', 400));
    }
    
    // Retrieve full category object
    const category = await Category.findById(categoryId);
    
    if (!category) {
      return next(new AppError('Category not found', 404));
    }
    
    // Use category's contentType if not explicitly provided
    // This makes the contentType in the request optional
    const effectiveContentType = contentType || category.contentType || 'hack';
    
    console.log(`Using content type: ${effectiveContentType} for category: ${category.name}`);
    
    // Use category's defaultNumToGenerate if count not provided
    const effectiveCount = count || category.defaultNumToGenerate || 5;
    
    // Log the model being used
    const effectiveModel = model || 'gpt-4-turbo-preview';
    console.log(`Making OpenAI API call with model: ${effectiveModel}`);
    
    const user = req.user;
    if (!user) {
      return next(new AppError('Authentication required', 401));
    }
    
    try {
      const contentService = require('../services/content.service');
      const generatedContent = await contentService.generateMultipleContent(
        category,
        user,
        effectiveContentType,
        effectiveCount,
        difficulty || 'beginner',
        effectiveModel // Pass the model parameter
      );
      
      res.status(201).json({
        status: 'success',
        results: generatedContent.length,
        data: {
          content: generatedContent
        }
      });
    } catch (genError) {
      console.error('Error in content generation service:', genError);
      return next(new AppError(`Generation service error: ${genError.message}`, 500));
    }
  } catch (error) {
    console.error('Error in content generation controller:', error);
    return next(new AppError(`Failed to generate content: ${error.message}`, 500));
  }
};

// Add an endpoint for retrieving content by pool
exports.getContentByPool = catchAsync(async (req, res, next) => {
  const { pool = 'regular', category, contentType } = req.query;
  
  const query = { pool };
  
  if (category) {
    query.category = category;
  }
  
  if (contentType) {
    query.contentType = contentType;
  }
  
  const content = await Content.find(query)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-createdAt')
    .limit(100);
  
  res.status(200).json({
    status: 'success',
    success: true,
    results: content.length,
    data: {
      content,
    },
  });
});

// Rewrite content (make it unique)
exports.rewriteContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { model = 'o3' } = req.body;
  
  // Find the content to rewrite
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  try {
    // Get the content service
    const contentService = require('../services/content.service');
    
    // Create a custom rewrite prompt
    const rewritePrompt = `
You are a content rewriting assistant. Take the following content and rewrite it completely 
to make it unique while preserving the core information and value. Use different wording, 
structure, and examples, but maintain the same overall message and advice.

Original Content:
Title: ${content.title}
Body: ${content.body}

Rewrite this content to be completely unique. Return your response as valid JSON with 
title, body, and summary fields.
`;
    
    // Generate new content based on the old one
    const newContent = await contentService.generateWithAI(
      content.category, // Pass the category for context
      null, // No specific topic
      content.difficulty, // Keep same difficulty
      rewritePrompt, // Custom rewrite prompt
      model // Use the specified model
    );
    
    // Update the content with new version
    content.title = newContent.title;
    content.body = newContent.body;
    content.summary = newContent.summary;
    content.updatedAt = Date.now();
    content.lastRewriteDate = Date.now();
    
    // If tags were generated, use them, otherwise keep existing
    if (newContent.tags && newContent.tags.length > 0) {
      content.tags = newContent.tags;
    }
    
    // Save the updated content
    await content.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Content rewritten successfully',
      data: {
        content
      }
    });
  } catch (error) {
    console.error('Error rewriting content:', error);
    return next(new AppError(`Failed to rewrite content: ${error.message}`, 500));
  }
}); 