const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Workout } = require("../models/Workout");

router.get("/api/1.0/data", auth, async (req, res) => {
  const workouts = await Workout.find({ uid: req.user.id });

  //Get relevant groups based on chosen exercise
  let groups = [];
  workouts.forEach((workout) => {
    workout.groups.forEach((group) => {
      if (group.exerciseID === req.query.exercise) {
        groups.push(group);
      }
    });
  });

  //Extract relevant data

  let data = [];

  if (req.query.type === "volpersec") {
    groups.forEach((group) => {
      const x = new Date(group.sets[0].startTime);

      let sum = 0;
      group.sets.forEach((set) => {
        if (set.type === "exercise") {
          sum += set.weight * set.reps;
        }
      });

      const start = group.sets[0].startTime;
      const end = group.sets[group.sets.length - 1].endTime;

      const y = (sum * 1000) / (end - start);

      data.push({ x, y });
    });
  }
  res.send({ data: data });
});

module.exports = router;
