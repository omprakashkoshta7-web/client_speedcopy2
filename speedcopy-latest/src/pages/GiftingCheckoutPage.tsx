import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import AddressModal from '../components/AddressModal';
import { useAuth } from '../context/AuthContext';
import userService from '../services/user.service';
import orderService from '../services/order.service';
import walletService from '../services/wallet.service';
import paymentService from '../services/payment.service';
import PaymentMethodSelector, { type PaymentMethodType } from '../components/PaymentMethodSelector';

type PaymentMethod = PaymentMethodType;

const GiftingCheckoutPage: React.FC = () => {
  const [method, setMethod] = useState<PaymentMethod>('razorpay');
  const [orderSummary, setOrderSummary] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchCheckoutData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        const [cartRes, walletRes, addressRes] = await Promise.all([
          orderService.getCart(),
          walletService.getBalance(),
          userService.getAddresses()
        ]);

        // Filter cart items by gifting flow
        const rawCart = cartRes.data || cartRes || {};
        const allItems = rawCart.items || [];
        const filteredItems = allItems.filter((item: any) => item.flowType === 'gifting');
        const filteredSubtotal = filteredItems.reduce(
          (sum: number, item: any) => sum + ((item.unitPrice || item.price || 0) * (item.quantity || 1)), 0
        );

        setOrderSummary({
          ...rawCart,
          items: filteredItems,
          subtotal: filteredSubtotal,
          deliveryFee: rawCart.deliveryFee || 0,
          discount: rawCart.discount || 0,
        });
        setWallet(walletRes.data);
        const addressesData = addressRes?.data || [];
        const parsedAddresses = Array.isArray(addressesData) ? addressesData : [];
        setAddresses(parsedAddresses);
        if (parsedAddresses.length > 0) {
          setSelectedAddress(parsedAddresses[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch checkout data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (addressData: any) => {
    setSavingAddress(true);
    const formatted: any = {
      label: addressData.type || 'Home',
      fullName: addressData.name,
      phone: addressData.phone,
      houseNo: addressData.house || '',
      area: addressData.area || '',
      landmark: addressData.landmark || '',
      line1: `${addressData.house || ''}, ${addressData.area || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, ''),
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: addressData.pincode,
      country: 'India',
      isDefault: addressData.isDefault || false,
    };
    
    // Only add line2 if landmark exists (backend rejects empty string)
    if (addressData.landmark && addressData.landmark.trim()) {
      formatted.line2 = addressData.landmark.trim();
    }
    
    try {
      if (editingAddress) {
        const response = await userService.updateAddress(editingAddress._id, formatted);
        const updatedAddress = response.data;
        setAddresses(addresses.map(a => a._id === editingAddress._id ? updatedAddress : a));
        if (selectedAddress?._id === editingAddress._id) {
          setSelectedAddress(updatedAddress);
        }
      } else {
        const response = await userService.addAddress(formatted);
        const newAddress = response.data;
        setAddresses([...addresses, newAddress]);
        setSelectedAddress(newAddress);
      }
    } catch (err) {
      console.error('Failed to save address:', err);
      const localAddress = { ...formatted, _id: editingAddress?._id || `local-${Date.now()}` };
      if (editingAddress) {
        setAddresses(addresses.map(a => a._id === editingAddress._id ? localAddress : a));
        if (selectedAddress?._id === editingAddress._id) {
          setSelectedAddress(localAddress);
        }
      } else {
        setAddresses([...addresses, localAddress]);
        setSelectedAddress(localAddress);
      }
    }
    setShowAddressModal(false);
    setEditingAddress(null);
    setSavingAddress(false);
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      const cartItems = orderSummary?.items || [];

      if (!selectedAddress) {
        alert('Please select a delivery address');
        setProcessing(false);
        return;
      }

      if (cartItems.length === 0) {
        alert('Your cart is empty');
        setProcessing(false);
        return;
      }

      const subtotal = cartItems.reduce((sum: number, item: any) => sum + ((item.unitPrice || item.price || 0) * (item.quantity || 1)), 0);
      const deliveryCharge = orderSummary?.deliveryFee || 0;
      const discount = orderSummary?.discount || 0;
      const totalAmount = subtotal + deliveryCharge - discount;

      if (method === 'wallet') {
        const walletBalance = wallet?.balance || 0;
        if (walletBalance < totalAmount) {
          alert(`Insufficient wallet balance. You have ₹${walletBalance.toFixed(2)} but need ₹${totalAmount.toFixed(2)}.`);
          setProcessing(false);
          return;
        }
      }

      if (isAuthenticated) {
        const items = cartItems.map((item: any) => ({
          productId: item.productId || item.id || 'unknown',
          productName: item.productName || item.name || 'Product',
          flowType: 'gifting',
          designId: item.designId || item.design_id,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: (item.unitPrice || item.price || 0) * (item.quantity || 1),
        }));

        const orderData = {
          items,
          shippingAddress: {
            fullName: selectedAddress.fullName || selectedAddress.label || 'Customer',
            phone: selectedAddress.phone || '',
            line1: selectedAddress.line1 || '',
            line2: selectedAddress.line2 || '',
            city: selectedAddress.city || 'Mumbai',
            state: selectedAddress.state || 'Maharashtra',
            pincode: selectedAddress.pincode || '',
          },
          subtotal,
          discount,
          deliveryCharge,
          total: totalAmount,
          paymentMethod: method,
        };

        if (method === 'wallet') {
          const response = await orderService.createOrder(orderData);
          const createdOrderId = response.data?._id;
          
          if (createdOrderId) {
            navigate(`/payment-success?orderId=${createdOrderId}`);
          } else {
            throw new Error('Order creation failed');
          }
        } else {
          await handleRazorpayPayment(orderData, totalAmount);
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      alert(`Payment failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayPayment = async (orderData: any, totalAmount: number) => {
    try {
      console.log('🎯 Starting Razorpay payment for amount:', totalAmount);

      // Initiate via wallet service (same as AddFundsPage)
      const initiateRes = await walletService.initiateRazorpay(totalAmount, `order_${Date.now()}`);
      const paymentData = initiateRes.data;

      console.log('🔑 Using Razorpay key:', paymentData.keyId?.substring(0, 8) + '...');
      console.log('📦 Razorpay Order ID:', paymentData.razorpayOrderId);
      console.log('💰 Amount in paise:', paymentData.amount);

      // Open Razorpay checkout modal
      const checkoutResult = await paymentService.openCheckout({
        keyId: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        orderId: paymentData.razorpayOrderId,
        name: 'SpeedCopy',
        description: `Gifting Order - ${orderData.items.length} item(s)`,
        purpose: 'gifting_order',
      });

      console.log('✅ Payment completed:', checkoutResult);

      // Create order with payment details
      const finalOrderData = {
        ...orderData,
        razorpayOrderId: checkoutResult.razorpayOrderId || paymentData.razorpayOrderId,
        razorpayPaymentId: checkoutResult.razorpayPaymentId,
        razorpaySignature: checkoutResult.razorpaySignature,
        paymentStatus: 'completed',
      };

      const response = await orderService.createOrder(finalOrderData);
      const createdOrderId = response.data?._id;

      if (createdOrderId) {
        navigate(`/payment-success?orderId=${createdOrderId}&paymentId=${checkoutResult.razorpayPaymentId}`);
      } else {
        throw new Error('Order creation failed after payment');
      }

    } catch (error: any) {
      console.error('Razorpay payment failed:', error);
      if (error.message === 'Payment cancelled by user') {
        alert('Payment was cancelled. You can try again.');
      } else {
        alert(`Payment failed: ${error.message}`);
      }
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-2xl h-96" />
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = (orderSummary?.subtotal || 0) + (orderSummary?.deliveryFee || 0) - (orderSummary?.discount || 0);

  return (
    <>
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold mb-6" style={{ color: '#111111' }}>
          <ArrowLeft size={18} />
          Back to Cart
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left - Payment Methods & Address */}
          <div className="w-full lg:w-1/2">
            {/* Delivery Address Section */}
            <div className="mb-8">
              <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '20px' }}>Delivery Address</h2>
              <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>Select where you'd like your gifting order delivered.</p>
              
              {addresses.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {addresses.map((address, i) => (
                    <button
                      key={address._id || i}
                      onClick={() => setSelectedAddress(address)}
                      className="w-full text-left p-4 rounded-2xl transition"
                      style={{
                        border: selectedAddress?._id === address._id ? '2px solid #111111' : '1.5px solid #e5e7eb',
                        backgroundColor: selectedAddress?._id === address._id ? '#fafafa' : '#ffffff',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 mb-1">{address.label || address.fullName}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {address.line1}
                            {address.line2 && <>, {address.line2}</>}
                            <br />
                            {address.city}, {address.state} {address.pincode}
                          </p>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                          style={{ border: selectedAddress?._id === address._id ? 'none' : '1.5px solid #d1d5db', backgroundColor: selectedAddress?._id === address._id ? '#111111' : 'transparent' }}>
                          {selectedAddress?._id === address._id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-gray-300 mb-4">
                  <p className="text-gray-500 mb-3">No addresses found</p>
                  <button onClick={() => setShowAddressModal(true)}
                    className="px-4 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition">
                    Add Address
                  </button>
                </div>
              )}

              <button onClick={() => setShowAddressModal(true)}
                className="flex items-center gap-2 text-sm font-semibold text-black hover:text-gray-700 transition">
                <Plus size={16} />
                Add New Address
              </button>
            </div>

            {/* Payment Method */}
            <PaymentMethodSelector
              method={method}
              onSelect={setMethod}
              walletBalance={wallet?.balance || 0}
            />
          </div>

          {/* Right - Order Summary */}
          <div className="w-full lg:w-1/2 lg:flex-shrink-0">
            <div className="bg-white rounded-3xl p-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <h2 className="font-bold text-gray-900 mb-5" style={{ fontSize: '17px' }}>Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-3 mb-4 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                {(orderSummary?.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">₹{((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">₹{(orderSummary?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Delivery</span>
                  <span className="text-sm font-semibold text-gray-900">₹{(orderSummary?.deliveryFee || 0).toFixed(2)}</span>
                </div>
                {(orderSummary?.discount || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#9ca3af' }}>Discount</span>
                    <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>-₹{(orderSummary?.discount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 mb-5" style={{ borderTop: '1px solid #f3f4f6' }}>
                <span className="font-bold text-gray-900">Total Payable</span>
                <span className="font-bold text-gray-900" style={{ fontSize: '20px' }}>₹{totalAmount.toFixed(2)}</span>
              </div>

              <button 
                className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-full hover:bg-gray-700 transition disabled:opacity-50"
                style={{ backgroundColor: '#111111', fontSize: '14px' }}
                onClick={handlePayment}
                disabled={processing || !selectedAddress}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {processing ? 'Processing...' : `Pay ₹${totalAmount.toFixed(2)}`}
              </button>

              <p className="text-center text-xs mt-3 font-bold tracking-widest" style={{ color: '#9ca3af' }}>
                {method === 'wallet' ? 'SPEEDCOPY WALLET' : 'POWERED BY RAZORPAY'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showAddressModal && (
      <AddressModal
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        loading={savingAddress}
        editingAddress={editingAddress}
      />
    )}

    {/* Payment Processing Modal */}
    {processing && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2" style={{ fontSize: '18px' }}>Processing Payment</h3>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Please wait while we process your payment...</p>
          </div>
          
          <div className="space-y-3 mb-6 p-4 rounded-2xl" style={{ backgroundColor: '#f9fafb' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#9ca3af' }}>Amount</span>
              <span className="font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#9ca3af' }}>Payment Method</span>
              <span className="font-bold text-gray-900 capitalize">{method}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default GiftingCheckoutPage;
