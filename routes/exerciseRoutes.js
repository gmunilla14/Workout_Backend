const express = require("express");
const { Exercise } = require("../models/Exercise");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");

const correctString = process.env.ADMIN_STRING;

router.post("/api/1.0/exercises", auth, async (req, res) => {
  const userList = await User.find({ email: req.user.email });
  const savedUser = userList[0];
  if (savedUser.inactive) {
    return res.status(403).send({ message: "User inactive" });
  }
  const { name, muscles, notes } = req.body;

  const exercise = await new Exercise({
    name,
    muscles,
    notes,
    uid: savedUser._id,
  });

  await exercise.save();

  res.send({ message: "Created exercise" });
});

module.exports = router;
