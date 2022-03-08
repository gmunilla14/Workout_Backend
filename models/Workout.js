const mongoose = require("mongoose");

const workoutSchema = new mongoose.Schema({
  planID: {
    type: String,
    required: true,
    maxlength: 200,
  },
  uid: { type: String, required: true },
  startTime: { type: Number },
  endTime: { type: Number },
  groups: [
    {
      exerciseID: { type: String, required: true },
      sets: [
        {
          type: { type: String, required: true },
          reps: { type: Number },
          weight: { type: Number },
          startTime: { type: Number },
          endTime: { type: Number },
        },
      ],
    },
  ],
});

const Workout = mongoose.model("Workout", workoutSchema);

exports.Workout = Workout;
