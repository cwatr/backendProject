import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })

        //file has been uploaded successfully on cloudinary 
        //console.log("File has been uploaded ", response.url);
        fs.unlinkSync(localFilePath)
        //console.log("cloudinary response \n",response)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (imageLink) => {
    try {
       // console.log("image link : ", imageLink)
        if(imageLink){
            const response = await cloudinary.uploader.destroy(imageLink, {
                resource_type: "image"
            })
           // console.log("image deleted successfully")
        }

    } catch (error) {
        console.log("Error occured while deleting an image from cloudinary \n ", error)
        return null;
    }
}


export {uploadOnCloudinary, deleteFromCloudinary}