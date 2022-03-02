const Sequelize = require("sequelize");
const sequelize = require("../config/database");

class Muscle extends Sequelize.Model {}

Muscle.init(
  {
    name: {
      type: Sequelize.STRING,
    },
  },
  { sequelize, modelName: "muscle" }
);

module.exports = Muscle;
