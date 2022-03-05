const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const dbServer = await MongoMemoryServer.create();

exports.dbConnect = async () => {
  const uri = dbServer.getUri();

  mongoose.connect(uri, {
    userNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

exports.dbDisconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await dbServer.stop();
};
