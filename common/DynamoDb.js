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
    Item: {
      user_id: "U-" + data._id,
      userId: data._id,
      id_card_type: "Aadhaar",
      id_card_number: data.id_card_number,
      created: new Date().getTime().toString(),
    },
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
