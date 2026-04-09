import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadImage = async (
  base64Image: string,
  folder: string = 'complaints'
): Promise<string> => {
  const result = await cloudinary.uploader.upload(base64Image, {
    folder: `vaastio/${folder}`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  })
  return result.secure_url
}

export const uploadMultipleImages = async (
  base64Images: string[],
  folder: string = 'complaints'
): Promise<string[]> => {
  const uploads = await Promise.all(
    base64Images.map(img => uploadImage(img, folder))
  )
  return uploads
}