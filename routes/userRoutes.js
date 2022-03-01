const express = require("express");
const User = require("../models/User");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Joi = require("joi");

router.post("/api/1.0/signup", async (req, res) => {
  //------------------------------Input Validation--------------------------------
  const schema = Joi.object({
    username: Joi.string().min(4).max(32).required().messages({
      "string.min": "Username must have min 3 and max 32 characters",
      "string.max": "Username must have min 3 and max 32 characters",
      "string.required": "Username is required",
      "string.base": "Username is required",
    }),
    email: Joi.string().email().required().messages({
      "string.required": "Email is required",
      "string.email": "Email is not valid",
      "string.base": "Email is required",
      "string.required": "Email is required",
    }),
    password: Joi.string()
      .min(6)
      .max(32)
      .pattern(new RegExp("^(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).*$"))
      .required()
      .messages({
        "string.min":
          "Password must be at least 6 characters and at most 32 characters",
        "string.max":
          "Password must be at least 6 characters and at most 32 characters",
        "string.pattern.base":
          "Password must have at least 1 uppercase, 1 lowercase letter and 1 number",
        "string.base": "Password is required",
        "string.required": "Password is required",
      }),
    inactive: Joi.boolean(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    let validationErrors = {};
    error.details.forEach((detail) => {
      const parts = detail.message.split(" ");
      const field = parts[0].toLowerCase();
      validationErrors[field] = detail.message;
    });

    return res.status(400).send({
      validationErrors,
    });
  }

  const { username, password, email } = req.body;

  //--------------------------------------Hash Password-----------------------------

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  //--------------------------------------Create Activation Token-----------------------------

  const activationToken = crypto
    .randomBytes(16)
    .toString("hex")
    .substring(0, 16);

  const user = {
    username,
    email,
    password: hashedPassword,
    inactive: true,
    activationToken,
  };
  const newUser = await User.create(user);

  //---------------------------------------------Return JWT Token-----------------------
  const token = jwt.sign(
    { id: newUser.id, username, email },
    process.env.SECRET_KEY
  );
  res.send({ message: "User created", token });
});

module.exports = router;
