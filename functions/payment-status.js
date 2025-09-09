const { createClient } = require('@supabase/supabase-js');

// Working Supabase configuration from genesis project
const supabaseUrl = 'https://xrffhhvneuwhqxhrjbct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZoaHZuZXV3aHF4aHJqYmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyMTIwOSwiZXhwIjoyMDcxNjk3MjA5fQ.k1IlRXRKsK3ErmXBlb81356M6BvEKqP9e3c8KARW2_Y';
const supabase = createClient(supabaseUrl, supabaseKey);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    // Get reference from path parameter
    const reference = event.path.split('/').pop();
    
    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Payment reference is required' })
      };
    }
    
    // Query Supabase for payment status
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .or(`checkout_request_id.eq.${reference},external_reference.eq.${reference}`)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error querying payment:', error);
      throw error;
    }
    
    if (payment) {
      console.log(`Payment status found for ${reference}:`, payment);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          payment: {
            status: payment.status,
            amount: payment.amount,
            phoneNumber: payment.phone_number,
            mpesaReceiptNumber: payment.mpesa_receipt_number,
            resultDesc: payment.result_desc,
            resultCode: payment.result_code,
            timestamp: payment.updated_at
          }
        })
      };
    } else {
      // Payment not found yet (still pending)
      console.log(`Payment status not found for ${reference}, still pending`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          payment: {
            status: 'PENDING',
            message: 'Payment is still being processed'
          }
        })
      };
    }
  } catch (error) {
    console.error('Payment status check error:', error.response?.data || error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to check payment status',
        error: error.response?.data || error.message
      })
    };
  }
};
