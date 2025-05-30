require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const Redis = require('ioredis')
const cors = require('cors')
const helmet = require('helmet')
const postRoutes = require('./routes/post-routes')
const errorHandler = require('./middleware/errorHandler')
const logger = require('./utils/logger')
const {rateLimit} = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis');
const {connectToRabbitMQ} = require('./utils/rabbitmq');


const app = express()
const PORT = process.env.PORT || 3002

//database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => logger.info('Connected to MongoDB'))
.catch((e) => logger.error("Mongo connection error", e))

//Redis server
const redisClient = new Redis(process.env.REDIS_URL)

//MIDDLEWARE
//middleware for header security
app.use(helmet())

//middleware for cross origin security
app.use(cors())

//middleware for parsing request body
app.use(express.json())

//logging info
app.use((req,res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`)
  logger.info(`Request body, ${req.body}`)
  next()
})

//IP based rate limiting for create post endpoint
const createPostEndpointLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, //10 mins
  max: 100, //Max Limit each IP has per 10 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Create-Post endpoint rate limit excceeded for IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Too many requests'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})

//IP based rate limiting for create post endpoint
const GetAllPostsEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 mins
  max: 100, //Max Limit each IP has per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Create-Post endpoint rate limit excceeded for IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Too many requests'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})

app.use('/api/posts/create-post', createPostEndpointLimiter)
app.use('/api/posts/all-posts', GetAllPostsEndpointLimiter)


//routes: pass redis client here as well
app.use('/api/posts', (req, res, next) => {
  req.redisClient = redisClient
  next()
}, postRoutes)


//Error Handler
app.use(errorHandler)

async function startServer() {
  try {
    await connectToRabbitMQ()

    app.listen(PORT, () => {
      logger.info(`Post service is running on port ${PORT}`)
    })
  } catch(error) {
    logger.error('Failed to connect to server', error)
    process.exit(1)
  }
}

startServer()


//unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at ${promise} with reason ${reason}`, )
})