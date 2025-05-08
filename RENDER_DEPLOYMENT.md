# CineConnect Deployment Guide for Render

This guide will help you deploy both the frontend and backend of CineConnect to Render.

## Prerequisites

1. A Render account (sign up at https://render.com if you don't have one)
2. A MongoDB database (you can use MongoDB Atlas for a free tier cluster)
3. Your TMDB API key

## Step 1: Prepare Your Environment Variables

For the backend, you'll need the following environment variables in your Render dashboard:

- `MONGO_URI`: Your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster.mongodb.net/cineconnect`)
- `JWT_SECRET`: A secure random string for signing JWTs
- `TMDB_API_KEY`: Your TMDB API key
- `NODE_ENV`: Set to `production`
- `PORT`: Render will automatically set this, but you can set it to `10000` if needed
- `CLIENT_URL`: Your frontend URL (e.g., `https://cineconnect-app.onrender.com`)

Optional email configuration (if you're using email verification):

- `EMAIL_SERVICE`: Your email service (e.g., `gmail`)
- `EMAIL_USERNAME`: Your email username
- `EMAIL_PASSWORD`: Your email password or app password
- `EMAIL_FROM`: The sender name and email

## Step 2: Set Up Environment Files

### 1. For the client (frontend)

Rename `client/src/env.production` to `.env.production` with:

```
VITE_API_URL=https://your-backend-service-name.onrender.com/api
```

Replace `your-backend-service-name` with your actual backend service name on Render.

## Step 3: Deploy to Render

### Option 1: Using the Render Dashboard

#### Backend (Express API)

1. Go to your Render dashboard and click "New" > "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - Name: `cineconnect-api` (or your preferred name)
   - Environment: `Node`
   - Region: Choose the closest to your users
   - Branch: `main` (or your deployment branch)
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node server.js`
   - Plan: Free (or choose a paid plan for better performance)
4. Add all your environment variables under "Environment"
5. Click "Create Web Service"

#### Frontend (React)

1. Go to your Render dashboard and click "New" > "Static Site"
2. Connect your GitHub repository
3. Configure the site:
   - Name: `cineconnect-app` (or your preferred name)
   - Branch: `main` (or your deployment branch)
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/dist`
   - Add environment variable: `VITE_API_URL=https://your-backend-service-name.onrender.com/api`
4. Under "Advanced" configure a redirect:
   - Source: `/*`
   - Destination: `/index.html`
   - Status: `200`
5. Click "Create Static Site"

### Option 2: Using render.yaml (Blueprint)

A `render.yaml` file is included in this repository. You can use Render Blueprints for automatic deployment:

1. Push the changes to your GitHub repository
2. Go to the Render dashboard and click "New" > "Blueprint"
3. Connect your GitHub repository
4. Review the services and click "Apply"
5. Add your secret environment variables (MONGO_URI, JWT_SECRET, TMDB_API_KEY)
6. Finalize the deployment

## Troubleshooting

### CORS Issues

If you encounter CORS issues, check that your `CLIENT_URL` environment variable exactly matches your frontend URL.

### MongoDB Connection Issues

Ensure your MongoDB connection string is correct and that your IP is whitelisted (or set to allow access from anywhere).

### Build Failures

Check the build logs for errors. Common issues include:

- Missing dependencies
- Node version incompatibility (specify Node version in a `.node-version` file if needed)
- Environment variable issues

## Monitoring and Logs

Render provides built-in logs and metrics:

1. Go to your service in the Render dashboard
2. Click "Logs" to view runtime logs
3. Check "Events" for deployment events
