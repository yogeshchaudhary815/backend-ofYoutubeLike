import {v2 as cloudinary} from "cloudinary"
import fs from "fs"



    // Configuration
cloudinary.config({ 
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
   api_key: process.env.CLOUDINARY_API_KEY, 
   api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});


// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload the file on cloudinary
      const response = await  cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        // console.log("file is uploaded on cloudinaryyy", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (fileId) => {
  // console.log(fileId)
  try {
    if (!fileId) return null;
    //delete the file on cloudinary
    const response = await cloudinary.uploader.destroy(fileId);
    if (response) fs.unlinkSync(fileId);
    console.log("try delete")
    return response;
  } catch (error) {
    // console.log("catch delete part")
    return null;
  }
};
    
export {uploadOnCloudinary, deleteFromCloudinary}
     