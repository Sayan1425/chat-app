import React, { use, useState } from 'react'
import loginStore from '../../store/loginStore'
import countries from '../../utils/countries'
import * as yup from 'yup'
import { yupResolver } from "@hookform/resolvers/yup"
import { data, useNavigate } from 'react-router-dom'
import userStore from '../../store/userStore'
import { useForm } from 'react-hook-form'
import themeStore from '../../store/themeStore'
import { motion } from 'framer-motion'
import { FaArrowLeft, FaChevronDown, FaUser, FaWhatsapp } from "react-icons/fa";
import Spinner from '../../utils/Spinner'
import { sendOtp, updateUserProfile, verifyOtp } from '../../services/userService'

//validation schema 
const loginValidSchema = yup
    .object()
    .shape({
        phoneNum: yup.string().nullable().notRequired().matches(/^\d+$/, "phone number must be digits").transform((value, originalValue) =>
            originalValue.trim() === "" ? null : value
        ),
        email: yup.string().nullable().notRequired().email("Please enter a vaild email").transform((value, originalValue) =>
            originalValue.trim() === "" ? null : value
        )
    }).test(
        "at-least-one",
        "Either phone number or email is required",
        function (value) {
            return !!(value.phoneNum || value.email)
        })

const otpValidSchema = yup.object().shape({
    otp: yup.string().length(6, "otp must be exactly in 6 digits").required("otp is required")
})

const profileValidSchema = yup.object().shape({
    username: yup.string().required("username is required"),
    agreed: yup.bool().oneOf([true], "You must agree to this terms")
})

const avatars = [
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
]

