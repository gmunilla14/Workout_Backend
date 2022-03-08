const express = require("express");
const { Muscle } = require("../models/Muscle");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { User } = require("../models/User");
const { Exercise } = require("../models/Exercise");
const { Plan } = require("../models/Plan");

router.post("/api/1.0/plans", auth, async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required().max(100),
    groups: Joi.array()
      .items(
        Joi.object({
          exerciseID: Joi.string().required(),
          sets: Joi.array().items(
            Joi.object({
              type: Joi.string().required().valid("exercise", "rest"),
              reps: Joi.number(),
              weight: Joi.number(),
              duration: Joi.number(),
            })
          ),
        })
      )
      .min(1),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).send({ message: "Invalid plan input" });
  }

  let invalidGroup = false;

  const checkExercises = () =>
    new Promise((resolve, reject) => {
      req.body.groups.forEach(async (group, index, array) => {
        try {
          const exercise = await Exercise.findById(group.exerciseID);
          if (!exercise) {
            invalidGroup = true;
          }
        } catch {
          invalidGroup = true;
        }
        if (group.sets.length > 0) {
          group.sets.forEach(async (set) => {
            if (
              (set.type === "rest" && (set.weight || set.reps)) ||
              (set.type === "exercise" && set.duration)
            ) {
              invalidGroup = true;
            }
          });
        } else {
          invalidGroup = true;
        }

        if (index === array.length - 1) resolve();
      });
    });

  await checkExercises();

  if (invalidGroup) {
    return res.status(400).send({ message: "Invalid plan input" });
  }

  try {
    let newPlan = new Plan({ ...req.body, creatorID: req.user.id });

    newPlan = await newPlan.save();
    res.send({ message: "Plan created" });
  } catch (err) {
    res.send({ message: err });
  }
});

module.exports = router;
