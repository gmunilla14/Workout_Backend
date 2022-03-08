const express = require("express");
const { Exercise } = require("../models/Exercise");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");

router.post("/api/1.0/exercises", auth, async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required().min(1).max(32).messages({
      "string.max": "Name must be at most 32 characters",
      "string.min": "Name must be at most 32 characters",
      "string.empty": "Name must be at most 32 characters",
      "string.required": "Name is required",
      "string.base": "Name is required",
    }),
    muscles: Joi.array().items(Joi.string()).messages({
      "array.base": "Muscles must be provided in an array",
      "array.min": "Exercise must have at least one muscle",
      "array.empty": "Exercise must have at least one muscle",
      "array.includes": "String required",
    }),
    notes: Joi.string().max(200).messages({
      "string.max": "Notes must be at most 200 characters",
    }),
    uid: Joi.string(),
    adminString: Joi.string().max(100),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  //Check if muscles array is empty
  let noMuscles = false;
  try {
    if (req.body.muscles.length < 1) {
      noMuscles = true;
    }
  } catch (err) {}

  //Check if muscles array contains an invalid muscle
  let invalidMuscle = false;
  const muscleList = await Muscle.find({});
  const ids = muscleList.map((muscle) => {
    return muscle._id;
  });

  try {
    req.body.muscles.forEach((input) => {
      let validMuscle = false;
      ids.forEach((id) => {
        if (input == id) {
          validMuscle = true;
        }
      });

      if (!validMuscle) {
        invalidMuscle = true;
      }
    });
  } catch {}

  //Compute and send validation errors
  if (error || noMuscles || invalidMuscle) {
    let validationErrors = {};
    if (error) {
      error.details.forEach((detail) => {
        const parts = detail.message.split(" ");
        const field = parts[0].toLowerCase();
        validationErrors[field] = detail.message;
      });
    }

    if (noMuscles) {
      validationErrors.muscles = "Exercise must have at least one muscle";
    }

    if (invalidMuscle) {
      validationErrors.muscles = "Must choose valid muscles";
    }

    return res.status(400).send({
      validationErrors,
    });
  }
  const { name, muscles, notes } = req.body;
  if (req.body.adminString === process.env.ADMIN_STRING) {
    const exercise = await new Exercise({
      name,
      muscles,
      notes,
      uid: "admin",
    });

    await exercise.save();
  } else {
    const userList = await User.find({ email: req.user.email });
    const savedUser = userList[0];
    if (savedUser.inactive) {
      return res.status(403).send({ message: "User inactive" });
    }

    const exercise = await new Exercise({
      name,
      muscles,
      notes,
      uid: savedUser._id,
    });

    await exercise.save();
  }

  res.send({ message: "Created exercise" });
});

router.get("/api/1.0/exercises", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.inactive) {
    return res.status(403).send({ message: "User inactive" });
  }

  const exercises = await Exercise.find({
    uid: { $in: ["admin", req.user.id] },
  });

  if (exercises.length < 1) {
    return res.send({ message: "No exercises" });
  }

  res.send({ exercises });
});

module.exports = router;
