const express = require("express");
const Exercise = require("../models/Exercise");
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const User = require("../models/User");

const correctString = process.env.ADMIN_STRING;

router.post("/api/1.0/exercises", async (req, res) => {
  res.send();
});
