const cron = require('node-cron');
const axios = require('axios');

// You'll need to install these dependencies:
// npm install node-cron axios

// Process all recurring transactions daily (midnight)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Processing recurring transactions');
    // Make API call to the recurring transactions processing endpoint
    const response = await axios.post('http://localhost:5000/api/recurring/process');
    
    const { processed, errors } = response.data;
    console.log(`Processed ${processed} recurring transactions with ${errors} errors`);
  } catch (error) {
    console.error('Error processing recurring transactions:', error.message);
  }
});

// Legacy endpoints - kept for backward compatibility
// These are now handled by the recurring transactions system

// Run weekly for allowance (Sunday at midnight)
cron.schedule('0 0 * * 0', async () => {
  try {
    console.log('Running legacy weekly allowance job');
    await axios.post('http://localhost:5000/api/allowance/process');
  } catch (error) {
    console.error('Error processing weekly allowance:', error.message);
  }
});

// Run monthly for interest (1st day of month at midnight)
cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('Running legacy monthly interest calculation');
    await axios.post('http://localhost:5000/api/interest/calculate');
  } catch (error) {
    console.error('Error calculating interest:', error.message);
  }
});

module.exports = { startScheduler: () => console.log('Scheduler running...') };