document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const infoStep = document.getElementById('info-step');
    const paymentStep = document.getElementById('payment-step');
    const successStep = document.getElementById('success-step');
    
    const activateBtn = document.getElementById('activate-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const payBtn = document.getElementById('pay-btn');
    const backBtn = document.getElementById('back-btn');
    const continueBtn = document.getElementById('continue-btn');
    
    const phoneInput = document.getElementById('phone-input');
    const errorMessage = document.getElementById('error-message');
    const statusContainer = document.getElementById('status-container');
    const transactionIdElement = document.getElementById('transaction-id');
    
    // Variables
    const ACTIVATION_FEE = 200;
    let paymentReference = null;
    let pollInterval = null;
    let userId = null;
    let returnUrl = null;
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    userId = urlParams.get('userId') || 'guest-user';
    returnUrl = urlParams.get('returnUrl') || null;
    
    // API URL - Use the correct Netlify functions URL structure
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : 'https://survaypay75.netlify.app/.netlify/functions';
    
    // Function to format phone number for Kenyan format
    function formatPhoneNumber(input) {
        // Remove non-digit characters
        let cleaned = input.replace(/\\D/g, '');
        
        // Format for Kenya number
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.substring(1);
        }
        
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }
        
        if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned;
        }
        
        return cleaned;
    }
    
    // Function to validate Kenyan phone number
    function validatePhoneNumber(phoneNumber) {
        const formatted = formatPhoneNumber(phoneNumber);
        return formatted.length === 12 && formatted.startsWith('254');
    }
    
    // Function to show error message
    function showError(message) {
        errorMessage.textContent = message;
    }
    
    // Function to clear error message
    function clearError() {
        errorMessage.textContent = '';
    }
    
    // Function to show status message
    function showStatus(message, type) {
        statusContainer.textContent = message;
        statusContainer.className = 'status-container ' + type;
    }
    
    // Function to hide status message
    function hideStatus() {
        statusContainer.className = 'status-container';
    }
    
    // Function to switch between steps
    function showStep(step) {
        infoStep.classList.remove('active');
        paymentStep.classList.remove('active');
        successStep.classList.remove('active');
        
        step.classList.add('active');
    }
    
    // Function to initiate payment
    async function initiatePayment() {
        // Validate phone number
        if (!validatePhoneNumber(phoneInput.value)) {
            showError('Please enter a valid Kenyan phone number');
            return;
        }
        
        // Clear previous errors
        clearError();
        
        // Disable buttons and show loading
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="spinner"></span> Processing...';
        backBtn.disabled = true;
        
        try {
            // Get formatted phone number
            const phoneNumber = formatPhoneNumber(phoneInput.value);
            
            // Make API request to initiate payment
            const response = await fetch(`${API_URL}/initiate-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber,
                    userId,
                    amount: ACTIVATION_FEE,
                    description: 'SurvayPay Account Activation'
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.data.externalReference) {
                paymentReference = data.data.externalReference;
                
                // Show pending status
                showStatus('STK Push sent. Please complete the payment on your phone.', 'pending');
                
                // Start polling for payment status
                startPolling(paymentReference);
            } else {
                // Show error
                showError(data.message || 'Failed to initiate payment');
                showStatus('Payment initiation failed. Please try again.', 'error');
                
                // Re-enable buttons
                payBtn.disabled = false;
                payBtn.textContent = 'Try Again';
                backBtn.disabled = false;
            }
        } catch (error) {
            console.error('Payment initiation error:', error);
            
            // Show error
            showError('Network error. Please try again later.');
            showStatus('Connection error. Please check your internet and try again.', 'error');
            
            // Re-enable buttons
            payBtn.disabled = false;
            payBtn.textContent = 'Try Again';
            backBtn.disabled = false;
        }
    }
    
    // Function to poll for payment status
    function startPolling(reference) {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        
        pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/payment-status/${reference}`);
                const data = await response.json();
                
                if (data.success && data.payment) {
                    if (data.payment.status === 'SUCCESS') {
                        // Stop polling
                        clearInterval(pollInterval);
                        
                        // Show success status
                        showStatus('Payment successful! Activating your account...', 'success');
                        
                        // Update transaction ID
                        if (data.payment.mpesaReceiptNumber) {
                            transactionIdElement.textContent = data.payment.mpesaReceiptNumber;
                        } else {
                            transactionIdElement.textContent = reference;
                        }
                        
                        // Show success step after a short delay
                        setTimeout(() => {
                            showStep(successStep);
                        }, 1500);
                    } else if (data.payment.status === 'FAILED') {
                        // Stop polling
                        clearInterval(pollInterval);
                        
                        // Show error
                        showStatus('Payment failed. Please try again.', 'error');
                        
                        // Re-enable buttons
                        payBtn.disabled = false;
                        payBtn.textContent = 'Try Again';
                        backBtn.disabled = false;
                    }
                }
            } catch (error) {
                console.error('Error checking payment status:', error);
                // Don't stop polling on error, just continue
            }
        }, 5000); // Check every 5 seconds
    }
    
    // Event Listeners
    activateBtn.addEventListener('click', function() {
        showStep(paymentStep);
    });
    
    cancelBtn.addEventListener('click', function() {
        // Redirect back to app if return URL is provided
        if (returnUrl) {
            window.location.href = returnUrl + '?status=cancelled';
        }
    });
    
    payBtn.addEventListener('click', initiatePayment);
    
    backBtn.addEventListener('click', function() {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        showStep(infoStep);
    });
    
    continueBtn.addEventListener('click', function() {
        // Redirect back to app if return URL is provided
        if (returnUrl) {
            window.location.href = returnUrl + '?status=success&reference=' + paymentReference;
        }
    });
    
    // Clean up polling interval when leaving the page
    window.addEventListener('beforeunload', function() {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    });
});
