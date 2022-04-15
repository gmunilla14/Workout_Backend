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
    res.send({ message: "Plan created", plan: newPlan });
  } catch (err) {
    res.send({ message: err });
  }
});

router.get("/api/1.0/plans", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.inactive) {
      return res.status(403).send({ message: "User inactive" });
    }

    const planList = await Plan.find({ creatorID: user.id });
    return res.send({ plans: planList });
  } catch (err) {
    return res.status(400).send({ message: "Server Error" });
  }
});

router.put("/api/1.0/plans/:id", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.inactive) {
    return res.status(403).send({ message: "User inactive" });
  }

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

  let plan = await Plan.findById(req.params.id);
  if (plan.creatorID !== req.user.id) {
    return res
      .status(401)
      .send({ message: "Can only edit plans you have created" });
  }

  let newPlan = req.body;

  await Plan.findByIdAndUpdate(plan._id, newPlan);

  newPlan = { ...newPlan, _id: plan._id };
  return res.status(200).send({ message: "Plan edited", plan: newPlan });
});

module.exports = router;
