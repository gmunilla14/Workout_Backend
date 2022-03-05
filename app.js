const express = require("express");
const userRouter = require("./routes/userRoutes");
const muscleRouter = require("./routes/muscleRoutes");
const exerciseRouter = require("./routes/exerciseRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(userRouter);
app.use(muscleRouter);
app.use(exerciseRouter);

module.exports = app;
