const { createClient } = require('@supabase/supabase-js');

// Working Supabase configuration from genesis project
const supabaseUrl = 'https://xrffhhvneuwhqxhrjbct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZoaHZuZXV3aHF4aHJqYmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyMTIwOSwiZXhwIjoyMDcxNjk3MjA5fQ.k1IlRXRKsK3ErmXBlb81356M6BvEKqP9e3c8KARW2_Y';
const supabase = createClient(supabaseUrl, supabaseKey);

// Working Netlify function to handle payment callback from PayHero - copied from genesis project
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
    
    // Extract payment info from PayHero callback
    const response = callbackData.response || {};
    const checkoutRequestId = response.CheckoutRequestID;
    const externalReference = response.ExternalReference;
    
    if (checkoutRequestId) {
      // Store payment status in Supabase
      const paymentData = {
        checkout_request_id: checkoutRequestId,
        external_reference: externalReference,
        status: response.Status === 'Success' ? 'SUCCESS' : 'FAILED',
        amount: response.Amount,
        phone_number: response.Phone,
        mpesa_receipt_number: response.MpesaReceiptNumber,
        result_desc: response.ResultDesc,
        result_code: response.ResultCode
      };
      
      // Insert or update payment in Supabase
      const { data, error } = await supabase
        .from('payments')
        .upsert(paymentData, { onConflict: 'checkout_request_id' });
      
      if (error) {
        console.error('Error storing payment:', error);
      } else {
        console.log(`Payment status stored in Supabase for ${checkoutRequestId}:`, paymentData);
      }
    }
    
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
