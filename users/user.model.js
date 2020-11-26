const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    email: { type: String},
    hash: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    emailVerified: { type: String },
    verified: { type: String },
    otp: { type: String },
    gender: { type: String },
    countryCode: { type: String },
    phone: { type: String, required: true },
    expireAt: {
      type: Date,
      index: { expires: '10m' },
    }
},{
  timestamps: true
});

schema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', schema);
