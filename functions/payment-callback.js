// Netlify function to handle payment callback from PayHero
exports.handler = async (event, context) => {
  // Process POST request only
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: 'error', message: 'Method not allowed' })
    };
  }
  
  try {
    // Parse the callback data
    const callbackData = JSON.parse(event.body);
    
    // Log the callback for debugging
    console.log('Payment callback received:', JSON.stringify(callbackData, null, 2));
    
    // In a production environment, you would:
    // 1. Verify the payment status
    // 2. Update user account status in your database
    // 3. Log the transaction
    
    // Acknowledge receipt of callback
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', message: 'Callback received successfully' })
    };
  } catch (error) {
    console.error('Callback processing error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', message: 'Failed to process callback' })
    };
  }
};
