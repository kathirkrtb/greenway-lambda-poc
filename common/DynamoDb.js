const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  region: config.region,
});

const documentClient = new AWS.DynamoDB.DocumentClient();

const write = async (data, TableName) => {
  const params = {
    TableName,
    Item: data,
  };

  const res = await documentClient.put(params).promise();

  if (!res) {
    throw Error(
      `There was an error inserting ID of ${data.ID} in table ${TableName}`
    );
  }

  return data;
};

module.exports = {
  write,
};
