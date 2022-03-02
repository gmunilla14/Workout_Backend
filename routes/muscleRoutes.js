const express = require("express");
const Muscle = require("../models/Muscle");
const router = express.Router();
const Joi = require("joi");

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

module.exports = router;
