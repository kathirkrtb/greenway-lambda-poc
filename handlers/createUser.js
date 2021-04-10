const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  region: config.region,
});

//import response component
const Responses = require("../common/Responses");
//import email
const notification = require("../common/Notifications");
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
  const body = JSON.parse(event.body);
  let imageUrl = "";
  let pdfUrl = "";

  if (body.photo) {
    imageUrl = await file.fileUpload(body.photo, context);
  }

  if (body.id_card_pdf) {
    pdfUrl = await file.fileUpload(body.id_card_pdf, context);
  }

  return db
    .connectToDatabase()
    .then(() =>
      //check user exists
      User.findOne({ email: body.email })
    )
    .then(async (user) => {
      if (!user) {
        return User.create({
          name: body.name,
          email: body.email,
          id_card_number: body.id_card_number,
          id_card_type: body.id_card_type,
          mobile: body.phone_number,
          token_key: context.awsRequestId,
          photo: imageUrl,
          id_card_pdf: pdfUrl,
        })
          .then(async (userData) => {
            //check the id card type update in the dynamo db
            if (userData.id_card_type === "Aadhaar") {
              const dynamoDbResult = await dynamo.write(userData);
            }

            //send email to user
            const resEmail = await notification._sendEmail(userData);

            await notification._sendSms(userData);

            return Responses._200({
              success: true,
              data: userData,
              message: "User created successfully",
              mail: {
                status: resEmail,
              },
            });
          })
          .catch((err) => {
            return Responses._500({
              success: false,
              message: "Could not create user",
              err,
            });
          });
      } else {
        return Responses._200({
          success: false,
          message: "User already exists",
          error: "User already exists",
        });
      }
    })
    .catch((err) => {
      return Responses._500({
        success: false,
        message: "Could not load user",
        err,
      });
    });
};
