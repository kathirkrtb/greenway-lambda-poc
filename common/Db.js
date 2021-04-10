const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  region: config.region,
});

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

//connect mongodb
let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }
  return mongoose
    .connect(config.MONGODB_URI)
    .then((db) => {
      cachedDb = db;
      return cachedDb;
    })
    .catch((err) => {
      console.log("connected db error", err);
    });
};

module.exports = {
  connectToDatabase,
};
