import { Router } from "express";
import {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} from "../controllers/like.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/video-like").post(verifyJWT, toggleVideoLike)
router.route("/comment-like").post(verifyJWT, toggleCommentLike)
router.route("/tweet-like").post(verifyJWT, toggleTweetLike)
router.route("/likedVideos").get(verifyJWT, getLikedVideos)

export default router