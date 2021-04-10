const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const base64MimeType = () => {
  let result = null;

  if (typeof encoded !== "string") {
    return result;
  }
  const mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
  if (mime && mime.length) {
    result = mime[1];
  }
  return result;
};

const base64Data = (str) => {
  return str.replace(/^data:.+;base64,/, "");
};

const fileUpload = async (encoded, context) => {
  let mime = base64MimeType(encoded);
  let extn = mime.split("/")[1];
  let decoded = base64Data(encoded);
  const buffer = Buffer.from(decoded, "base64");
  const key = `${context.awsRequestId}-${Math.floor(
    Math.random() * 1111
  )}.${extn}`;

  await s3
    .putObject({
      Body: buffer,
      Key: key,
      ContentType: mime,
      Bucket: "greenway-testing",
      ACL: "public-read",
      ContentEncoding: "base64",
    })
    .promise();

  const url = `https://greenway-testing.s3.amazonaws.com/${key}`;

  return url;
};

module.exports = {
  fileUpload,
};
