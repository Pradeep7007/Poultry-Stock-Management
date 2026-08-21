const User = require('../models/User');

// Helper to seed default users if missing
const seedDefaultUsersIfNeeded = async () => {
  try {
    const pmsCount = await User.countDocuments({ username: 'pms' });
    if (pmsCount === 0) {
      const pmsUser = new User({
        username: 'pms',
        email: 'pms@poultry.com',
        fullName: 'PMS Admin',
        role: 'Admin'
      });
      pmsUser.setPassword('26082006');
      await pmsUser.save();
    }

    const pradeepCount = await User.countDocuments({ username: 'pradeep' });
    if (pradeepCount === 0) {
      const pradeepUser = new User({
        username: 'pradeep',
        email: 'pradeep@poultry.com',
        fullName: 'Pradeep',
        role: 'Admin'
      });
      pradeepUser.setPassword('2006');
      await pradeepUser.save();
    }
  } catch (err) {
    console.error('Error seeding default users:', err.message);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register (or /signup)
const registerUser = async (req, res) => {
  try {
    const { username, email, fullName, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    // Check if user already exists
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }]
    });

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        return res.status(400).json({ message: 'Username is already taken.' });
      }
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const user = new User({
      username: cleanUsername,
      email: cleanEmail,
      fullName: fullName ? fullName.trim() : username.trim(),
      role: 'User'
    });

    user.setPassword(password);
    await user.save();

    res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
};

// @desc    Authenticate user & return details
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    await seedDefaultUsersIfNeeded();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide both username/email and password.' });
    }

    const identifier = username.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user) {
      // Fallback for demo defaults if DB seed failed
      if ((identifier === 'pms' && password === '26082006') || (identifier === 'pradeep' && password === '2006')) {
        return res.json({
          message: 'Login successful!',
          user: {
            username: identifier,
            email: `${identifier}@poultry.com`,
            fullName: identifier === 'pradeep' ? 'Pradeep' : 'PMS Admin',
            role: 'Admin'
          }
        });
      }
      return res.status(401).json({ message: 'Invalid credentials provided.' });
    }

    const isMatch = user.validPassword(password);
    if (!isMatch) {
      // Fallback check for default legacy plaintext credentials
      if ((user.username === 'pms' && password === '26082006') || (user.username === 'pradeep' && password === '2006')) {
        user.setPassword(password);
        await user.save();
      } else {
        return res.status(401).json({ message: 'Invalid credentials provided.' });
      }
    }

    res.json({
      message: 'Login successful!',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login.' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase() }).select('-password -salt');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
