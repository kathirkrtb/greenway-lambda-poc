const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  region: config.region,
});

const bcrypt = require("bcryptjs");

//import response component
const Responses = require("../common/Responses");
const db = require("../common/Db");
//load models
const User = require("../models/Users");
//import validation
const validate = require("../validation/login");

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  let input = JSON.parse(event.body);

  const token_key = input.token_key;
  const password = input.password;

  if (!password) {
    return Responses._200({
      success: false,
      message: "password required",
    });
  }

  return db
    .connectToDatabase()
    .then(() => User.findOne({ token_key }))
    .then(async (user) => {
      if (!user) {
        return Responses._200({
          success: false,
          message: "User not found",
        });
      }

      const hash = await bcrypt.hash(password, 8);

      console.log("hash", hash);

      if (hash) {
        user.password = hash;
        user.token_key = "";
        user.modified_date = new Date();

        return user
          .save()
          .then(async (data) => {
            const payload = {
              id: data._id,
              email: data.email,
              mobile: data.mobile,
            };

            let token = await validate.signToken(payload);

            return Responses._200({
              success: true,
              message: "Password updated successfully",
              token: token,
              email: data.email,
            });
          })
          .catch((err) => {
            return Responses._500({
              success: false,
              message: "Could not update password",
              err,
            });
          });
      } else {
        return Responses._500({
          success: false,
          message: "Could not update password",
          err,
        });
      }
    })
    .catch((err) => {
      return Responses._422({
        message: "Could not update password",
        errors: err,
      });
    });
};
