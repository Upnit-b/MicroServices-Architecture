const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
  token : {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {timestamps: true})



//for deleting document automatically when the token expires
//when a document's expiresAt time is reached, mongoDB's background process will automatically delete the document entry as the token will be deleted as well
refreshTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0})

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)
module.exports = RefreshToken