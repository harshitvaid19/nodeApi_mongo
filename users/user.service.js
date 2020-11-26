const config = require('config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('_helpers/db');

require('dotenv').config();
const User = db.User;

module.exports = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    verifyOTP,
    registerDetails,
};

async function authenticate({ phone, password }) {
    const user = await User.findOne({ phone });
    if (user && bcrypt.compareSync(password, user.hash)) {
        const { hash, ...userWithoutHash } = user.toObject();
        const token = jwt.sign({ sub: user.id }, config.secret);
        return {
            ...userWithoutHash,
            token
        };
    }
}

async function getAll() {
    return await User.find().select('-hash');
}

async function getById(id) {
    return await User.findById(id).select('-hash');
}

async function create(userParam) {
    // validate
    let userCheck = await User.findOne({ phone: userParam.phone}).select('-hash');
    console.log(userCheck);
    if (userCheck && userCheck.verified && userCheck.verified == 'success' && !userCheck.expireAt ) {
        throw 'Phone "' + userParam.phone + '" is already taken';
    }else if (userCheck && userCheck.verified && userCheck.verified == 'success') {
      const token = jwt.sign({ sub: userCheck._id }, config.secret);
      return {tokenNum:token, message:"Already Verified"};
    }

    const user = new User(userParam);
    let genOTP = generateOTP();
    const client = require('twilio')(process.env.twillioAccountSid, process.env.twillioauthToken);
    return await client.messages.create({
        body: 'Here is the OTP :'+genOTP,
        to: userParam.countryCode+userParam.phone,  // Text this number
        from: '+16033266644' // From a valid Twilio number
    })
    .then((messages) => {

      if( userCheck && !userCheck.verified){
        userCheck.otp = genOTP;
        userCheck.expireAt = Date.now();
        userCheck.save();
        const token = jwt.sign({ sub: userCheck._id }, config.secret);
        return {tokenNum:token, message:"OTP sent successfully"}
      }else{
        user.otp = genOTP;
        user.expireAt = Date.now();
        user.save();
        const token = jwt.sign({ sub: user._id }, config.secret);
        return {tokenNum:token, message:"OTP sent successfully"}
      }

    })
    .catch((error)=>{
      console.log(error);
      throw 'Registration failed, Please try again later.';
    });

}

async function verifyOTP(userOTP, userID){

  if(!userOTP.otp){
    throw 'OTP not found';
  }

  const user = await User.findById(userID);
  if(user.verified && user.verified == "success"){
    throw 'Phone already verified';
  }

  if(user.otp == userOTP.otp){
    userOTP.verified = "success";
    user.set('otp', undefined, {strict: false} );
    Object.assign(user,userOTP);
    user.save();
    return "Success"
  }else{
    throw 'Invalid OTP';
  }
}

function generateOTP() {

    // Declare a string variable
    // which stores all string
    var string = '0123456789';
    let OTP = '';

    // Find the length of string
    var len = 10;
    for (let i = 0; i < 6; i++ ) {
        OTP += string[Math.floor(Math.random() * len)];
    }
    return OTP;
}

async function registerDetails(id, userParam) {
    const user = await User.findById(id);

    // validate
    if (!user) throw 'User not found';
    if (user.email !== userParam.email && await User.findOne({ email: userParam.email })) {
        throw 'Email "' + userParam.email + '" is already taken';
    }

    // hash password if it was entered
    if (userParam.password) {
        userParam.hash = bcrypt.hashSync(userParam.password, 10);
    }

    user.set('expireAt', undefined, {strict: false} );

    // copy userParam properties to user
    Object.assign(user, userParam);

    await user.save();
}

async function update(id, userParam) {
    const user = await User.findById(id);

    // validate
    if (!user) throw 'User not found';
    if (user.email !== userParam.email && await User.findOne({ email: userParam.email })) {
        throw 'Email "' + userParam.email + '" is already taken';
    }

    // hash password if it was entered
    if (userParam.password) {
        userParam.hash = bcrypt.hashSync(userParam.password, 10);
    }

    user.set('expireAt', undefined, {strict: false} );

    // copy userParam properties to user
    Object.assign(user, userParam);

    await user.save();
}

async function _delete(id) {
    await User.findByIdAndRemove(id);
}
