const express = require("express");
const userRouter = require("./routes/userRoutes");
const muscleRouter = require("./routes/muscleRoutes");
const exerciseRouter = require("./routes/exerciseRoutes");
const planRouter = require("./routes/planRoutes");
const workoutRouter = require("./routes/workoutRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(userRouter);
app.use(muscleRouter);
app.use(exerciseRouter);
app.use(planRouter);
app.use(workoutRouter);
module.exports = app;
