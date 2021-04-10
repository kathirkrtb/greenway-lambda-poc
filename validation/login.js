const Validator = require("validator");
//import bcryptjs to hash the password
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//const jwt secret
const JWT_SECRET = Buffer.from("GreenWay@123", "base64");

const isEmpty = require("./isEmpty");

const validateEmail = async (data) => {
  let errors = {};
  data.email = !isEmpty(data.email) ? data.email : "";
  data.password = !isEmpty(data.password) ? data.password : "";

  if (Validator.isEmpty(data.email)) {
    errors.email = "Email is required";
  }
  if (!Validator.isEmail(data.email)) {
    errors.email = "Email is invalid";
  }
  if (Validator.isEmpty(data.password)) {
    errors.password = "Password is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};

const signToken = async (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: 86400,
  });
};

const comparePassword = async (eventPassword, userPassword) => {
  return bcrypt
    .compare(eventPassword, userPassword)
    .then((passwordIsValid) => passwordIsValid);
};

module.exports = {
  validateEmail,
  signToken,
  comparePassword,
};
