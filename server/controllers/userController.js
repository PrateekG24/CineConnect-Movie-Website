const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailUtils');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      if (userExists.email === email) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      if (userExists.username === username) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Generate verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      emailVerificationToken,
      emailVerificationExpires
    });

    if (user) {
      try {
        // Send verification email
        await sendVerificationEmail(user, emailVerificationToken);

        res.status(201).json({
          _id: user._id,
          username: user.username,
          email: user.email,
          token: generateToken(user._id),
          isEmailVerified: false,
          message: 'Registration successful. Please check your email to verify your account.'
        });
      } catch (emailError) {
        // Continue with registration even if email sending fails
        console.error('Email sending error during registration:', emailError);

        res.status(201).json({
          _id: user._id,
          username: user.username,
          email: user.email,
          token: generateToken(user._id),
          isEmailVerified: false,
          message: 'Registration successful, but we could not send a verification email. Please try requesting a new verification email from your profile page.'
        });
      }
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'ValidationError') {
      // Mongoose validation error
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages[0] });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        watchlist: user.watchlist
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For username update
    if (req.body.username && req.body.username !== user.username) {
      // Check if username is valid
      if (!/^[a-zA-Z0-9_]+$/.test(req.body.username)) {
        return res.status(400).json({
          message: 'Username can only contain letters, numbers, and underscores'
        });
      }

      if (req.body.username.length < 3) {
        return res.status(400).json({
          message: 'Username must be at least 3 characters'
        });
      }

      if (req.body.username.length > 30) {
        return res.status(400).json({
          message: 'Username cannot exceed 30 characters'
        });
      }

      // Check if username already exists
      const usernameExists = await User.findOne({ username: req.body.username });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      user.username = req.body.username;
    }

    // For email update
    if (req.body.email && req.body.email !== user.email) {
      // Validate email format
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }

      // Check if email already exists
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Generate verification token for new email
      const emailVerificationToken = generateVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store pending email and verification data
      user.pendingEmail = req.body.email;
      user.emailVerificationToken = emailVerificationToken;
      user.emailVerificationExpires = emailVerificationExpires;

      try {
        // Send verification email to the new address
        await sendVerificationEmail(user, emailVerificationToken, req.body.email);

        await user.save();

        return res.json({
          _id: user._id,
          username: user.username,
          email: user.email,
          pendingEmail: user.pendingEmail,
          token: generateToken(user._id),
          message: 'Verification email sent to your new email address. Please verify to complete the update.'
        });
      } catch (emailError) {
        console.error('Email sending error during profile update:', emailError);

        // Revert the pending email change since we couldn't verify it
        user.pendingEmail = null;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;

        await user.save();

        return res.status(500).json({
          message: 'Could not send verification email. Please try again later.'
        });
      }
    }

    // For password update
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({
          message: 'Password must be at least 6 characters'
        });
      }

      user.password = req.body.password;
    }

    // Save user changes if no email change is being processed
    if (!req.body.email || req.body.email === user.email) {
      await user.save();

      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
        message: 'Profile updated successfully'
      });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ValidationError') {
      // Mongoose validation error
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages[0] });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify Email
// @route   GET /api/users/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    // If this is a new account verification
    if (!user.isEmailVerified && !user.pendingEmail) {
      user.isEmailVerified = true;
    }

    // If this is an email change verification
    if (user.pendingEmail) {
      user.email = user.pendingEmail;
      user.pendingEmail = null;
      user.isEmailVerified = true;
    }

    // Clear verification data
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.json({
      message: 'Email verified successfully',
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resend Verification Email
// @route   POST /api/users/resend-verification
// @access  Private
const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified && !user.pendingEmail) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;

    await user.save();

    // Send email to pending email if exists, otherwise to current email
    const targetEmail = user.pendingEmail || user.email;

    try {
      await sendVerificationEmail(user, emailVerificationToken, targetEmail);

      return res.json({
        message: 'Verification email has been sent'
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);

      return res.status(500).json({
        message: 'Could not send verification email. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add item to watchlist
// @route   POST /api/users/watchlist
// @access  Private
const addToWatchlist = async (req, res) => {
  try {
    const { mediaType, mediaId, title, poster_path } = req.body;

    const user = await User.findById(req.user._id);

    // Check if media already exists in watchlist
    const existingItem = user.watchlist.find(
      item => item.mediaType === mediaType && item.mediaId === mediaId
    );

    if (existingItem) {
      return res.status(400).json({ message: 'Item already in watchlist' });
    }

    // Add to watchlist
    user.watchlist.push({
      mediaType,
      mediaId,
      title,
      poster_path,
      added_at: Date.now()
    });

    await user.save();

    res.status(201).json(user.watchlist);
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove item from watchlist
// @route   DELETE /api/users/watchlist/:id
// @access  Private
const removeFromWatchlist = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const user = await User.findById(req.user._id);

    // Remove item from watchlist
    user.watchlist = user.watchlist.filter(
      item => item.mediaId.toString() !== mediaId
    );

    await user.save();

    res.json(user.watchlist);
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user watchlist
// @route   GET /api/users/watchlist
// @access  Private
const getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json(user.watchlist);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  verifyEmail,
  resendVerificationEmail,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist
}; 