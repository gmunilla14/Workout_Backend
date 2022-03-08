const express = require("express");
const { Muscle } = require("../models/Muscle");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { User } = require("../models/User");

router.post("/api/1.0/muscles", async (req, res) => {
  const schema = Joi.object({
    string: Joi.string().required(),
    muscle: Joi.object({
      name: Joi.string().required(),
    }).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).send({ message: error });
  }

  if (req.body.string !== process.env.ADMIN_STRING) {
    return res.status(401).send();
  }

  try {
    let newMuscle = new Muscle(req.body.muscle);
    newMuscle = await newMuscle.save();
    res.send({ message: "Muscle created" });
  } catch (err) {
    res.status(400).send({ message: err });
  }
});

router.get("/api/1.0/muscles", auth, async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });

    if (user.inactive) {
      return res.status(403).send({ message: "User inactive" });
    }

    const muscles = await Muscle.find();
    res.send(muscles);
  } catch (err) {
    return res.status(401).send({ message: "Not authenticated" });
  }
});

router.delete("/api/1.0/muscles", async (req, res) => {
  if (req.body.adminString !== process.env.ADMIN_STRING) {
    return res.status(401).send();
  }

  try {
    const deleteMuscle = await Muscle.findOneAndDelete({
      name: req.body.muscle,
    });

    if (!deleteMuscle) {
      return res.status(400).send({ message: "Muscle does not exist" });
    }
  } catch (err) {
    return res.status(400).send({ message: "Muscle does not exist" });
  }

  res.send({ message: "Muscle deleted" });
});

module.exports = router;
