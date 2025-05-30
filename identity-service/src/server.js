require('dotenv').config()
const mongoose = require('mongoose')
const logger = require('./utils/logger')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const {RateLimiterRedis} = require('rate-limiter-flexible')
const Redis = require('ioredis')
const {rateLimit} = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis')
const routes = require('./routes/identity-service')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3001


//connect to mongodb
mongoose.connect(process.env.MONGODB_URI)
.then(() => logger.info('Connected to mongoDB'))
.catch((e)=>logger.error('MongoDB connection error', e))


//creating REDIS CLIENT
const redisClient = new Redis(process.env.REDIS_URL)


//MIDDLEWARES
//middleware for header security
app.use(helmet())

//middleware for cross origin security
app.use(cors())

//middleware for parsing request body
app.use(express.json())

//Global Middleware for logging
app.use((req,res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`)
  logger.info(`Request body, ${req.body}`)
  next()
})


//DDOS PROTECTION AND RATE LIMITING MIDDLEWARE
//instantiating rate limiter using rate-limiter-flexible for redis
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10, //10 points
  duration: 1 //per 1 second
})

//implementing global middleware for DDOS protection and rate limiting
app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
  .then(() => next())
  .catch(() => {
    logger.warn(`Rate limit exceeded for IP ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Too many requests'
    })
  })
})

//IP based rate limiting for endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 50, //Max-Limit each IP to 50 requests per window per 15 minutes
  standardHeaders: true, //including the rate limit info in response headers and to see how many requests left in current time window
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Too many requests'
    })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }),
})

//apply the sensitiveEndpointsLimiter to routes
app.use('/api/auth/register', sensitiveEndpointsLimiter)


//Routes
app.use('/api/auth', routes)


//error handler
app.use(errorHandler)


//start server
app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`)
})


//unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at ${promise} with reason ${reason}`, )
})
