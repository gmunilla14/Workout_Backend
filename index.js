const app = require("./app");
const mongoose = require("mongoose");

app.listen(5000, () => console.log("App is listening..."));

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connection established....");
});
