const express = require('express')
const { createPost, getAllPosts, getPost, deletePost } = require('../controllers/post-controller')
const {authenticateRequest} = require('../middleware/authMiddleware')

const router = express.Router()


//Global middleware -> to ascertain whether the user is authorized or not
router.use(authenticateRequest)

//Routes
router.post('/create-post', createPost)
router.get('/all-posts', getAllPosts)
router.get('/:id', getPost)
router.delete('/delete/:id', deletePost)



module.exports = router