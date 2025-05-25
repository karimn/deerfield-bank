# Deerfield Bank - Claude Guidelines

## Commands
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## Deployment
- **Platform**: Vercel (configured with vercel.json)
- **Configuration**: src/vercel.json handles routing for Node.js serverless functions
- **Database**: MongoDB (separate dev/prod URIs configured in db.js)
- **Environment Variables needed for production**:
  - `NODE_ENV=production`
  - `MONGO_URI_PROD=<mongodb_connection_string>`
  - `SESSION_SECRET=<random_string>`
  - `GOOGLE_CLIENT_ID=<google_oauth_client_id>`
  - `GOOGLE_CLIENT_SECRET=<google_oauth_secret>`

## Code Style Guidelines

### Structure
- Controllers handle request/response logic
- Models define database schemas
- Routes define API endpoints
- Middleware for auth and request processing

### Naming Conventions
- camelCase for variables, functions, and methods
- PascalCase for models and classes
- Route handlers named for their action (getUsers, createAccount)
- Files named for their primary entity (accounts.js, users.js)

### Error Handling
- Use try/catch blocks in async functions
- Pass errors to Express error handler with `next(err)`
- Return consistent error responses with status code and message

### API Responses
- Always return JSON with `success` boolean
- Include `data` object with response payload
- For collections, include `count` property

### Authentication
- Use Passport.js with session-based auth
- Protect routes with `ensureAuth` middleware