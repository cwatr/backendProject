import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    const comments = await Video.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(videoId) 
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },
        {$unwind: "$comments"},
        {$skip: (page-1)*10},
        {$limit: limit},
        {
            $project:{
                content:1,
                user:1
            }
        }
    ])

    return res.status(200)
                .json(new ApiResponse(200, comments, "comments fetched successfully"));
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {userId, videoId, content} = req.body;
    if(!userId || !videoId || !content){
        throw new ApiError(400, "All fields required to post a comment")
    }

    const user = await User.findById(userId).select("-password -refreshToken");
    const video = await Video.findById(videoId);

    const comment = await Comment.create({
        video,
        user,
        content
    })

    return res.status(200)
                .json(new ApiResponse(200, comment, "comment created succefully!"));
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId, newContent} = req.body;
    if(!commentId){
        throw new ApiError(400, "Error fetching comment");
    }

    if(!content){
        throw new ApiError(400, "Add content to update comment");
    }

    const newComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content:newContent
            }
        },
        {
            new: true
        }
    )

    return res.status(200)
                .json(new ApiResponse(200, newComment, "Comment updates successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params
    if(!commentId) throw new ApiError(400, "Comment not found");
    await Comment.findByIdAndDelete(commentId);

    return res.status(200)
                .json(new ApiResponse(200,true,'Comment deleted successfully'));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
}