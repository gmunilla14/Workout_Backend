const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");
const { Exercise } = require("../models/Exercise");
const { Plan } = require("../models/Plan");
const { Workout } = require("../models/Workout");

router.delete("/api/1.0/cleanup", async (req, res) => {
  await User.deleteMany({});
  await Muscle.deleteMany({});
  await Exercise.deleteMany({});
  await Plan.deleteMany({});
  await Workout.deleteMany({});

  res.send({ message: "Database Cleared" });
});

module.exports = router;
