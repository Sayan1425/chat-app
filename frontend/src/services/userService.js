import axiosInstance from "./urlService"

export const sendOtp = async ({ phoneNum, phoneSuffix, email }) => {
  try {
    const body = {};

    if (email) body.email = email;
    if (phoneNum && phoneSuffix) {
      body.phoneNum = phoneNum;
      body.phoneSuffix = phoneSuffix;
    }

    const response = await axiosInstance.post('/auth/send-otp', body);
    return response.data;
  } catch (error) {
    console.error("Send OTP error:", error);
    throw error.response ? error.response.data : error.message;
  }
};


export const verifyOtp = async (phoneNum, phoneSuffix, email, otp) => {
  try {
    const response = await axiosInstance.post('/auth/verify-otp', {phoneNum, phoneSuffix, email, otp})
    return response.data;
    console.log(" OTP verify response", response);
  } catch (error) {
    throw error.response ? error.response.data : error.message
  }
}

export const updateUserProfile = async (updatedData) => {
  try {
    const response = await axiosInstance.put('/auth/update-profile', updatedData)
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message
  }
}

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get('/auth/check-auth')
    if(response.data.status === "success"){
        return {isAuthenticated:true, user:response?.data?.data}
    }
    else if(response.data.status === "error"){
        return {isAuthenticated:false}
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message
  }
}

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.get('/auth/log-out')
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message
  }
}

export const getAllUser = async () => {
  try {
    const response = await axiosInstance.get('/auth/users')
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message
  }
}