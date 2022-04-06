const app = require("./app");
const mongoose = require("mongoose");

app.listen(3000, "192.168.4.66", () => console.log("App is listening..."));

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connection established....");
});
