const Sequelize = require("sequelize");
const sequelize = require("../config/database");

class Exercise extends Sequelize.Model {}

Exercise.init(
  {
    name: {
      type: Sequelize.STRING,
    },
    muscles: {
      type: Sequelize.ARRAY(Sequelize.STRING),
    },
    notes: {
      type: Sequelize.STRING,
    },
    uid: {
      type: Sequelize.STRING,
    },
  },
  { sequelize, modelName: "Exercise" }
);

module.exports = Exercise;
