const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    fullName: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    salt: {
      type: String
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Worker', 'User'],
      default: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Method to hash password
userSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, 'sha512')
    .toString('hex');
};

// Method to validate password
userSchema.methods.validPassword = function (password) {
  if (!this.salt) return false;
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, 'sha512')
    .toString('hex');
  return this.password === hash;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
