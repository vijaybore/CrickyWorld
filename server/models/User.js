const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:      { type: String, default: '' },
  mobile:    { type: String, required: true, unique: true },
  email:     { type: String, default: '' },
  avatar:    { type: String, default: '' },
  otp:       { type: String, default: '' },
  otpExpiry: { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);