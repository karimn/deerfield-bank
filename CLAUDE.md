# Deerfield Bank - Claude Guidelines

## Commands
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## Deployment
- **Platform**: Vercel (serverless functions - configured with vercel.json)
- **Configuration**: vercel.json handles routing for Node.js serverless functions
- **Database**: MongoDB (separate dev/prod URIs configured in db.js)
- **Authentication**: Auth0 (replaces Google OAuth)
- **Recurring Transactions**: Requires external scheduling (see RECURRING_TRANSACTIONS_SETUP.md)
  - **IMPORTANT**: node-cron in scheduler.js does NOT work on Vercel serverless
  - Use external cron service (cron-job.org, UptimeRobot) or Vercel Cron (Pro plan)
  - Endpoint: `https://your-domain.vercel.app/api/automation/process-recurring`
- **Environment Variables needed for production**:
  - `NODE_ENV=production`
  - `MONGO_URI_PROD=<mongodb_connection_string>`
  - `SESSION_SECRET=<random_string>`
  - `AUTH0_DOMAIN=<your_auth0_domain>`
  - `AUTH0_CLIENT_ID=<auth0_client_id>`
  - `AUTH0_CLIENT_SECRET=<auth0_client_secret>`
  - `AUTH0_CALLBACK_URL=<https://your-domain.vercel.app/auth/auth0/callback>`

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