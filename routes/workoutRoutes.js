const express = require("express");
const { Exercise } = require("../models/Exercise");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");
const { Plan } = require("../models/Plan");
const { Workout } = require("../models/Workout");

router.post("/api/1.0/workouts", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.inactive) {
    return res.status(403).send({ message: "User inactive" });
  }
  const schema = Joi.object({
    planID: Joi.string().required().max(40),
    startTime: Joi.number().required(),
    endTime: Joi.number().required(),
    groups: Joi.array().items(
      Joi.object({
        exerciseID: Joi.string().required().max(40),
        sets: Joi.array().items(
          Joi.object({
            type: Joi.string().required().valid("exercise", "rest"),
            reps: Joi.number(),
            weight: Joi.number(),
            duration: Joi.number(),
            startTime: Joi.number().required(),
            endTime: Joi.number().required(),
          })
        ),
      })
    ),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).send({ message: error });
  }

  const workout = { ...req.body, uid: user._id };
  const exercises = await Exercise.find({
    uid: { $in: ["admin", req.user.id] },
  });

  let setsList = [];
  let invalidExercise = false;
  workout.groups.forEach((group) => {
    group.sets.forEach((set) => {
      setsList.push(set);
      const output = exercises.filter((exercise) => {
        return exercise._id == group.exerciseID;
      });
      if (output.length < 1) {
        invalidExercise = true;
      }
    });
  });

  if (invalidExercise) {
    return res.status(400).send({ message: "Invalid exercise" });
  }
  let invalidTime = false;
  setsList.forEach((set, index, array) => {
    if (index !== 0) {
      if (set.startTime <= array[index - 1].startTime) {
        invalidTime = true;
      }
    }
    if (set.startTime >= set.endTime) {
      invalidTime = true;
    }
  });

  if (invalidTime) {
    return res.status(400).send({ message: "Invalid time input" });
  }
  try {
    const plan = await Plan.findById(workout.planID);
    if (!plan) {
      return res.status(400).send({ message: "Invalid plan" });
    }
  } catch {
    return res.status(400).send({ message: "Invalid plan" });
  }

  if (workout.startTime >= workout.endTime) {
    return res.status(400).send({ message: "Invalid time input" });
  }
  try {
    let newWorkout = new Workout(workout);
    newWorkout = await newWorkout.save();
    res.send({ message: "Workout created" });
  } catch {}
});

router.get("/api/1.0/workouts", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.inactive) {
    return res.status(403).send({ message: "User inactive" });
  }

  const workouts = await Workout.find({ uid: user._id });
  res.send({ workouts });
});

module.exports = router;
