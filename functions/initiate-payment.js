// Netlify function to initiate payment
const axios = require('axios');

// PayHero API credentials
const API_USERNAME = 'n25snHm7WIVFgr5iGc28';
const API_PASSWORD = 'bsMCzq8DCgUi7sKt1nwwacw14UC6jofqwGGUzov6';
const CHANNEL_ID = 2253;

// Generate Basic Auth Token
const generateBasicAuthToken = () => {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
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
