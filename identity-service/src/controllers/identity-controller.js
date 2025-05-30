const logger = require('../utils/logger')
const {validateRegistration, validateLogin} = require('../utils/validation')
const User = require('../models/User')
const generateTokens = require('../utils/generateToken')
const RefreshToken = require('../models/RefreshToken')

//user registration
const registerUser = async(req, res) => {

  logger.info('Registration endpoint hit')

  try {
    //validate the schema
    const {error} = validateRegistration(req.body)
    if(error) {
      logger.warn('Validation Error', error.details[0].message)
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      })
    }

    const {email, password, username} = req.body
    let user = await User.findOne({ $or : [{email}, {username}]})

    if (user) {
      logger.warn("User already exists")
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      })
    }

    user = new User({username: username, email: email, password: password})

    await user.save()
    logger.warn('User saved successfully', user._id)

    const {accessToken, refreshToken} = await generateTokens(user)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken: accessToken,
      refreshToken: refreshToken
    })

  } catch (e) {
    logger.error('Registration error occured', e)
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    })
  }
}

//user login
const loginUser = async(req, res) => {
  logger.info('Login endpoint hit...')
  try {

    const {error} = validateLogin(req.body)
    if (error) {
      logger.warn("Validation Error in Login", error.details[0].message)
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      })
    }

    const {email, password} = req.body
    const user = await User.findOne({email: email})

    if(!user) {
      logger.warn('Invalid User')
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials"
      })
    }

    //valid password
    const isValidPassword = await user.comparePassword(password)
    if(!isValidPassword) {
      logger.warn('Invalid Password')
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      })
    }

    const {accessToken, refreshToken} = await generateTokens(user)
    logger.warn('User logged in successfully', user._id)

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: user._id
    })

  } catch(error) {
    logger.error('Login error occured', error)
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    })
  }
}


//refresh token
const refreshTokenUser = async(req, res) => {
  logger.info('Refresh Token endpoint hit...')
  try {
    //get the refreshToken from req body
    const {refreshToken} = req.body

    //check if refreshToken is not there
    if(!refreshToken) {
      logger.warn('Refresh Token missing')
      return res.status(400).json({
        success: false,
        message: 'Refresh Token missing'
      })
    }

    //retrieve the storedToken in RefreshToken model
    const storedToken = await RefreshToken.findOne({token:refreshToken})

    //check if there is no stored token or if stored token has expired
    if(!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn('Invalid or expired Refresh Token')
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Refresh Token'
      })
    }

    //retrieve the user from the model
    const user = await User.findById(storedToken.user)

    //check if there is no user
    if (!user) {
      logger.warn('User not found')
      return res.status(401).json({
        success: false,
        message: 'User not found'
      })
    }

    //generate the new tokens
    const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateTokens(user)

    //delete the old refresh token
    await RefreshToken.deleteOne({_id: storedToken._id})

    res.status(201).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })

  } catch (error) {
    logger.error("Refresh Token Error occured", error)
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    })
  }
}

//logout
const logoutUser = async(req, res) => {
  logger.info('Logout endpoint hit...')
  try {
    //To logout, first refresh token has to be deleted
    const {refreshToken} = req.body
    if(!refreshToken) {
      logger.warn('Refresh Token missing')
      return res.status(400).json({
        success: false,
        message: 'Refresh token missing'
      })
    }

    await RefreshToken.deleteOne({token:refreshToken})
    logger.info('Refresh token deleted for logout')

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    })

  } catch (error) {
    logger.error('Logout error occured', error)
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    })
  }
}


module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser }