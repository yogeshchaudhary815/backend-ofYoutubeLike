import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


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
    console.log("email: ", email);

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

export {registerUser}