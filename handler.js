'use strict';
const AWS = require('aws-sdk');

//import email
const config= require("./config/aws_config");
AWS.config.update({ "accessKeyId": config.accessKeyId, "secretAccessKey": config.secretAccessKey, "region":config.region});


const s3 = new AWS.S3();
const dynamoClient = new AWS.DynamoDB.DocumentClient();

//import bcryptjs to hash the password
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//import validation
const validateEmail = require("./validation/login");
const User = require('./models/Users');
//import response component
const Responses = require("./common/Responses");
//import email
const notification= require("./common/Notifications");
//const jwt secret
const JWT_SECRET=Buffer.from("GreenWay@123", "base64");

//connect mongodb 
let cachedDb = null;

function connectToDatabase () {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }
  return mongoose.connect(config.MONGODB_URI)
    .then(db => { 
      cachedDb = db;
      return cachedDb;

    }).catch(err =>{
      console.log('connected db error',err);
    });
}


function generateAuthResponse(principalId, effect, methodArn) {
  const policyDocument = generatePolicyDocument(effect, methodArn);
  return {
    principalId,
    policyDocument
  };
}

function generatePolicyDocument(principalId,effect, resource) {
  const authResponse = {};

  authResponse.principalId = principalId;

  if (effect && resource) {

    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];

    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  return authResponse;

}

//verify token function

module.exports.verifyToken = (event, context,callback) => {

  const token = event.authorizationToken.replace("Bearer ", "");
  const methodArn = event.methodArn;

  if (!token || !methodArn) return callback(null, "Unauthorized");

  // verifies token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return callback(null, generatePolicyDocument('1234', "Deny", methodArn));

    if(decoded){
      let policy=generatePolicyDocument(decoded.id, 'Allow', methodArn);
      console.log('policy',policy);
      return callback(null,policy)
    }
    
  });


 
  // const decoded = jwt.verify(token, secret);

  // console.log('decoded',decoded);

  // if (decoded && decoded.id) {
  //   return callback(null, generateAuthResponse(decoded.id, "Allow", methodArn));
  // } else {
  //   return callback(null, generateAuthResponse('', "Deny", methodArn));
  // }

};


function base64MimeType(encoded) {

  let result = null;

  if (typeof encoded !== 'string') {
    return result;
  }
  const mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
  if (mime && mime.length) {
    result = mime[1];
  }
  return result;

}

function base64Data(str){
    return str.replace(/^data:.+;base64,/, "")
}

async function updateDynamoDb(user){

    let params=  {
      TableName : config.dynamoTableName, 
      Item: {
        'user_id':'U-'+user._id,
        'userId': user._id ,
        'id_card_type':"Aadhaar",
        'id_card_number':user.id_card_number,
        'created':new Date().getTime().toString()
      }
    }
    
    return dynamoClient.put(params).promise();
}


async function fileUpload(encoded,context){

  let mime=base64MimeType(encoded);
  let extn=mime.split('/')[1];
  let decoded=base64Data(encoded);
  const buffer = Buffer.from(decoded, 'base64');     
  const key = `${context.awsRequestId}-${Math.floor(Math.random() * 1111)}.${extn}`;

  await s3
    .putObject({
        Body: buffer,
        Key: key,
        ContentType: mime,
        Bucket: 'greenway-testing',
        ACL: 'public-read',
        ContentEncoding: 'base64',
    })
    .promise();

  const url = `https://greenway-testing.s3.amazonaws.com/${key}`;

  return url;

}


module.exports.create = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  const body = JSON.parse(event.body);  
  let imageUrl='';
  let pdfUrl='';

  if(body.photo){
    imageUrl=await fileUpload(body.photo,context);
  }

  if(body.id_card_pdf){
    pdfUrl=await fileUpload(body.id_card_pdf,context);
  }

  return connectToDatabase()
    .then(() =>

        //check user exists
        User.findOne({ email:body.email })

    )
    .then(async(user) => {

          if (!user) {
            return User.create(
              {
                name:body.name,
                email:body.email,
                id_card_number:body.id_card_number,
                id_card_type:body.id_card_type,
                mobile:body.phone_number,
                token_key:context.awsRequestId,
                photo:imageUrl,
                id_card_pdf:pdfUrl
              }
            ).then(async(userData)=>{
  
                //check the id card type update in the dynamo db
                if(userData.id_card_type === 'Aadhaar'){        
                  const dynamoDbResult= await updateDynamoDb(userData);
                }
  
                //send email to user
                const resEmail=await notification._sendEmail(userData)

                await notification._sendSms(userData) 
              
                return Responses._200({
                  success:true,
                  data:userData,
                  message: 'User created successfully',
                  mail:{
                    status:resEmail
                  }
                });  
  
            }).catch(err =>{ 
              return Responses._500(
                {
                  success:false,
                  message: 'Could not create user',
                  err,
                }
              );    
  
            });                    
      
          }else{

            return Responses._200(
              {
                success:false,
                message: 'User already exists',
                error: 'User already exists'
              }
            );

          }         

    })
    .catch(err =>{ 
        return Responses._500(
          {
            success:false,
            message: 'Could not load user',
            err,
          }
        );    

      }     
      
    );

};


//get single user
module.exports.getOne = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  return connectToDatabase()
  .then(() =>
    User.findById(event.pathParameters.id)
  )
  .then(async(user) => {
      return Responses._200({
        success:true,
        data:user
      });    
    }
  )
  .catch(err =>{  

      return Responses._500(
        {
          success:false,
          message:"Could not load user",
          errors:err
        }
      );  

    }     
    
  ); 

};


