import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens!")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //get user details from frontend
    //validation - not empty
    //check if user already exists: username, email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object in db
    //check for user creation
    //remove password and refresh tokens from response
    //return res


    const {fullname, email, username, password} = req.body
   // console.log("request body: \n", req.body)
    
    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required!")
    }


    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(existingUser) throw new ApiError(409, "User with email or username already exists!");


    //console.log("req files \n", req.files)

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path
    }
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
   // const avatarLocalPath = req.files?.avatar[0]?.path   //first property gives an object jisse hum path le sakte uska
   // const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath) throw new ApiError(400,"Avatar file is required")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400,"Avatar file is required")

   const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser) throw new ApiError(500, "Something went wrong while registering a user");


   return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
   )


})

const loginUser = asyncHandler( async (req,res) => {
    //req body -> data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookie

    const {username, email, password} = req.body
    
    if(!username || !email){
        throw new ApiError(400, "username or password required")
    }
    
    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

   const checkPassword = await user.isPasswordCorrect(password)

   if(!checkPassword){
        throw new ApiError(401, "Invalid user credentials")
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

   const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken",refreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user:loggedinUser, accessToken, refreshToken
                    },
                    "User logged in successfully"
                )
            )
})

const logoutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
           $set: {
                    refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookies("accessToken", options)
    .clearCookies("refreshToken",options)
    .json(200,{},"User logged out")
})

export {
    registerUser,
    loginUser,
    logoutUser
}