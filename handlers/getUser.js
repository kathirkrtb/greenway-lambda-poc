const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  region: config.region,
});
//import response component
const Responses = require("../common/Responses");
const db = require("../common/Db");
//load models
const User = require("../models/Users");

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return db
    .connectToDatabase()
    .then(() => User.findById(event.pathParameters.id))
    .then(async (user) => {
      return Responses._200({
        success: true,
        data: user,
      });
    })
    .catch((err) => {
      return Responses._500({
        success: false,
        message: "Could not load user",
        errors: err,
      });
    });
};
