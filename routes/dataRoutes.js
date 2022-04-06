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
  let x = [];
  let y = [];
  if (req.query.type === "volpersec") {
    x = groups.map((group) => {
      return group.sets[0].startTime;
    });
    y = groups.map((group) => {
      let sum = 0;
      group.sets.forEach((set) => {
        if (set.type === "exercise") {
          sum += set.weight * set.reps;
        }
      });

      let start = group.sets[0].startTime;
      let end = group.sets[group.sets.length - 1].endTime;
      return (sum * 1000) / (end - start);
    });
  }
  res.send({ x, y });
});

module.exports = router;
