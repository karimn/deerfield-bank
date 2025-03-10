const cron = require('node-cron');
const axios = require('axios');

// You'll need to install these dependencies:
// npm install node-cron axios

// Run weekly for allowance (Sunday at midnight)
cron.schedule('0 0 * * 0', async () => {
  try {
    console.log('Running weekly allowance job');
    // Make API call to your own endpoint
    // In production, you'd use direct function calls or a worker
    await axios.post('http://localhost:5000/api/allowance/process');
  } catch (error) {
    console.error('Error processing weekly allowance:', error.message);
  }
});

// Run daily for subscriptions (midnight every day)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily subscription check');
    await axios.post('http://localhost:5000/api/subscriptions/process');
  } catch (error) {
    console.error('Error processing subscriptions:', error.message);
  }
});

// Run monthly for interest (1st day of month at midnight)
cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('Running monthly interest calculation');
    await axios.post('http://localhost:5000/api/interest/calculate');
  } catch (error) {
    console.error('Error calculating interest:', error.message);
  }
});

module.exports = { startScheduler: () => console.log('Scheduler running...') };