const express = require("express");
const userRouter = require("./routes/userRoutes");
const muscleRouter = require("./routes/muscleRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(userRouter);
app.use(muscleRouter);

module.exports = app;
