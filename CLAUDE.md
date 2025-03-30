# Deerfield Bank - Claude Guidelines

## Commands
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

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