const Login = () => {
    const { step, setStep, userPhonedata, setUserPhoneData, resetLoginState } = loginStore();
    const [phoneNum, setPhoneNum] = useState("")
    const [selectedCountry, setSelectedCountry] = useState(countries[0])
    const [dialCode, setDialCode] = useState('');
    const [otp, setOtp] = useState(["", "", "", "", "", ""])
    const [email, setEmail] = useState("")
    const [profilePic, setProfilePic] = useState(null)
    const [selectedAvatar, setSelectedAvatar] = useState(avatars[0])
    const [profilePicFile, setProfilePicFile] = useState(null)
    const [error, setError] = useState("")
    const [showDropDown, setShowDropDown] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const navigate = useNavigate()
    const { setUser } = userStore()
    const { theme, setTheme } = themeStore()
    const [loading, setLoading] = useState(false)

    const {
        register: loginRegister,
        handleSubmit: handleLoginSubmit,
        formState: { errors: loginErrors }
    } = useForm({
        resolver: yupResolver(loginValidSchema)
    })

    const {
        handleSubmit: handleOtpSubmit,
        formState: { errors: otpErrors },
        setValue: setOtpValue
    } = useForm({
        resolver: yupResolver(otpValidSchema)
    })

    const {
        register: profileRegister,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
        watch
    } = useForm({
        resolver: yupResolver(profileValidSchema)
    });

    const filterCountries = countries.filter(
        (country) => country.name.toLowerCase().includes(searchTerm.toLowerCase()) || country.dialCode.includes(searchTerm)
    )

    const onLoginSubmit = async (data) => {
      try {
        setLoading(true)
        if(email){
            const response = await sendOtp(null, null, email)
            if(response.status  === 'success'){
                toast.info("OTP is sent to your email")
                setUserPhoneData({email})
                setStep(2)
            } 
        }
        else{
            const response = await sendOtp(phoneNum, selectedCountry, dialCode)
            if(response.status  === 'success'){
                toast.info("OTP is sent to your phone number")
                setUserPhoneData({phoneNum, phoneSuffix:selectedCountry.dialCode})
                setStep(2)
            } 
        }
      } catch (error) {
        console.log(error)
        setError(error.message || "Failed to send OTP")
      }finally{
        setLoading(false)
      }
    }
    
    const onOtpSubmit = async () => {
      try {
        setLoading(true)
        if(!userPhonedata){
            throw new Error("phone or email data is missing")
        }
        const otpString = otp.join("");
        let response;
        if(userPhonedata?.email){
            response = await verifyOtp(null,null,otpString,userPhonedata.email)
        }
        else{
            response = await verifyOtp(userPhonedata.phoneNum, userPhonedata.phoneSuffix, otpString)
        }
        if(response.status === 'success'){
            toast.success("OTP verify successfully")
            const user = response.data?.user
            if(user?.username && user?.profilePic){
                setUser(user)
                toast.success("Welcome back to Whatsapp")
                navigate('/')
                resetLoginState()
            }
            else{
                setStep(3);
            }
        }
      } catch (error) {
            console.log(error)
            setError(error.message || "Failed to verify OTP")
      }finally{
        setLoading(false)
      }
    }

    const handleChange = (e) =>{
        const file = e.target.files[0]
        if(file){
            setProfilePicFile(file)
            setProfilePic(URL.createObjectURL(file))
        }
    }

    const onProfileSubmit = async (data) => {
      try {
        setLoading(true)
        const formData = new FormData()
        formData.append("username", data.username)
        formData.append("agreed", data.agreed)
        if(profilePicFile){
            formData.append("media", profilePicFile)
        }
        else{
            formData.append("profilePic", selectedAvatar)
        }
        await updateUserProfile(formData)
        toast.success("Welcome back to Whatsapp")
        navigate('/')
        resetLoginState()
      } catch (error) {
            console.log(error)
            setError(error.message || "Failed to update user profile")
      }finally{
        setLoading(false)
      }
    }
    
    const handleOtpChange = (index, value) => {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      setOtpValue("otp", newOtp.join(""))
      if(value && index <5){
        document.getElementById(`otp-${index +1}`).focus()
      }
    }
      
    const handleBack = () => {
      setStep(1)
      setUserPhoneData(null)
      setOtp(["","","","","",""])
      setError("")
    }
    

    const ProgressBar = () => (
        <div className={`w-full rounded-full h-2.5 mb-6 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
            <div className="bg-green-500 h-2.5 rounded-full transition-all ease-in-out" style={{ width: `${(step / 3) * 100}%` }}>

            </div>
        </div>
    )

    return (
        <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900" : "bg-gradient-to-br from-green-500 to-blue-500"} flex justify-center items-center p-4 overflow-hidden`}>
            <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`${theme === 'dark' ? "bg-gray-800 text-white" : "bg-white"} p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}>

            <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            className='w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex justify-center items-center'>
                <FaWhatsapp className="w-16 h-16 text-white" />
            </motion.div>
                <h1 className={`text-3xl font-bold text-center mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                    Whatsapp Login
                </h1>
                <ProgressBar />

                {error && <p className=' text-red-500 text-center mb-4'> {error}</p>}
                {/* step 1 */}
                {step === 1 && (
                    <form className='space-y-4' onSubmit={handleLoginSubmit(onLoginSubmit)}>
                    <p className={` text-center mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Enter your number to receive an otp
                    </p>
                    <div className="relative">
                        <div className="flex">
                            <div className="relative w-1/3">
                                <button type='button' className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${theme === 'dark' ? "text-white bg-gray-700 border-gray-600" : "text-gray-900 bg-gray-100 border-gray-300"} border rounded-s-lg hover:bg-gray-200 focus:right-4 focus:outline-none focus:ring-gray-100 `} onClick={() => setShowDropDown(!showDropDown)}>
                                <span>
                                    {selectedCountry.flag} {selectedCountry.dialCode}
                                </span>
                                <FaChevronDown className='ml-2' />
                                </button>
                                {showDropDown && (
                                <div className={`absolute z-10 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-auto ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} `}>
                                        <div className={`sticky top-0 p-2 ${theme === "dark" ? "bg-gray-700" : "bg-white"}`}>
                                        <input type="text" placeholder='Search country' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full py-1 px-2 border ${theme === "dark" ? "bg-gray-600 text-white border-gray-500" : "bg-white border-gray-300"} rounded-md text-sm focus:outline-none focus:ring-green-500`} />
                                        </div>
                                        {filterCountries.map((country) => (
                                        <button key={country.alpha2} type='button' className={`w-full text-left px-3 py-2 ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} focus:outline-none focus:bg-gray-100`}
                                        onClick={() => {
                                        setSelectedCountry(country)
                                        setShowDropDown(false)
                                        }}>
                                        {country.flag} ({country.dialCode}) {country.name}
                                        </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input type="text" {...loginRegister("phoneNum")} value={phoneNum} onChange={(e) => setPhoneNum(e.target.value)}
                                    className={`w-2/3 px-4 py-2 border rounded-md focus:outline-none focus:ring-green-500 ${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white border-gray-300"} ${loginErrors.phoneNum ? "border-red-500" : ""}`} placeholder='Enter Phone Number' />
                            </div>
                            {loginErrors.phoneNum && (
                                <p className='text-red-500 text-sm'>{loginErrors.phoneNum.message}</p>
                            )}
                        </div>

                        {/* OR border b/w phone num and email holder */}
                        <div className="flex items-center my-4">
                            <div className="flex-grow h-px bg-gray-300" />
                            <span className='mx-3 text-gray-500 text-sm font-medium'>Or</span>
                            <div className="flex-grow h-px bg-gray-300" />
                        </div>
                        {/* email box */}
                        <div className={`flex items-center border rounded-md px-3 py-2 ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}>
                            <FaUser className={`mr-2 text-gray-900 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />

                            <input type="email" {...loginRegister("email")} value={email} onChange={(e) => setEmail(e.target.value)}
                            className={`w-full ml-2 px-4 py-2 border rounded-md focus:outline-none ${theme === "dark" ?  "text-white" : "text-black"} ${loginErrors.email ? "border-red-500" : ""} bg-transparent`} placeholder='Enter email(optional)' />

                            {loginErrors.email && (
                                <p className='text-red-500 text-sm'>{loginErrors.email.message}</p>
                            )}
                        </div>
                        <button type='submit' className='w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-600 transition'> 
                            {loading ? <Spinner/> : "Send OTP"}
                        </button>
                    </form>
                )}

                {/* step 2 */}
                {step === 2 && (
                    <form onSubmit={handleOtpSubmit(onOtpSubmit)}
                    className='space-y-4'>
                        <p className= {`text-center mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}> Please enter the 6-digit OTP {userPhonedata ? userPhonedata.phoneSuffix : "Email"} {" "} {userPhonedata.phoneNum && userPhonedata?.phoneNum} </p>

                        <div className="flex justify-between">
                             {otp.map((digit,index) =>(
                                <input key={index}
                                id={`otp-${index}`}
                                type='text'
                                maxLength={1}
                                value ={digit}
                                onChange={(e)=>handleOtpChange(index, e.target.value)}
                                className={`w-12 h-12 text-center border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${otpErrors.otp ? "border-red-500" : ""}`}></input>
                             ))}
                        </div>
                        {otpErrors.otp && (
                                <p className='text-red-500 text-sm'>{otpErrors.otp.message}
                                </p>
                            )}
                             <button type='submit' className='w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-600 transition'> 
                            {loading ? <Spinner/> : "Verify OTP"}
                        </button>
                        <button type='button' onClick={handleBack} className={` flex items-center justify-center w-full mt-2 ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"} py-2 rounded-md hover:bg-gray-400`}>
                            <FaArrowLeft className='mr-2'/>
                            Go back to previous step
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    )
}

export default Login
