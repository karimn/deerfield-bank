# Recurring Transactions Setup Guide

## Overview

Deerfield Bank processes recurring transactions (allowances, subscriptions, interest) automatically using scheduled jobs. This document explains how to set up and troubleshoot the automation system.

## Architecture

The system has two endpoints for processing recurring transactions:

1. **Public Automation Endpoint** (for external cron services)
   - URL: `https://your-domain.vercel.app/api/automation/process-recurring`
   - No authentication required
   - Intended for external cron services

2. **Protected API Endpoint** (for manual triggering by parents)
   - URL: `https://your-domain.vercel.app/api/recurring/process`
   - Requires authentication
   - Accessible via "Process All Recurring Transactions" button in Parent Dashboard

## Scheduling Options

### Option 1: External Cron Service (FREE - RECOMMENDED)

Since Vercel Cron requires a paid plan, use a free external service to call the automation endpoint daily.

#### Recommended Services:
- **cron-job.org** (Free, reliable, 60-second minimum interval)
- **EasyCron** (Free tier: 1 cron job)
- **UptimeRobot** (Free, monitors + HTTP requests)

#### Setup Instructions for cron-job.org:

1. Go to https://cron-job.org and create a free account
2. Click "Create Cron Job"
3. Configure:
   - **Title**: Process Deerfield Bank Recurring Transactions
   - **URL**: `https://your-domain.vercel.app/api/automation/process-recurring`
   - **Schedule**: Daily at 6:00 AM (or your preferred time)
   - **Execution**: Click "Create"
4. Save and enable the cron job

#### Setup Instructions for UptimeRobot:

1. Go to https://uptimerobot.com and create a free account
2. Add New Monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Deerfield Bank Recurring
   - **URL**: `https://your-domain.vercel.app/api/automation/process-recurring`
   - **Monitoring Interval**: Every 24 hours (or minimum allowed)
3. Save the monitor

### Option 2: Vercel Cron (PAID)

If you upgrade to Vercel Pro ($20/month), the cron configuration in `vercel.json` will work automatically:

```json
{
  "crons": [
    {
      "path": "/api/automation/process-recurring",
      "schedule": "0 6 * * *"
    }
  ]
}
```

This runs daily at 6:00 AM UTC.

### Option 3: GitHub Actions (FREE but can be disabled)

GitHub Actions workflow exists at `.github/workflows/process-recurring-transactions.yml`.

**Important**: GitHub automatically disables scheduled workflows after 60 days of repository inactivity.

To keep it active:
- Commit to the repository at least once every 60 days, OR
- Manually trigger the workflow from GitHub Actions tab occasionally

#### Manual Trigger:
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Process Recurring Transactions" workflow
4. Click "Run workflow" > "Run workflow"

## Manual Processing

Parents can manually process recurring transactions anytime:

1. Log in to the Parent Dashboard
2. Click the **"Process All Recurring Transactions"** button in Quick Actions
3. Confirm the action

This is useful for:
- Testing the system
- Processing transactions immediately after adding new recurring items
- Recovering from missed automatic runs

## What Gets Processed

The automation processes:

1. **Allowances** - Distributed to children's spending/saving/donation accounts based on configured percentages
2. **Subscriptions** - Automatic withdrawals for recurring expenses
3. **Interest** - Calculated for savings and donation accounts with interest rates
4. **Other Recurring Transactions** - Any custom recurring items

Only transactions with `nextDate <= today` and `active: true` are processed.

## Monitoring

### Check Last Processing:
- View transaction history for each child
- Check for "Recurring Allowance", "Monthly Interest", or other automated transactions

### Debug Issues:
1. Test the endpoint manually:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/automation/process-recurring
   ```

2. Check the response:
   - Success: `{"success": true, "processed": N, "errors": 0, ...}`
   - Error: Contains error message

3. Verify in Parent Dashboard:
   - Check that recurring transactions exist and have correct `nextDate`
   - Ensure transactions are marked as `active: true`

## Troubleshooting

### Recurring transactions aren't processing automatically

1. **Check external cron service**: Log into cron-job.org (or your chosen service) and verify:
   - Job is enabled
   - Recent execution logs show success
   - URL is correct

2. **Verify endpoint works**: Test manually:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/automation/process-recurring
   ```

3. **Check recurring transaction setup**:
   - Log into Parent Dashboard
   - View recurring transactions
   - Verify `nextDate` is in the past
   - Verify `active` is true

### Manual button doesn't work

1. Ensure you're logged in as a parent
2. Check browser console for errors
3. Verify the API endpoint is accessible

### Transactions processed but balances didn't update

1. Check that accounts exist for the child
2. Verify account types match distribution (spending, saving, donation)
3. Look for errors in transaction history

## Migration from Old System

If you previously used:
- **GitHub Actions**: Can keep running but may be disabled by GitHub
- **Vercel Cron (free tier)**: Not supported, needs external service
- **node-cron in scheduler.js**: Doesn't work on serverless (Vercel)

**Recommendation**: Set up external cron service (Option 1) for most reliable free solution.

## Next Steps

1. Choose a scheduling option (recommend: external cron service)
2. Set up the cron job with your production URL
3. Test by manually triggering once
4. Monitor transaction history to confirm it's working
5. Consider setting up alerts/monitoring for failed runs
