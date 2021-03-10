const AWS = require('aws-sdk');
var ses = new AWS.SES({ region: "us-east-1" });

const _sendEmail = async(data) =>{
    const name = data.name.substr(0, 40).replace(/[^\w\s]/g, '');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
        </head>
        <body>
          <p>Hi ${name},</p>
          <p>Please click here to update the password.</p>
          <a href="http://greenway-vue-poc.s3-website-us-east-1.amazonaws.com/password/${data.token_key}">Click here</a>
        </body>
      </html>
    `;

    const textBody = `
      Hi ${name},
      ...
    `;

    // Create sendEmail params
    const params = {
      Destination: {
        ToAddresses: [data.email]
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody
          },
          Text: {
            Charset: "UTF-8",
            Data: textBody
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Thanks for registering with GreenWay"
        }
      },
      Source: "GreenWay <angopensource@gmail.com>"
    };

    return ses.sendEmail(params).promise()

};

module.exports = {
    _sendEmail
};