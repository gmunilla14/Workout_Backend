const express = require("express");
const Muscle = require("../models/Muscle");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const User = require("../models/User");

const correctString = "jf320jfjje0cjcnoi20923n4oijojfj29";

router.post("/api/1.0/muscles", async (req, res) => {
  const schema = Joi.object({
    string: Joi.string().required(),
    muscle: Joi.object({
      name: Joi.string().required(),
    }).required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).send();
  }

  if (req.body.string !== correctString) {
    return res.status(401).send();
  }

  try {
    await Muscle.create(req.body.muscle);
    res.send({ message: "Muscle created" });
  } catch (err) {
    res.status(400).send();
  }
});

router.get("/api/1.0/muscles", auth, async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });

    if (user.inactive) {
      return res.status(403).send({ message: "User inactive" });
    }

    const muscles = await Muscle.findAll();
    res.send(muscles);
  } catch (err) {
    return res.status(401).send({ message: "Not authenticated" });
  }
});

module.exports = router;
