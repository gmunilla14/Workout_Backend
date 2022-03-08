const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 1, maxlength: 100 },
  creatorID: { type: String, required: true },
  groups: [
    {
      exerciseID: { type: String, required: true },
      sets: [
        {
          type: { type: String, required: true },
          reps: { type: Number },
          weight: { type: Number },
          duration: { type: Number },
        },
      ],
    },
  ],
});

const Plan = mongoose.model("Plan", planSchema);

exports.Plan = Plan;
