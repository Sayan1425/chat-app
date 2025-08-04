const twilio = require('twilio')

//form env 
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

//send otp to ph num
const sendOtpToNum = async (phoneNum) => {
  try {
    console.log('sending otp on', phoneNum);
    if(!phoneNum){
        throw new Error('invalid phone number');
    }
    const response = await client.verify.v2.services(serviceSid).verifications.create({
        to:phoneNum,
        channel:'sms'
    });
    return response;
  } catch (error) {
    console.error(error);
    throw new Error('failed to send otp')
  }
}

//verification 
const verifyOtp = async (phoneNum, otp) => {
  try {
    const response = await client.verify.v2.services(serviceSid).verificationChecks.create({
        to:phoneNum,
        code:otp
    });
    return response;
  } catch (error) {
    console.error(error);
    throw new Error('otp verification failed')
  }
}

module.exports = {
    sendOtpToNum,
    verifyOtp
}
