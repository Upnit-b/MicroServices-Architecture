const logger = require('../utils/logger')
const {uploadMediaToCloudinary} = require('../utils/cloudinary')
const Media = require('../models/Media')

const uploadMedia = async(req, res) => {
  logger.info('Starting media upload...')

  try {
    //first check if the file for upload is present or not
    if(!req.file) {
      logger.error('No file found for upload. Please add file and try again')
      return res.status(400).json({
        success: false,
        message: 'No file found for upload. Please add file and try again',
      })
    }

    //if file is present
    const {originalname, mimetype, buffer} = req.file
    const userId = req.user

    logger.info(`File details: name=${originalname}, type=${mimetype}, userId=${userId}`)
    logger.info('Uploading to Cloudinary starting')

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file)
    logger.info(`Cloudinary upload successful. Public ID: ${cloudinaryUploadResult.public_id}`)
    logger.info(`Original Name: ${originalname}`)

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId: userId
    })

    await newlyCreatedMedia.save()

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      userId: userId,
      message: 'Media upload is successful'
    })


  } catch(error) {
    logger.error('Error creating media', error)
    res.status(500).json({
      success: false,
      message: 'Error creating media',
    })
  }
}

const getAllMedias = async(req, res) => {
  try{

    const results = await Media.find()
    res.json({results: results})

  } catch(e){
    logger.error('Error fetching medias', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching medias'
    })
  }
}

module.exports = {uploadMedia, getAllMedias}