//get all the users 
module.exports.getAll = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  return connectToDatabase()
  .then(() =>
    User.find()
  )
  .then(async(users) => {
      return Responses._200({
        success:true,
        data:users
      });     

    }
  )
  .catch(err =>{
      return Responses._500(
        {
          success:false,
          message:"Could not load user",
          errors:err
        }
      );
    }    
    
  );  
};

module.exports.update = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  return connectToDatabase()
  .then(() =>
    User.findById(event.pathParameters.id)
  )
  .then(async(user) => {

      //check the user email exists
      const body = JSON.parse(event.body); 

      let uservalue=await User.findOne({ email:body.email });

      // console.log('uservalue',uservalue);
      // console.log('user',user);
      
      if(uservalue && uservalue._id != event.pathParameters.id){

        return Responses._200(
          {
            success:false,
            message: 'Email already exists to another user.',
            error: 'Email already exists to another user.'
          }
        );

      }

       
      let imageUrl='';
      let pdfUrl='';

      if(body.photo){
        imageUrl=await fileUpload(body.photo,context);
        user.photo=imageUrl;
      }

      if(body.id_card_pdf){
        pdfUrl=await fileUpload(body.id_card_pdf,context);
        user.id_card_pdf=pdfUrl;
      }

      //update the user details      

      user.name=body.name;
      user.email=body.email;
      user.id_card_number=body.id_card_number;
      user.id_card_type=body.id_card_type;
      user.mobile=body.phone_number;

      return user
      .save()
      .then(async(data) => {
          //check the doc type and update inthe dynamo db
          if(data.id_card_type === 'Aadhaar'){
             
            const dynamoDbResult= await updateDynamoDb(user);
            // console.log('dynamoDbResult',dynamoDbResult);

          }          

          return Responses._200(
            {
              success:true,
              message: 'User updated successfully'
            }
          ); 

      })
      .catch(err =>{       
          return Responses._500(
            {
              success:false,
              message: 'Could not update user',
              err
            }
          );        

      });     

    }
  )
  .catch(err =>{  

      return Responses._500(
        {
          success:false,
          message:"Could not load user",
          errors:err
        }
      );
       
    }     
  );
    
};

//delete the user

module.exports.delete = async(event, context) => {

    return connectToDatabase()
    .then(() =>
    User.findByIdAndRemove(event.pathParameters.id)
    )
    .then(user => {
      return Responses._200(
        {
          success:true,
          message:"User deleted successfully."
        }
      );

    })
    .catch(err => {
      return Responses._500(
        {
          success:false,
          message:"Could not delete user",
          errors:err
        }
      );

    });
};


//function to sign jwt token

function signToken(payload) {

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: 86400
  });

}

function comparePassword(eventPassword, userPassword) {
  return bcrypt.compare(eventPassword, userPassword)
    .then(passwordIsValid =>passwordIsValid);

}


module.exports.login = async(event,context,callback) => {

  let input=JSON.parse(event.body);

  const { errors, isValid } = validateEmail(input);

  
  if (!isValid) {
    return Responses._200(
      {
        success:false,
        message:"Invalid login crendentials"
      }
    );
  }

  const email = input.email;
  const password = input.password;

  return connectToDatabase()
    .then(() =>
      User.findOne({ email })
    )
    .then(async(user) => {

        if (!user) {
          errors.email = "User not found";
          return Responses._200(
            {
              success:false,
              message: 'User not found',
              error: 'User not found'
            }
          );         
    
        }

        const passwordMatch=await comparePassword(password,user.password);

      console.log('passwordMatch',passwordMatch);

      if(passwordMatch){
        const payload = {
          id: user._id,
          email: user.email,
          mobile: user.mobile
        };

        let token =signToken(payload);
        return Responses._200(
          {
            success:true,
            message: 'Logged in successfully',
            token:token,
            email: user.email
          }
        );
      }else {

        return Responses._200(
          {
            success:false,
            message: 'Invalid login details.'               
          }
        );       
          
      }

    })
    .catch(err =>{       
      
      return Responses._500(
        {
          success:false,
          message: 'Error occured.',
          errors:err
        }
      );        

    });

};


//function to update password

module.exports.password = (event,context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let input=JSON.parse(event.body);

  const token_key = input.token_key;
  const password = input.password;

  if (!password) {
    return Responses._200(
      {
        success:false,
        message: 'password required'
      }
    );

  }

  return connectToDatabase()
    .then(() =>
      User.findOne({ token_key })
    )
    .then(async(user) => {

        if (!user) {

          return Responses._200(
            {
              success:false,
              message: 'User not found',
            }
          );  
          
        }

        const hash=await bcrypt.hash(password, 8)

        console.log('hash',hash);

        if(hash){

          user.password=hash;
          user.token_key='';
          user.modified_date=new Date();

          return user
          .save()
          .then(data => {

              const payload = {
                id: data._id,
                email: data.email,
                mobile: data.mobile
              };

              let token =signToken(payload);
  
              return Responses._200(
                {
                  success:true,
                  message: 'Password updated successfully',
                  token:token,
                  email: data.email
                }
              ); 

          })
          .catch(err =>{        
              return Responses._500(
                {
                  success:false,
                  message: 'Could not update password',
                  err
                }
              );                   
  
          }     
          
        );

        }else{
          return Responses._500(
            {
              success:false,
              message: 'Could not update password',
              err
            }
          );
        }       

    })
    .catch(err =>{   
        return Responses._422(
          {
            message: 'Could not update password',
            errors:err
          }
        ); 
      }     
      
    );

    return;

};

