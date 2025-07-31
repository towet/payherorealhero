// Netlify function to initiate payment
const axios = require('axios');

// PayHero API credentials
const API_USERNAME = 'n4DS7x5YQYLuDrd02VvX';
const API_PASSWORD = 'hANzT7xxSyOG3KMOT0TToUWLej2I54T2Qz9I6kJj';
const CHANNEL_ID = 3063;

// Generate Basic Auth Token
const generateBasicAuthToken = () => {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
};

// Format phone number for PayHero API
const formatPhoneNumberForPayHero = (phoneNumber) => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  // If starts with +, remove it
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // If doesn't start with 254, add it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Process POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }
  
  try {
    const requestBody = JSON.parse(event.body);
    const { phoneNumber, userId, amount = 150, description = 'SurvayPay Account Activation' } = requestBody;
    
    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Phone number is required' })
      };
    }
    
    // Generate a unique reference for this payment
    const externalReference = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Define the callback URL - use Netlify function URL
    const callbackUrl = `${process.env.URL || 'https://your-netlify-site.netlify.app'}/.netlify/functions/payment-callback`;
    
    const payload = {
      amount: amount,
      phone_number: phoneNumber,
      channel_id: CHANNEL_ID,
      provider: "sasapay",
      network_code: "63902",
      external_reference: externalReference,
      description: description,
      callback_url: callbackUrl
    };
    
    const response = await axios({
      method: 'post',
      url: 'https://backend.payhero.co.ke/api/v2/payments',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateBasicAuthToken()
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          externalReference,
          checkoutRequestId: response.data.CheckoutRequestID
        }
      })
    };
  } catch (error) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to initiate payment',
        error: error.response?.data || error.message
      })
    };
  }
};
