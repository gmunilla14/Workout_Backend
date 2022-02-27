const express = require("express");
const User = require("../models/User");
const router = express.Router();

router.post("/api/1.0/signup", async (req, res) => {
  const { username, password, email } = req.body;
  const user = {
    username,
    email,
    password,
    activationToken: "token",
  };
  await User.create(user);
  res.send({ message: "User created" });
});

module.exports = router;
