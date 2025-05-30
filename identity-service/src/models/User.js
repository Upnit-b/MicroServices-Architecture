const mongoose = require('mongoose')
const argon2 = require('argon2')

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {timestamps: true})

//mongoose middleware -> this will fire when creating a new password or updating a password
userSchema.pre('save', async function(next) {
  if(this.isModified('password')) {
    try {
      this.password = await argon2.hash(this.password)
    } catch(error) {
      return next(error)
    }
  }
})


//adds a new method comparePassword to all User model instances
//methods make it available on document instances
//returns true if passwords match
//timing attack protection -> argon2 compares password in constant time
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword)
  } catch(error) {
    throw error
  }
}


//this is indexing for searching the username by text faster
//to search, we can do the following
// Case-insensitive search for usernames containing "john"
// const users = await User.find({
//   $text: { $search: "john" }
// });
userSchema.index({username: 'text'})

const User = mongoose.model('User', userSchema)

module.exports = User