import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const video = await Video.findById(videoId)
    const user = await User.findById(req.user?._id)

    if(!video || !user){
        throw new ApiError(400, "Invalid like request")
    }

    const like = await Like.findOne({
        video: video,
        likedBy: user
    })

    if(like){
        await Like.deleteOne({
            video:video,
            likedBy: user
        })

        return res.status(200).json(
            new ApiResponse(200, true, "Video unliked successfully")
        ) 
    }

    const createdLike = await Like.create({
        video: video,
        likedBy: user
    })

    if(!createdLike) throw new ApiError(500, "Something went wrong while registering a video like")

    return res.status(200).json(
        new ApiResponse(200, createdLike, "Video liked successfully")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    
    const comment = await Comment.findById(commentId)
    const user = await User.findById(req.user?._id)

    if(!comment || !user){
        throw new ApiError(400, "Invalid like request")
    }

    const like = await Like.findOne({
        comment: comment,
        likedBy: user
    })

    if(like){
        await Like.deleteOne({
            comment:comment,
            likedBy: user
        })

        return res.status(200).json(
            new ApiResponse(200, true, "Comment unliked successfully")
        ) 
    }

    const createdCommentLike = await Like.create({
        comment: comment,
        likedBy: user
    })

    if(!createdCommentLike){
        throw new ApiError(500, "Something went wrong while registering a comment like")
    }

    return res.status(200).json(
        new ApiResponse(200, createdCommentLike, "Comment liked successfully")
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    const tweet = await Tweet.findById(tweetId)
    const user = await User.findById(req.user?._id)

    if(!tweet || !user){
        throw new ApiError(400, "Invalid like request")
    }

    const like = await Like.findOne({
        tweet: tweet,
        likedBy: user
    })

    if(like){
        await Like.deleteOne({
            tweet:tweet,
            likedBy: user
        })

        return res.status(200).json(
            new ApiResponse(200, true, "Video unliked successfully")
        ) 
    }

    const createdTweetLike = await Like({
        tweet: tweet,
        likedBy: user
    })

    if(!createdTweetLike) throw new ApiError(500, "Something went wrong while registering a tweet like")

    return res.status(200).json(
        new ApiResponse(200, createdTweetLike, "Tweet liked successfully")
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideos = await User.aggregate([
        {
            $match: {
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedBy",
                as: "videos"
            }
        },
        {
            $project:{
                video:1
            }
        }
    ]) 

    if(!likedVideos?.length) throw new ApiError(400, "No liked videos found!")

    return res.status(200).json(
        new ApiResponse(200,  likedVideos[0], "Liked videos fetched successfully!")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}