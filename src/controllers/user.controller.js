import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt  from "jsonwebtoken";
import { json } from "express";
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";
const generateAccessAndRefreshToken = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
   await user.save({validateBeforeSave: false})

   return {accessToken,refreshToken}

  } catch (error) {
    throw new ApiError(500,"something went wrong while generating access and refresh token")
  }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username , email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user obeject - create entry in db
    // remove password and refresh token feild from response
    // check for user creation 
    // return res
    
    const {fullName, email, username, password } = req.body
    console.log("email:>> ", email);

    // if(fullNmae === "") {
    //     throw new ApiError(400, "fullname is  required")
    // }
    
    // another method but same work 
    
    if(
         [fullName, email, username, password].some((field) => 
            field?.trim() === "")
    ) {
         // if true
         throw new ApiError(400,"all fields are required")
    }

   const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser) {
        throw new ApiError(409,"User with email or username already existsss")
    }
    // console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path // multer mai check karo ye sab multer ki bajha se hua hai
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;   // use another method because this method shows error if cover image not upload
    
    let coverImageLocalPath;
    if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
       coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }
    
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar) {
    throw new ApiError(400, "avatar is reqired..")
   }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
   })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "something went wrong while registering user ")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfullyyy")
  )

} )

const loginUser = asyncHandler(async(req, res) => {
   // req body -> se data leao
   // username or email
   // find the user
   // password check
   // access and refresh token
   // send cookie
   const {email, username, password} = req.body
   console.log("email isss: "+email)
   console.log("login successfully")

   if(!username && !email) {
    throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
       $or: [{username}, {email}]
   })
// console.log("email isss: "+user)
   if(!user){
    throw new ApiError(404, "user does not exist")
   };

   console.log("passworddd :"+ password)

  const isPasswordValid = await user.isPasswordCorrect(password);

   
    if(!isPasswordValid) {
   throw new ApiError(401,"Invalid user credentialsss")
 }

 const {accessToken,refreshToken} = await 
 generateAccessAndRefreshToken(user._id)

 const loggedInUser = await User.findById(user._id) // main yaha per await nhi lagaya tha us bajha se kafhi badi problem hui
 .select("-password -refreshToken")

 const options = {
   httpOnly: true,
   secure: true
 }

 return res
 .status(200)
 .cookie("accessToken", accessToken, options)
 .cookie("refreshToken", refreshToken,options)
 .json(
   new ApiResponse(
     200,
     {
       user: loggedInUser, accessToken , refreshToken
     },
     "user Logged In Successfullyy"
   )
 )
 
} )

const logoutUser = asyncHandler(async(req, res) => {
    
     User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: 1
        }
      },
      {
        new: true
      }
    )

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "User logged outt"))
} )

const refreshAccessToken = asyncHandler( async(req, res) => {
  
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
  
  if(!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

 try {
  const decodedToken = jwt.verify(incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
   )
 
  const user = User.findById(decodedToken?._id)
 
   if(!user) {
     throw new ApiError(401, "invalid refresh Token")
   }
 
   if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401, "refresh token is expired or usedd")
   }
 
   const options = {
     httpOnly: true,
     secure: true
   }
 
  const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", newRefreshToken, options)
  .json(
   new ApiResponse(
     200,
     { accessToken, refreshToken: newRefreshToken },
     "Access token refreshedd"
   )
  )
 } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
 }

} )

const changeCurrentPassword = asyncHandler( async(req, res) => {
   const{ oldPassword, newPassword} = req.body

console.log("old password :"+ oldPassword)

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword) 
  
  if(!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password")
  }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json( new ApiResponse(200, {}, "password changed successfuly"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(
    new ApiResponse(200, req.user, "current user fetched successfully")
  )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler( async(req, res) => {
  
  const avatarLocalPath = req.file?.path
  
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary
  (avatarLocalPath)

    if(!avatar){
    throw new ApiError(400, "Errorr while uploading on avatar")
  }
  const user1 = await User.findById(req.user._id)
  console.log(user1)
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
   ).select(" -password")

   return res
   .status(200)
   .json(
         new ApiResponse(200, user, "avatar image update successfully")
   )

})

const updateUserCoverImage = asyncHandler( async(req, res) => {
  
  const coverImageLocalPath = req.file?.path
  
  if(!coverImageLocalPath){
    throw new ApiError(400, "cover Image file is missing")
  }

  const coverImage = await uploadOnCloudinary
  (coverImageLocalPath)

    if(!coverImage.url){
    throw new ApiError(400, "Errorr while uploading on cover Image")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
   ).select(" -password")

   return res
   .status(200)
   .json(
    new ApiResponse(200, user, "Cover image updated successfully")
   )

})

const getUserChannelProfile = asyncHandler( async(req, res) => {
  const  {username} = req.params
console.log("username "+ username)
  if(!username?.trim()) {
    throw new ApiError(400, "username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
        $lookup: {
           from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
        }
    },
    {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers"
          },
          channelsSubscribedTocount: {
            $size: "$subscribedTo"
          },
          isSubscribed: {
            $cond: {
              if: {$in: [req.user?._id, "$subscribers.subscriber"]},
              then: true,
              else: false
            }
          }
        }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedTocount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      }
    }
  ])

  if(!channel?.length) {
    throw new ApiError(404, "channel does not exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "user channel fetch successfully")
  )
})

const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    const watchHistory = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $unwind: "$watchHistory",
      },
      {
        $sort: {
          "watchHistory.watchedAt": -1,
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory.video",
          foreignField: "_id",
          as: "video",
        },
      },
      {
        $unwind: "$video",
      },
      {
        $lookup: {
          from: "users",
          localField: "video.owner",
          foreignField: "_id",
          as: "ownerDetails",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          "video.ownerDetails": {
            $first: "$ownerDetails",
          },
          "video.watchedAt": "$watchHistory.watchedAt",
        },
      },
      {
        $project: {
          _id: 0,
          video: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, watchHistory, "Watch history fetched successfully")
      );
  } catch (error) {
    throw new ApiError(501, "Fetching watch history failed");
  }
});


export {
  registerUser,
  logoutUser,
  loginUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}