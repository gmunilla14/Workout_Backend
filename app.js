const express = require("express");
const userRouter = require("./routes/userRoutes");
const muscleRouter = require("./routes/muscleRoutes");
const exerciseRouter = require("./routes/exerciseRoutes");
const planRouter = require("./routes/planRoutes");
const workoutRouter = require("./routes/workoutRoutes");
const cleanupRouter = require("./routes/cleanupRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(userRouter);
app.use(muscleRouter);
app.use(exerciseRouter);
app.use(planRouter);
app.use(workoutRouter);
app.use(cleanupRouter);
module.exports = app;
