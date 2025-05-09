const axios = require('axios');
require('dotenv').config();

// Use hardcoded credentials for testing
const email = 'admin@example.com';
const password = 'password123';

console.log(`Testing login with: ${email} / ${password}`);

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:5010/api/auth/login', {
      email,
      password
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token);
    console.log('User:', response.data.data.user);
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
  }
}

testLogin(); 