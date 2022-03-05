const mongoose = require("mongoose");

const muscleSchema = new mongoose.Schema({
  name: { type: String },
});

const Muscle = mongoose.model("Muscle", muscleSchema);
exports.Muscle = Muscle;
