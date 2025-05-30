const logger = require('../utils/logger')
const {validateCreatePost} = require('../utils/validation')
const Post = require('../models/Post')
const invalidatePostCache = require('../utils/invalidateCache')
const { publishEvent } = require('../utils/rabbitmq')

const createPost = async(req, res) => {
  logger.info('Create post endpoint hit...')
  // req.user is coming from authmiddleware

  try {
    //validate the schema
    const { error } = validateCreatePost(req.body)
    if (error) {
      logger.warn('Validation error', error.details[0].message)
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      })
    }
    const { content, mediaIds } = req.body
    const newlyCreatedPost = new Post({
      user: req.user,
      content,
      mediaIds: mediaIds || [],
    })

    await newlyCreatedPost.save()

    await publishEvent('post.created', {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    })

    await invalidatePostCache(req, newlyCreatedPost._id.toString())
    logger.info('Post created successfully', newlyCreatedPost)
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
    })
  } catch (error) {
    logger.error('Error creating post', error)
    res.status(500).json({
      success: false,
      message: 'Error creating post',
    })
  }
}



const getAllPosts = async(req, res) => {
  try {

    //pagination
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 3
    const startIndex = (page - 1) * limit

    //implement caching with redis
    const cacheKey = `post:${page}:${limit}`
    const cachedPosts = await req.redisClient.get(cacheKey)
    if(cachedPosts) {
      return res.json(JSON.parse(cachedPosts))
    }

    //if posts are not cached, then we have to query the database
    const posts = await Post.find().sort({createdAt: -1}).skip(startIndex).limit(limit)

    const totalPosts = await Post.countDocuments()

    //assemble data for client side for pagination
    const result = {
      posts: posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts: totalPosts
    }

    //save this in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result))

    res.json(result)


  } catch(error) {
    logger.error('Error getting all posts', error)
    res.status(500).json({
      success: false,
      message: 'Internal Server Error in getting all posts'
    })
  }
}


const getPost = async(req, res) => {
  try {
    const postId = req.params.id
    const cachekey = `post:${postId}`
    const cachedPost = await req.redisClient.get(cachekey)

    if(cachedPost) {
      return res.json(JSON.parse(cachedPost))
    }

    const singlePostDetailsById = await Post.findById(postId)

    if(!singlePostDetailsById) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      })
    }

    await req.redisClient.setex(cachedPost, 3600, JSON.stringify(singlePostDetailsById))

    res.json(singlePostDetailsById)


  } catch(error) {
    logger.error('Error getting the post by ID', error)
    res.status(500).json({
      success: false,
      message: 'Internal Server Error in getting the post by ID'
    })
  }
}


const deletePost = async(req, res) => {
  try {
    //only user should be able to delete the post
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user
    })

    if(!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      })
    }

    //publish post delete method for broadcasting
    await publishEvent('post.deleted', {
      postId: post._id.toString(),
      userId: req.user,
      mediaIds: post.mediaIds
    })

    await invalidatePostCache(req, req.params.id)
    res.json({
      success: true,
      message: 'Post deleted successfully'
    })
  } catch (error) {
    logger.error('Error in deleting post by ID', error)
    res.status(500).json({
      success: false,
      message: 'Internal Server Error in deleting the post by ID'
    })
  }
}

module.exports = { createPost, getAllPosts, getPost, deletePost }