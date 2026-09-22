require('dotenv').config();
const { sendWelcomeEmail } = require('./services/emailService');

const testWelcomeEmail = async () => {
  console.log('Testing Welcome Email...');
  try {
    const result = await sendWelcomeEmail('parmarkush0089@gmail.com', 'Kush Parmar');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test Failed:', error);
  }
};

testWelcomeEmail();
