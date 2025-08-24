import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

})

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  if (!content) throw new ApiError(404, "Comment content is required");
  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video not found");
  const comment = await Comment.create({
    video: videoId,
    content,
    owner: req.user._id,
  });

  if (!comment) throw new ApiError(500, "Error adding comment");

  return res.status(200).json(new ApiResponse(200, content, "Comment added"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

   const { commentId } = req.params
   const { content } = req.body

   if(!content) throw new ApiError(404," update comment is required")

  const comment = await Comment.findById(commentId)

  if(!comment) throw new ApiError(404, "Comment is not found")
console.log(comment)
  if(comment.owner.toString() !== req.user?._id.toString()){
    throw new ApiError(400, "you can't edit this comment and you are owner of this comment")
  }

    comment.content = content 

    await comment.save( { validateBeforeSave: false } )

    return res
    .status(200)
    .json( new ApiResponse(200, comment , "comment edit successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if(!comment) throw new ApiError(400, "comment is not found")

    if( comment.owner.toString !== req.user._id.toString){
      throw new ApiError(400, "you can't delete comment and you are not owner of this comment")
    }

    await Comment.deleteOne( { _id: commentId})

    return res
    .status(200)
    .json(new ApiResponse(200, null , "comment is successfully deleted"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }