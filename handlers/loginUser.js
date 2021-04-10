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

//import validation
const validate = require("../validation/login");

exports.handler = async (event, context) => {
  let input = JSON.parse(event.body);

  const { errors, isValid } = await validate.validateEmail(input);

  if (!isValid) {
    return Responses._200({
      success: false,
      error: errors,
      message: "Invalid login crendentials",
    });
  }

  const email = input.email;
  const password = input.password;

  return db
    .connectToDatabase()
    .then(() => User.findOne({ email }))
    .then(async (user) => {
      if (!user) {
        errors.email = "User not found";
        return Responses._200({
          success: false,
          message: "User not found",
          error: "User not found",
        });
      }

      const passwordMatch = await validate.comparePassword(
        password,
        user.password
      );

      console.log("passwordMatch", passwordMatch);

      if (passwordMatch) {
        const payload = {
          id: user._id,
          email: user.email,
          mobile: user.mobile,
        };

        let token = await validate.signToken(payload);
        return Responses._200({
          success: true,
          message: "Logged in successfully",
          token: token,
          email: user.email,
        });
      } else {
        return Responses._200({
          success: false,
          message: "Invalid email or password.",
        });
      }
    })
    .catch((err) => {
      return Responses._500({
        success: false,
        message: "Error occured.",
        errors: err,
      });
    });
};
