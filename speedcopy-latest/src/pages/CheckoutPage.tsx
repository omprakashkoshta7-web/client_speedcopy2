import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import AddressModal from '../components/AddressModal';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/order.service';
import walletService from '../services/wallet.service';
import userService from '../services/user.service';
import paymentService from '../services/payment.service';
import PaymentMethodSelector, { type PaymentMethodType } from '../components/PaymentMethodSelector';

type PaymentMethod = PaymentMethodType;

const CheckoutPage: React.FC = () => {
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
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Delivery info passed from product page pincode check
  const deliveryInfo = (location.state as any)?.estimatedDelivery ? {
    pincode: (location.state as any).deliveryPincode,
    city: (location.state as any).deliveryCity,
    state: (location.state as any).deliveryState,
    estimatedDelivery: (location.state as any).estimatedDelivery,
    orderNote: (location.state as any).orderNote,
  } : null;

  useEffect(() => {
    fetchCheckoutData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      // Check if address was passed from AddressPage via "Deliver Here"
      const passedAddress = (location.state as any)?.selectedAddress;
      if (passedAddress) {
        setSelectedAddress(passedAddress);
        setAddresses([passedAddress]);
      }
      if (isAuthenticated) {
        // Fetch cart and wallet first (critical)
        const [cartRes, walletRes] = await Promise.all([
          orderService.getCart(),
          walletService.getBalance()
        ]);

        // Filter cart items by flow if passed from CartPage
        const flowFilter = (location.state as any)?.flow || '';
        const rawCart = cartRes.data || cartRes || {};
        const allItems = rawCart.items || [];
        const filteredItems = flowFilter
          ? allItems.filter((item: any) => item.flowType === flowFilter)
          : allItems;
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
        
        // Fetch addresses separately with error handling
        try {
          const addressRes = await userService.getAddresses();
          const addressesData = addressRes?.data || [];
          const parsedAddresses = Array.isArray(addressesData) ? addressesData : [];
          setAddresses(parsedAddresses);
          // Only auto-select if no address was passed via state
          if (!passedAddress && parsedAddresses.length > 0) {
            setSelectedAddress(parsedAddresses[0]);
          }
        } catch (addressErr: any) {
          console.error('Failed to fetch addresses:', addressErr);
          // If addresses fail, just set empty array - user can add address later
          if (!passedAddress) {
            setAddresses([]);
          }
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
    const formatted = {
      label: addressData.type || 'Home',
      fullName: addressData.name,
      phone: addressData.phone,
      houseNo: addressData.house || '',
      area: addressData.area || '',
      landmark: addressData.landmark || '',
      line1: `${addressData.house || ''}, ${addressData.area || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, ''),
      line2: addressData.landmark || '',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: addressData.pincode,
      country: 'India',
      isDefault: addressData.isDefault || false,
    };
    try {
      if (editingAddress) {
        // Update existing address
        const response = await userService.updateAddress(editingAddress._id, formatted);
        const updatedAddress = response.data;
        setAddresses(addresses.map(a => a._id === editingAddress._id ? updatedAddress : a));
        if (selectedAddress?._id === editingAddress._id) {
          setSelectedAddress(updatedAddress);
        }
      } else {
        // Create new address
        const response = await userService.addAddress(formatted);
        const newAddress = response.data;
        setAddresses([...addresses, newAddress]);
        setSelectedAddress(newAddress);
      }
    } catch (err) {
      console.error('Failed to save address:', err);
      // save locally if backend down
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

  const handleDeleteAddress = async (addressId: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      setDeletingAddressId(addressId);
      await userService.deleteAddress(addressId);
      const updated = addresses.filter(a => a._id !== addressId);
      setAddresses(updated);
      
      // If deleted address was selected, select the first available
      if (selectedAddress?._id === addressId) {
        setSelectedAddress(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
      // Still remove locally if backend fails
      const updated = addresses.filter(a => a._id !== addressId);
      setAddresses(updated);
      if (selectedAddress?._id === addressId) {
        setSelectedAddress(updated.length > 0 ? updated[0] : null);
      }
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setShowAddressModal(true);
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

      // Check wallet balance if payment method is wallet
      const subtotal = cartItems.reduce((sum: number, item: any) => sum + ((item.unitPrice || item.price || 0) * (item.quantity || 1)), 0);
      const deliveryCharge = orderSummary?.deliveryFee || 0;
      const discount = orderSummary?.discount || 0;
      const totalAmount = subtotal + deliveryCharge - discount;

      if (method === 'wallet') {
        const walletBalance = wallet?.balance || 0;
        if (walletBalance < totalAmount) {
          alert(`Insufficient wallet balance. You have ₹${walletBalance.toFixed(2)} but need ₹${totalAmount.toFixed(2)}. Please add funds to your wallet or choose another payment method.`);
          setProcessing(false);
          return;
        }
      }

      if (isAuthenticated) {
        const items = cartItems.map((item: any) => ({
          productId: item.productId || item.id || 'unknown',
          productName: item.productName || item.name || 'Product',
          flowType: item.flowType || 'shopping',
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
          // Wallet payment - direct order creation
          const response = await orderService.createOrder(orderData);
          const createdOrderId = response.data?._id;
          
          if (createdOrderId) {
            navigate(`/payment-success?orderId=${createdOrderId}`);
          } else {
            throw new Error('Order creation failed');
          }
        } else {
          // Razorpay payment for card, UPI, netbanking
          await handleRazorpayPayment(orderData, totalAmount);
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      const errData = err?.response?.data;
      const detail = errData?.errors?.join(', ') || errData?.error?.message || errData?.message || err.message || 'Unknown error';
      console.error('Order creation error:', errData);
      alert(`Order creation failed: ${detail}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayPayment = async (orderData: any, totalAmount: number) => {
    try {
      // 1) Initiate Razorpay order via wallet service (same as AddFundsPage)
      const initiateRes = await walletService.initiateRazorpay(
        totalAmount,
        `order_${Date.now()}`
      );
      const paymentData = initiateRes.data;

      console.log('💳 Razorpay initiate response:', paymentData);

      // 2) Open Razorpay checkout
      const checkoutResult = await paymentService.openCheckout({
        keyId: paymentData.keyId,
        amount: paymentData.amount,       // already in paise from backend
        currency: paymentData.currency || 'INR',
        orderId: paymentData.razorpayOrderId,
        name: 'SpeedCopy',
        description: `Shopping Order - ${orderData.items.length} item(s)`,
      });

      console.log('✅ Checkout result:', checkoutResult);

      // 3) Create order with payment details (no wallet verify needed for order payment)
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

  return (
    <>
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <BackButton label="Back" className="mb-6" />
        <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">

          {/* Left - Address + Payment in one card */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="bg-white rounded-3xl p-5 flex-1" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

              {/* Delivery Address Section */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-900" style={{ fontSize: '15px' }}>Delivery Address</h2>
                  <button onClick={() => setShowAddressModal(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New
                  </button>
                </div>

                {addresses.length > 0 ? (
                  <div className="space-y-2">
                    {addresses.map((address, i) => (
                      <button
                        key={address._id || i}
                        onClick={() => setSelectedAddress(address)}
                        className="w-full text-left px-3 py-2.5 rounded-xl transition"
                        style={{
                          border: selectedAddress?._id === address._id ? '2px solid #111111' : '1.5px solid #e5e7eb',
                          backgroundColor: selectedAddress?._id === address._id ? '#fafafa' : '#ffffff',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ border: selectedAddress?._id === address._id ? 'none' : '1.5px solid #d1d5db', backgroundColor: selectedAddress?._id === address._id ? '#111111' : 'transparent' }}>
                              {selectedAddress?._id === address._id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-xs">{address.label || address.fullName}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {address.line1}, {address.city}, {address.state} {address.pincode}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditAddress(address); }}
                              className="px-2 py-1 text-xs font-semibold rounded-lg transition"
                              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                            >Edit</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAddress(address._id); }}
                              disabled={deletingAddressId === address._id}
                              className="px-2 py-1 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                            >Del</button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 px-4 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 mb-2">No addresses saved</p>
                    <button onClick={() => setShowAddressModal(true)}
                      className="px-4 py-1.5 bg-black text-white rounded-full text-xs font-semibold hover:bg-gray-800 transition">
                      Add Address
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: '16px' }} />
              <PaymentMethodSelector
                method={method}
                onSelect={setMethod}
                walletBalance={wallet?.balance || 0}
              />
            </div>
          </div>

          {/* Right - Order Summary */}
          <div className="w-full lg:w-1/2 lg:flex-shrink-0 flex flex-col">
            <div className="bg-white rounded-3xl p-6 flex-1 flex flex-col" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <h2 className="font-bold text-gray-900 mb-5" style={{ fontSize: '17px' }}>Order Summary</h2>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Item Total</span>
                  <span className="text-sm font-semibold text-gray-900">₹{(orderSummary?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Delivery Fee</span>
                  <span className="text-sm font-semibold text-gray-900">₹{(orderSummary?.deliveryFee || 0).toFixed(2)}</span>
                </div>
                {(orderSummary?.discount || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#9ca3af' }}>🏷 Discount</span>
                    <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>-₹{(orderSummary?.discount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 mb-5" style={{ borderTop: '1px solid #f3f4f6' }}>
                <span className="font-bold text-gray-900">Total Payable</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900" style={{ fontSize: '20px' }}>₹{((orderSummary?.subtotal || 0) + (orderSummary?.deliveryFee || 0) - (orderSummary?.discount || 0)).toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery info from pincode check */}
              {deliveryInfo && (                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs font-bold" style={{ color: '#166534' }}>
                      Delivering to {deliveryInfo.city}, {deliveryInfo.state} – {deliveryInfo.pincode}
                    </p>
                  </div>
                  <div className="ml-5 space-y-1">
                    <p className="text-xs font-semibold" style={{ color: '#15803d' }}>
                      📅 Expected by: {deliveryInfo.estimatedDelivery}
                    </p>
                    <p className="text-xs" style={{ color: '#15803d' }}>
                      🕐 {deliveryInfo.orderNote} · Cutoff: 2:00 PM
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-auto pt-2">
              <button 
                className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-full hover:bg-gray-700 transition disabled:opacity-50"
                style={{ backgroundColor: '#111111', fontSize: '14px' }}
                onClick={handlePayment}
                disabled={processing}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {processing ? 'Processing Payment...' : `Pay ₹${((orderSummary?.subtotal || 0) + (orderSummary?.deliveryFee || 0) - (orderSummary?.discount || 0)).toFixed(2)} Securely`}
              </button>
              <p className="text-center text-xs mt-3 font-bold tracking-widest" style={{ color: '#9ca3af' }}>GUARANTEED SAFE CHECKOUT</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                {['SSL SECURE', 'PCI COMPLIANT', '256-BIT'].map(t => (
                  <span key={t} className="text-xs" style={{ color: '#9ca3af' }}>{t}</span>
                ))}
              </div>

              {/* Free cancellation — inside card */}
              <div className="mt-4 pt-4 flex items-start gap-2" style={{ borderTop: '1px solid #f3f4f6' }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-gray-700 text-xs">Free cancellation policy</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Cancel within 10 minutes of placing for a full refund.</p>
                </div>
              </div>
              </div>
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
              <span className="font-bold text-gray-900">₹{((orderSummary?.subtotal || 0) + (orderSummary?.deliveryFee || 0) - (orderSummary?.discount || 0)).toFixed(2)}</span>
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

export default CheckoutPage;
