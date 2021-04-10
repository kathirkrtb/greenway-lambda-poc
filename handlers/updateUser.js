const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  region: config.region,
});

//import response component
const Responses = require("../common/Responses");
//import db
const db = require("../common/Db");
//import dynamo
const dynamo = require("../common/DynamoDb");
//import dynamo
const file = require("../common/FileUpload");
//load models
const User = require("../models/Users");

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return db
    .connectToDatabase()
    .then(() => User.findById(event.pathParameters.id))
    .then(async (user) => {
      //check the user email exists
      const body = JSON.parse(event.body);

      let uservalue = await User.findOne({ email: body.email });

      // console.log('uservalue',uservalue);
      // console.log('user',user);

      if (uservalue && uservalue._id != event.pathParameters.id) {
        return Responses._200({
          success: false,
          message: "Email already exists to another user.",
          error: "Email already exists to another user.",
        });
      }

      let imageUrl = "";
      let pdfUrl = "";

      if (body.photo) {
        imageUrl = await file.fileUpload(body.photo, context);
        user.photo = imageUrl;
      }

      if (body.id_card_pdf) {
        pdfUrl = await file.fileUpload(body.id_card_pdf, context);
        user.id_card_pdf = pdfUrl;
      }

      //update the user details

      user.name = body.name;
      user.email = body.email;
      user.id_card_number = body.id_card_number;
      user.id_card_type = body.id_card_type;
      user.mobile = body.phone_number;

      return user
        .save()
        .then(async (data) => {
          //check the doc type and update inthe dynamo db
          if (data.id_card_type === "Aadhaar") {
            const dynamoDbResult = dynamo.write(user, config.dynamoTableName);
            // console.log('dynamoDbResult',dynamoDbResult);
          }

          return Responses._200({
            success: true,
            message: "User updated successfully",
          });
        })
        .catch((err) => {
          return Responses._500({
            success: false,
            message: "Could not update user",
            err,
          });
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
