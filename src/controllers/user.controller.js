const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get user profile
exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select('-password -__v')
    .populate('progress.categoryProgress.category', 'name slug icon');
  
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Update user profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  // Filter out fields that shouldn't be updated directly
  const filteredBody = filterObj(
    req.body,
    'name',
    'avatar'
  );
  
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Update user preferences
exports.updatePreferences = catchAsync(async (req, res, next) => {
  const { theme, notifications, contentPreferences } = req.body;
  
  // Build preferences object with only allowed fields
  const preferences = {};
  
  if (theme) {
    preferences['preferences.theme'] = theme;
  }
  
  if (notifications) {
    if (notifications.email !== undefined) {
      preferences['preferences.notifications.email'] = notifications.email;
    }
    if (notifications.push !== undefined) {
      preferences['preferences.notifications.push'] = notifications.push;
    }
  }
  
  if (contentPreferences) {
    if (contentPreferences.categories) {
      preferences['preferences.contentPreferences.categories'] = contentPreferences.categories;
    }
    if (contentPreferences.difficulty) {
      preferences['preferences.contentPreferences.difficulty'] = contentPreferences.difficulty;
    }
  }
  
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    preferences,
    {
      new: true,
      runValidators: true,
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      preferences: updatedUser.preferences,
    },
  });
});

// Get user progress
exports.getProgress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select('stats progress')
    .populate('progress.completedContent', 'title category')
    .populate('progress.savedContent', 'title category')
    .populate('progress.categoryProgress.category', 'name slug icon color');
  
  res.status(200).json({
    status: 'success',
    data: {
      stats: user.stats,
      progress: user.progress,
    },
  });
});

// Register device token for push notifications
exports.registerDevice = catchAsync(async (req, res, next) => {
  const { token, platform } = req.body;
  
  if (!token || !platform) {
    return next(new AppError('Please provide token and platform', 400));
  }
  
  if (!['ios', 'android', 'web'].includes(platform)) {
    return next(new AppError('Platform must be ios, android, or web', 400));
  }
  
  const user = await User.findById(req.user.id);
  
  // Check if device token already exists
  const existingTokenIndex = user.deviceTokens.findIndex(
    device => device.token === token
  );
  
  if (existingTokenIndex !== -1) {
    // Update last used date
    user.deviceTokens[existingTokenIndex].lastUsed = Date.now();
  } else {
    // Add new token
    user.deviceTokens.push({
      token,
      platform,
      lastUsed: Date.now(),
    });
  }
  
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Device registered successfully',
  });
});

// Unregister device token
exports.unregisterDevice = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  
  if (!token) {
    return next(new AppError('Please provide token', 400));
  }
  
  const user = await User.findById(req.user.id);
  
  // Remove token from device tokens
  user.deviceTokens = user.deviceTokens.filter(
    device => device.token !== token
  );
  
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Device unregistered successfully',
  });
});

// Deactivate account
exports.deactivateAccount = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Helper function to filter object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}; 