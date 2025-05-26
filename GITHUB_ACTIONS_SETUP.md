# GitHub Actions Cron Job Setup

This document explains how to set up the automated daily processing of recurring transactions using GitHub Actions.

## What This Does

The GitHub Action will run daily at 6 AM UTC (2 AM EDT/1 AM EST) and:
1. Call your production API to process all recurring transactions (allowances, subscriptions, etc.)
2. Provide detailed logging of the results
3. Handle errors gracefully

## Setup Instructions

### 1. Set Up Repository Secret

You need to add your production URL as a repository secret:

1. Go to your GitHub repository: https://github.com/karimn/deerfield-bank
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Set:
   - **Name**: `APP_URL`
   - **Value**: Your production URL (likely `https://deerfield-bank.vercel.app` or your custom domain)
6. Click **Add secret**

### 2. Find Your Exact Production URL

To find your exact Vercel URL:
1. Go to your Vercel dashboard
2. Find your deerfield-bank project
3. Copy the production URL (should be something like `https://deerfield-bank-xyz.vercel.app`)
4. Use this URL for the `APP_URL` secret above

### 3. Test the Workflow

After setting up the secret:

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Find "Process Recurring Transactions" workflow
4. Click **Run workflow** → **Run workflow** to test it manually
5. Check the logs to ensure it's working

### 4. Verify API Endpoint

Make sure your production API has the recurring transactions endpoint:
- Test URL: `https://your-domain.vercel.app/api/recurring/process`
- Method: POST
- Should return JSON with processed transaction counts

## Schedule

The workflow runs daily at:
- **6 AM UTC**
- **2 AM Eastern Daylight Time (EDT)**
- **1 AM Eastern Standard Time (EST)**

## Manual Triggers

You can manually trigger the workflow anytime from the GitHub Actions tab for testing or emergency processing.

## Monitoring

The workflow will:
- ✅ Show success when transactions are processed
- ❌ Fail and send notifications if there are errors
- 📊 Log detailed information about processed transactions

## Alternative: Manual Processing

If you prefer manual control, you can also add a "Process Recurring Transactions" button to your admin interface that calls the same API endpoint.

## Troubleshooting

1. **Workflow fails with 404**: Check that your APP_URL secret is correct and the API endpoint exists
2. **Workflow fails with 500**: Check your application logs in Vercel for database or application errors
3. **No transactions processed**: Verify that you have active recurring transactions in the database

## Security Note

The workflow only makes HTTP requests to your own API. No sensitive data is stored in GitHub Actions - only your production URL.