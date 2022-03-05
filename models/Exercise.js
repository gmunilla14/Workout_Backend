const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
  name: { type: String },
  muscles: [{ type: String }],
  notes: { type: String },
  uid: { type: String },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

exports.Exercise = Exercise;
