import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    console.log("title =>>> "+ title)

   if(
         [title , description].some((field) => 
            field?.trim() === "")
    ) {
         // if true
         throw new ApiError(400,"title and description must required")
    }

    const localVideoPath = req.files.videoFile[0]?.path

    let localThumbnailPath;
    if( req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        localThumbnailPath = req.files.thumbnail[0].path
    }

    if(!localVideoPath){
        throw new ApiError(400," Video is required")
    }

    const videofile = await uploadOnCloudinary(localVideoPath)
    const thumbnail = await uploadOnCloudinary(localThumbnailPath)

    if(!videofile){
        throw new ApiError(400, "video is required")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videofile.url,
        thumbnail: thumbnail.url,
        duration: videofile.duration,
        isPublished: true,
        owner: req.user._id
    })

    if(!video){
        throw new ApiError(500, "failed to publish a Video")
    }

    return res
    .status(201)
    .json( new ApiResponse(201 , video, "Video Upload Successfully"))


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId?.trim()){
      throw new ApiError(400, "Video ID is missing");
    }

    if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoID");

    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
          isPublished: true 
        },
      },
      {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "video",
            as: "likes"
          },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
              }
            },
            {
              $addFields: {
                subscribersCount: {
                  $size: "$subscribers"
                },
              }
            },
            {
              $project: {
                username: 1,
                "avatar.url": 1,
                subscribersCount: 1,
                fullName: 1
              }
            }
          ]
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes"
          },
          isLiked: false,
        }
      },
      {
       $project: {
        "video.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
       }
      }
    ]);
   
    if(!video) throw new ApiError(404, "Video not found")

    return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video found"));  

});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
   const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const isValidUser = await Video.findById(videoId);

  if (!isValidUser) throw new ApiError(401, "Video cannot be found");
  if (
    [title, description].some(
      (field) => field === undefined || field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }
  
  if (isValidUser?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner"
    );
  }

const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: thumbnail.url,
        title: title,
        description: description
      }
    }
  ) 


  if (!video) throw new ApiError(501, "Updating Video failed");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}