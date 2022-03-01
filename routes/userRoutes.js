const express = require("express");
const User = require("../models/User");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
router.post("/api/1.0/signup", async (req, res) => {
  const { username, password, email } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const activationToken = crypto
    .randomBytes(16)
    .toString("hex")
    .substring(0, 16);

  const user = {
    username,
    email,
    password: hashedPassword,
    inactive: true,
    activationToken,
  };
  const newUser = await User.create(user);

  const token = jwt.sign(
    { id: newUser.id, username, email },
    process.env.SECRET_KEY
  );
  console.log(token);
  console.log(jwt.decode(token));
  res.send({ message: "User created", token });
});

module.exports = router;
