const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');


var UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"]
  },
  mobile: {
    type: String,
    required: [true, "Mobile number is required"]
  },
  email: {
    type: String,
    required: [true, "Subcategory name is required"]
  },
  password: {
    type: String
  },
  photo: {
    type: String
  },
  id_card_type: {
    type: String,
    required: [true, "ID card type is required"]
  },
  id_card_number: {
    type: String,
    required: [true, "ID card number is required"]
  },
  id_card_pdf: {
    type: String
  },  
  token_key: {
    type: String
  }, 
  modified_date: {
    type: Date
  },
  // is_active: {
  //   type: Boolean,
  //   default: 1
  // }
});

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("user", UserSchema);