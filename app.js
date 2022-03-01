const express = require("express");
const userRouter = require("./routes/userRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(userRouter);

module.exports = app;
