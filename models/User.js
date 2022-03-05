const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, minlength: 4, maxlength: 32 },
  email: { type: String, unique: true },
  password: { type: String, minlength: 6, maxlength: 100 },
  inactive: { type: Boolean, default: true },
  activationToken: { type: String },
});

const User = mongoose.model("User", userSchema);

exports.User = User;
