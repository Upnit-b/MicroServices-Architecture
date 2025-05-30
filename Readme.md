# Microservices Social Media Platform

A scalable, event-driven social media platform built with **Node.js microservices architecture**, featuring real-time communication between services, media handling using multer and cloudinary, and advanced search capabilities.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)

## 🏗️ Architecture Overview

This project implements a **microservices architecture** with **event-driven communication** using RabbitMQ message broker. Each service is independently deployable and maintains its own MongoDB database, ensuring **loose coupling** and **high scalability**.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│   Identity       │    │   Post Service  │
│   (Port 3000)   │    │   Service        │    │   (Port 3003)   │
└─────────────────┘    │   (Port 3001)    │    └─────────────────┘
         │              └──────────────────┘             │
         │                        │                      │
         ▼                        ▼                      ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Media Service │    │   Search Service │    │    RabbitMQ     │
│   (Port 3002)   │    │   (Port 3004)    │    │  Message Broker │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                      ▲
         └────────────────────────┼──────────────────────┘
                                  ▼
                      ┌─────────────────┐
                      │      Redis      │
                      │  Cache & Rate   │
                      │    Limiting     │
                      └─────────────────┘
```

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** with JWT tokens
- **Media Upload & Management** with file processing
- **Post Creation, Editing & Deletion** with rich content support
- **Real-time Search** with indexing and full-text search
- **Event-Driven Architecture** for decoupled service communication

### Technical Features
- **API Rate Limiting** for DDoS protection
- **Input Validation** using Joi schema validation
- **CORS Security** implementation
- **Comprehensive Logging** with Winston
- **Cache Management** with Redis
- **Pagination Support** for large datasets
- **Database Indexing** for optimized queries

## 🛠️ Technology Stack

### Backend Services
- **Node.js** with **Express.js** framework
- **MongoDB** with **Mongoose** ODM for data persistence
- **Redis** for caching and rate limiting
- **RabbitMQ** for asynchronous message communication

### Security & Validation
- **JWT (JSON Web Tokens)** for authentication
- **Joi** for request validation
- **CORS** middleware for cross-origin requests
- **Rate limiting** middleware for API protection

### Logging & Monitoring
- **Winston** for structured logging
- Custom error handling and logging strategies

## 📁 Project Structure

```
microservices-social-media/
├── api-gateway/
│   ├── src/
│   │   ├── middleware/          # Auth, CORS, Rate limiting
│   │   ├── utils/              # Helper functions
│   │   └── server.js           # Gateway entry point
│   └── package.json
├── identity-service/
│   ├── src/
│   │   ├── controllers/        # User management logic
│   │   ├── middleware/         # Auth validation
│   │   ├── models/            # User data models
│   │   ├── routes/            # API endpoints
│   │   ├── utils/             # JWT utilities
│   │   └── server.js
│   └── package.json
├── post-service/
│   ├── src/
│   │   ├── controllers/        # Post CRUD operations
│   │   ├── middleware/         # Validation & auth
│   │   ├── models/            # Post data models
│   │   ├── routes/            # Post API endpoints
│   │   ├── utils/             # Helper functions
│   │   └── server.js
│   └── package.json
├── media-service/
│   ├── src/
│   │   ├── controllers/        # File upload/download
│   │   ├── eventHandlers/      # RabbitMQ event processing
│   │   ├── middleware/         # File validation
│   │   ├── models/            # Media metadata models
│   │   ├── routes/            # Media API endpoints
│   │   ├── utils/             # File processing utilities
│   │   └── server.js
│   └── package.json
└── search-service/
    ├── src/
    │   ├── controllers/        # Search logic
    │   ├── eventHandlers/      # Event-driven indexing
    │   ├── middleware/         # Search validation
    │   ├── models/            # Search index models
    │   ├── routes/            # Search API endpoints
    │   ├── utils/             # Search utilities
    │   └── server.js
    └── package.json
```

## 🔄 Event-Driven Architecture

### Message Flow
The system uses **RabbitMQ** for asynchronous communication between services with the following event patterns:

#### Published Events
```javascript
// User Events
user.created      // → Search Service (for user indexing)
user.updated      // → Search Service (update user data)
user.deleted      // → All services (cleanup user data)

// Post Events
post.created      // → Search Service (index new post)
post.updated      // → Search Service (update post index)
post.deleted      // → Media Service, Search Service (cleanup)

// Media Events
media.created     // → Post Service (link media to posts)
media.deleted     // → Search Service (update related content)
```

#### Event Handling Strategy
- **Eventual Consistency**: Services update their local data based on events
- **Idempotent Operations**: Events can be safely processed multiple times
- **Error Resilience**: Failed events are logged for manual retry


## 🔐 Security Implementation

### Authentication Flow
1. **User Login** → Identity Service validates credentials
2. **JWT Generation** → Signed token with user payload
3. **API Gateway** → Validates JWT and extracts user info
4. **Service Communication** → `x-user-token` header forwarded to downstream services

### Security Measures
```javascript
// Rate Limiting Configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
};

// Input Validation Example
const postValidation = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.string().max(5000).required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10)
});
```

## 💾 Data Management

### Database Strategy
- **Database per Service**: Each microservice maintains its own MongoDB instance
- **Data Consistency**: Eventual consistency through event propagation
- **Mongoose Integration**: ODM for schema definition and validation

### Caching Strategy
```javascript
// Redis Cache Implementation
const cacheStrategy = {
  rateLimiting: 'string', // API call counters
};

// Cache Invalidation
const invalidationEvents = [
  'user.updated',   // Clear user cache
  'post.updated',   // Clear post cache
  'media.deleted'   // Clear media cache
];
```

## 📊 API Design

### RESTful Endpoints
```
API Gateway (Port 3000)
├── /api/v1/auth/*          → Identity Service
├── /api/v1/posts/*         → Post Service
├── /api/v1/media/*         → Media Service
└── /api/v1/search/*        → Search Service
```

### Pagination Implementation
```javascript
// Standard pagination response
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 95,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## 🔧 Setup & Installation

### Prerequisites
- **Node.js** (v16+)
- **MongoDB** (v5+)
- **Redis** (v6+)
- **RabbitMQ** (v3.8+)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/microservices-social-media.git
   cd microservices-social-media
   ```

2. **Install dependencies for all services**
   ```bash
   # Install dependencies for each service
   cd api-gateway && npm install && cd ..
   cd identity-service && npm install && cd ..
   cd post-service && npm install && cd ..
   cd media-service && npm install && cd ..
   cd search-service && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Create .env files for each service
   # Example for api-gateway/.env
   PORT=3000
   JWT_SECRET=your_jwt_secret
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   ```

4. **Start infrastructure services**
   ```bash
   # Start MongoDB
   mongod --dbpath /your/mongodb/path

   # Start Redis
   redis-server

   # Start RabbitMQ
   rabbitmq-server
   ```

5. **Start microservices**
   ```bash
   # Start each service in separate terminals
   cd api-gateway && npm start
   cd identity-service && npm start
   cd post-service && npm start
   cd media-service && npm start
   cd search-service && npm start
   ```

## 📈 Performance & Scalability

### Current Optimizations
- **MongoDB Indexing**: Optimized queries with proper indexing
- **Redis Caching**: Reduced database load with strategic caching
- **Event-Driven Design**: Non-blocking operations for better throughput


## 🔍 Monitoring & Logging

### Winston Logging Configuration
```javascript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```




---

⭐ **Star this repository if you found it helpful!**