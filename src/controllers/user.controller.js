import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

 const loggedInUser = await User.findById(user._id)
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
    .json( new ApiResponse(200, {}, "User lpgged outt"))
})


export {
  registerUser,
  logoutUser,
  loginUser
}