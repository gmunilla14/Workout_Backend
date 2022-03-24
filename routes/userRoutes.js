const express = require("express");
const { User } = require("../models/User");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Joi = require("joi");
const auth = require("../middleware/auth");

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

  try {
    let newUser = new User(user);
    newUser = await newUser.save();
    //---------------------------------------------Return JWT Token-----------------------
    const token = jwt.sign(
      { id: newUser._id, username, email, inactive: true },
      process.env.SECRET_KEY
    );
    return res.send({ message: "User created", token });
  } catch (err) {
    return res.send({ error: err.message });
  }
});

router.post("/api/1.0/activate", auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (user.activationToken !== req.body.token) {
      return res.status(400).send({ message: "Invalid activation request" });
    }
    user.inactive = false;
    user.activationToken = null;
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        inactive: user.inactive,
      },
      process.env.SECRET_KEY
    );
    return res.send({ message: "Account activated", token });
  } catch (err) {
    return res.status(400).send({ message: "Invalid activation request" });
  }
});

router.post("/api/1.0/signin", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        inactive: user.inactive,
      },
      process.env.SECRET_KEY
    );

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).send({ message: "Invalid email or password" });
    }

    if (user.inactive) {
      return res.status(403).send({ message: "User is inactive" });
    }
    res.send({ token });
  } catch (err) {
    return res.status(400).send({ message: "Invalid email or password" });
  }
});

router.delete("/api/1.0/users", auth, async (req, res) => {
  const adminString = process.env.ADMIN_STRING;

  const schema = Joi.object({
    adminString: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(401).send();
  }

  if (req.body.adminString !== adminString) {
    return res.status(401).send();
  }
  const user = req.user;

  try {
    await User.findByIdAndDelete(user.id);
    res.send({ message: "User deleted" });
  } catch (err) {
    res.status(400).send();
  }
});

router.get("/api/1.0/token", auth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  res.send({ token: user.activationToken });
});

module.exports = router;
