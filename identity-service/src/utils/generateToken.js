const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const RefreshToken = require('../models/RefreshToken')

const generateTokens = async(user) => {
  const accessToken = jwt.sign({
    userId: user._id,
    username: user.username
  }, process.env.JWT_SECRET,{expiresIn: '15m'})

  //refreshToken for staying logged in the app after 15 min expiration of access token
  const refreshToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // refresh token expires in 7 days

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt: expiresAt
  })

  return {accessToken, refreshToken}
}

module.exports = generateTokens