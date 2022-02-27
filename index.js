const app = require("./app");
const sequelize = require("./config/database");

sequelize.sync({ force: true });

app.listen(3000, () => console.log("App is listening..."));
