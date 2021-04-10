//import response component
const Responses = require("../common/Responses");
const jwt = require("jsonwebtoken");

const JWT_SECRET_KEY = Buffer.from("GreenWay@123", "base64");

const generatePolicy = ({ allow }) => {
  return {
    principalId: "token",
    policyDocument: {
      Version: "2012-10-17",
      Statement: {
        Action: "execute-api:Invoke",
        Effect: allow ? "Allow" : "Deny",
        Resource: "*",
      },
    },
  };
};

exports.handler = async (event, context) => {
  const token = event.authorizationToken.replace("Bearer ", "");
  const methodArn = event.methodArn;

  if (!token || !methodArn) return callback(null, "Unauthorized");

  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) return generatePolicy({ allow: false });

    if (decoded) {
      return generatePolicy({ allow: true });
    }
  });
};
