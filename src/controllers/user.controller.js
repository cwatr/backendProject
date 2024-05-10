import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
    //console.log("request body: \n", req.body)
    
    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required!")
    }


    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(existingUser) throw new ApiError(409, "User with email or username already exists!");


    // console.log("req files \n", req.files)

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar[0].path){
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

    if(!avatar) throw new ApiError(400,"Couldn't upload avatar file on cloudinary")

   const user = await User.create({
        fullname,
        avatar: avatar.url,
        avatar_public_id: avatar.public_id,
        coverImage: coverImage?.url || "",
        coverImage_public_id: coverImage?.public_id || "",
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
    // console.log(req.body)
    
    if(!username && !email){
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
           $unset: {
                    refreshToken: 1 //this removes the field from the document
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
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new ApiError(401, "Unauthorized Request")
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
                  .status(200)
                  .cookie("accessToken", accessToken, options)
                  .cookie("refreshToken", newRefreshToken, options)
                  .json(
                    new ApiResponse(
                        200,
                        {accessToken, refreshToken:newRefreshToken},
                        "Access token refreshed successfully"
                    )
                  )
        
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid Refresh token")
    }
})

const changeCurrentPassword = asyncHandler( async (req,res) => {
    const {oldPassword, newPassword} = req.body

    if(!oldPassword || !newPassword){
        throw new ApiError(401, "All fields required")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")
    const checkPassword = await user.isPasswordCorrect(oldPassword)

    if(!checkPassword){
        throw new ApiError(401, "Invalid password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
              .json(new ApiResponse(
                200,
                {},
                "Password changed successfully"
              ))
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200)
              .json(new ApiError(
                200,
                req.user,
                "Current user fetched successfully"
              ))
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    const {fullname, email} = req.body
    if(!fullname || !email){
        throw new ApiError(401, "All fields required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname:fullname,
                email:email 
            }
        },
        {
            new:true
        }
    ).select("-password -responseToken")

    return res.status(200)
              .json(new ApiResponse(
                200,
                user,
                "Account details updated successfully"
              ))
})

const updateUserAvatar = asyncHandler( async (req,res) => {
    //TODO: make a function that deletes the old image from cloudinary - doneee
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const newAvatar = await uploadOnCloudinary(avatarLocalPath)

    if(!newAvatar.url){
        throw new ApiError(400,"Error while uploading avatar file")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")
    //console.log(user)
    const oldFilePublicId = user.avatar_public_id
    await deleteFromCloudinary(oldFilePublicId)
   // console.log("old avatar public id ", oldFilePublicId)

    user.avatar = newAvatar.url
    user.avatar_public_id = newAvatar.public_id
    await user.save({validateBeforeSave: false})

    //console.log(user.avatar)
    
    return res.status(200)
              .json(new ApiResponse(
                200, user, "Avatar updated successfully"
              ))
})

const updateUserCoverImage = asyncHandler( async (req,res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }
    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!newCoverImage.url){
        throw new ApiError(400,"Api error occured while uploading cover image file")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")

    if(user.coverImage){
        const oldFilePath = user.coverImage
        await deleteFromCloudinary(oldFilePath)
    }

    user.coverImage = newCoverImage
    await user.save({validateBeforeSave: false})

    return res.status(200)
              .json(new ApiResponse(
                200, user, "Cover Image updated successfully"
              ))
})


const getUserChannelProfile = asyncHandler( async (req,res) => {
    const {username } = req.params
    if(!username){
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField: "channel",
                as:"Subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"SubscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount: {
                    $size:"$Subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$SubscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                fullname:1,
                subscriberCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400,"User channel does not exist")
    }

    return res.status(200)
              .json(new ApiResponse(200,channel[0],"channel fetched successfully"))
})

const getUserWatchHistory = asyncHandler( async (req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(req.user?._id) //aggregate pipelines ka code directly mongodb par jaata
                                                                 // generally ._id returns a string which mongoose automatically changes in the required format of ObjectId(string) 
            }
        },
        {
            $lookup: {
                from: "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        },

                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
              .json(new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}