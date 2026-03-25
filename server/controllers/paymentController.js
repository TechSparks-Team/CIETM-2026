const Registration = require('../models/Registration');
const Settings = require('../models/Settings');
const { Cashfree, CFEnvironment } = require('cashfree-pg');
const notificationController = require('./notificationController');


// Initialize Cashfree SDK
const cashfree = new Cashfree();
cashfree.XClientId = process.env.CASHFREE_APP_ID;
cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
cashfree.XEnvironment = process.env.CASHFREE_ENV === 'PRODUCTION'
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;



// @desc    Initialize payment (Create Order)
// @route   POST /api/payments/init
// @access  Private
const initPayment = async (req, res) => {
    const { registrationId } = req.body;
    const userId = req.user._id;

    try {
        // Check if online payments are enabled in system settings
        const settings = await Settings.findOne();
        if (settings && settings.onlinePaymentEnabled === false) {
            return res.status(403).json({ 
                message: 'Online payment gateway is temporarily disabled by the administrator. Please contact the conference desk for manual payment options.' 
            });
        }

        const registration = await Registration.findById(registrationId);

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.status !== 'Accepted') {
            return res.status(400).json({ message: 'Payment only allowed for accepted papers' });
        }

        const categoryAmounts = {
            'UG/PG STUDENTS': 500,
            'FACULTY/RESEARCH SCHOLARS': 750,
            'EXTERNAL / ONLINE PRESENTATION': 300,
            'INDUSTRY PERSONNEL': 900
        };

        let totalAmount = categoryAmounts[registration.personalDetails.category] || 1000;

        if (registration.teamMembers && registration.teamMembers.length > 0) {
            registration.teamMembers.forEach(member => {
                totalAmount += categoryAmounts[member.category] || 1000;
            });
        }

        const amount = totalAmount;
        const txnid = `TXN_${Date.now()}`;

        // Save amount and txnid to registration for tracking
        registration.amount = amount;
        registration.transactionId = txnid;
        await registration.save();

        const request = {
            order_amount: amount,
            order_currency: "INR",
            order_id: txnid,
            customer_details: {
                customer_id: userId.toString(),
                customer_phone: registration.personalDetails.mobile || '9999999999',
                customer_name: req.user.name,
                customer_email: req.user.email
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/dashboard?payment_id={order_id}&payment_status={order_status}`,
                notify_url: `${process.env.BACKEND_URL || (req.protocol + '://' + req.get('host'))}/api/payments/webhook`
            }
        };

        const response = await cashfree.PGCreateOrder(request);

        res.json({
            payment_session_id: response.data.payment_session_id,
            order_id: response.data.order_id
        });

    } catch (error) {
        console.error("Error creating order:", error.response?.data?.message || error.message);
        res.status(500).json({ message: error.response?.data?.message || error.message });
    }
};

// @desc    Payment Callback (Verify Payment Status)
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
    const { orderId } = req.body;

    try {
        const response = await cashfree.PGOrderFetchPayments(orderId);

        // Check if any transaction is successful
        const successfulTransaction = response.data.find(txn => txn.payment_status === 'SUCCESS');

        if (successfulTransaction) {
            const registration = await Registration.findOne({ transactionId: orderId });

            if (registration && registration.paymentStatus !== 'Completed') {
                registration.paymentStatus = 'Completed';
                registration.paymentDetails = successfulTransaction;
                await registration.save();

                // Trigger notification
                await notificationController.createNotification(
                    registration.userId,
                    'Payment Successful',
                    'Your conference registration payment has been successfully processed.',
                    'success',
                    '/dashboard'
                );
            }

            res.json({ status: 'SUCCESS', message: 'Payment verified successfully' });
        } else {
            res.json({ status: 'FAILED', message: 'Payment verification failed' });
        }

    } catch (error) {
        console.error("Error verifying payment:", error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    initPayment,
    paymentCallback: verifyPayment // Renaming for route compatibility or update route file
};
