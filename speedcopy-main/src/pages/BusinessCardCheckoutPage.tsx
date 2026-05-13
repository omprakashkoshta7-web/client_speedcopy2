import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, CreditCard, Wallet, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import AddressModal from '../components/AddressModal';
import paymentService from '../services/payment.service';
import walletService from '../services/wallet.service';
import orderService from '../services/order.service';
import userService from '../services/user.service';
import { useAuth } from '../context/AuthContext';

interface CardDesign {
  template: string;
  color: string;
  layout: string;
  text: {
    name: string;
    title: string;
    phone: string;
    email: string;
    website: string;
    address: string;
  };
}

const BusinessCardCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [cardDesign, setCardDesign] = useState<CardDesign | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [paperType, setPaperType] = useState<'standard' | 'premium' | 'luxury'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'wallet'>('razorpay');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  // Address management
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  // Pricing
  const pricePerCard = {
    standard: 2.5,
    premium: 4.0,
    luxury: 6.5,
  };

  const subtotal = quantity * pricePerCard[paperType];
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const design = location.state?.cardDesign || JSON.parse(localStorage.getItem('businessCardDesign') || 'null');
    
    if (!design) {
      alert('No card design found. Please design your card first.');
      navigate('/card-editor');
      return;
    }
    
    setCardDesign(design);
    fetchAddresses();
  }, [isAuthenticated, location.state, navigate]);

  const fetchAddresses = async () => {
    try {
      const response = await userService.getAddresses();
      const addressesData = response?.data || [];
      const parsedAddresses = Array.isArray(addressesData) ? addressesData : [];
      setAddresses(parsedAddresses);
      
      if (parsedAddresses.length > 0) {
        setSelectedAddress(parsedAddresses[0]);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      setAddresses([]);
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
    if (!cardDesign) return;
    
    if (!selectedAddress) {
      alert('Please select or add a delivery address');
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === 'razorpay') {
        const initiateRes = await walletService.initiateRazorpay(total, `card_${Date.now()}`);
        const paymentData = initiateRes.data;

        const keyId = paymentData?.keyId;
        const razorpayOrderId = paymentData?.razorpayOrderId;
        const amountInPaise = paymentData?.amount || Math.round(total * 100);
        const currency = paymentData?.currency || 'INR';

        if (!keyId || !amountInPaise) {
          throw new Error('Payment initialization failed.');
        }

        const checkoutResult = await paymentService.openCheckout({
          keyId,
          amount: amountInPaise,
          currency,
          orderId: razorpayOrderId,
          receipt: `card_${Date.now()}`,
          name: 'SpeedCopy',
          description: `Business Cards - ${quantity} cards`,
          purpose: 'order_payment',
        });

        const orderPayload = {
          items: [{
            productId: 'business_card_custom',
            productName: 'Custom Business Card',
            flowType: 'printing' as const,
            quantity,
            unitPrice: pricePerCard[paperType],
            totalPrice: subtotal,
            printConfig: {
              paperSize: 'Business Card',
              paperType,
              colorOption: 'color',
              bindingType: 'None',
              sides: 'Two-sided',
              copies: quantity,
              pages: 1,
            },
          }],
          shippingAddress: {
            fullName: selectedAddress.fullName || selectedAddress.label || 'Customer',
            phone: selectedAddress.phone || '',
            line1: selectedAddress.line1 || '',
            line2: selectedAddress.line2 || '',
            city: selectedAddress.city || 'Mumbai',
            state: selectedAddress.state || 'Maharashtra',
            pincode: selectedAddress.pincode || '400001',
            country: 'India',
          },
          subtotal,
          discount: 0,
          deliveryCharge: 0,
          total,
          paymentMethod: 'razorpay',
          razorpayOrderId: checkoutResult.razorpayOrderId,
          razorpayPaymentId: checkoutResult.razorpayPaymentId,
          razorpaySignature: checkoutResult.razorpaySignature,
          paymentStatus: 'paid',
        };

        const orderResponse = await orderService.createOrder(orderPayload);
        setOrderId(orderResponse.data.orderNumber || orderResponse.data._id);
        setSuccess(true);
        setLoading(false);
      } else if (paymentMethod === 'wallet') {
        // Handle wallet payment properly
        const orderPayload = {
          items: [{
            productId: 'business_card_custom',
            productName: 'Custom Business Card',
            flowType: 'printing' as const,
            quantity,
            unitPrice: pricePerCard[paperType],
            totalPrice: subtotal,
            printConfig: {
              paperSize: 'Business Card',
              paperType,
              colorOption: 'color',
              bindingType: 'None',
              sides: 'Two-sided',
              copies: quantity,
              pages: 1,
            },
          }],
          shippingAddress: {
            fullName: selectedAddress.fullName || selectedAddress.label || 'Customer',
            phone: selectedAddress.phone || '',
            line1: selectedAddress.line1 || '',
            line2: selectedAddress.line2 || '',
            city: selectedAddress.city || 'Mumbai',
            state: selectedAddress.state || 'Maharashtra',
            pincode: selectedAddress.pincode || '400001',
            country: 'India',
          },
          subtotal,
          discount: 0,
          deliveryCharge: 0,
          total,
          paymentMethod: 'wallet',
          paymentStatus: 'paid',
        };
        
        try {
          // First create the order
          const orderResponse = await orderService.createOrder(orderPayload);
          const createdOrderId = orderResponse.data?._id;
          
          if (createdOrderId) {
            // Process wallet payment
            const walletPaymentRes = await walletService.payOrderWithWallet(createdOrderId);
            
            if (walletPaymentRes.success && walletPaymentRes.data) {
              setOrderId(orderResponse.data.orderNumber || createdOrderId);
              setSuccess(true);
            } else {
              alert(walletPaymentRes.message || 'Payment failed. Please try again or use another payment method.');
              setLoading(false);
              return;
            }
          } else {
            throw new Error('Order creation failed');
          }
        } catch (walletErr: any) {
          console.error('Wallet payment error:', walletErr);
          alert(walletErr?.response?.data?.message || walletErr?.message || 'Failed to process wallet payment. Please try again.');
          setLoading(false);
          return;
        }
      }
    } catch (error: any) {
      console.error('❌ Payment failed:', error);
      
      if (error.message === 'Payment cancelled by user') {
        setLoading(false);
        return;
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Payment failed. Please try again.';
      alert(`❌ ${errorMessage}`);
      setLoading(false);
    }
  };

  if (!cardDesign) {
    return (
      <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-4 text-gray-600">Loading your design...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/card-editor')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
          >
            <ArrowLeft size={18} />
            Back to Editor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Configuration */}
          <div className="space-y-4">
            {/* Quantity */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h2 className="font-bold text-gray-900 text-base mb-3">Quantity</h2>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[100, 250, 500, 1000].map((qty) => (
                  <button
                    key={qty}
                    onClick={() => setQuantity(qty)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition ${
                      quantity === qty
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="50"
                max="10000"
                step="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(50, parseInt(e.target.value) || 50))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-gray-900"
                placeholder="Custom quantity"
              />
            </div>

            {/* Paper Quality */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h2 className="font-bold text-gray-900 text-base mb-3">Paper Quality</h2>
              <div className="space-y-2">
                {[
                  { id: 'standard', name: 'Standard', desc: '300 GSM', price: pricePerCard.standard },
                  { id: 'premium', name: 'Premium', desc: '350 GSM', price: pricePerCard.premium },
                  { id: 'luxury', name: 'Luxury', desc: '400 GSM', price: pricePerCard.luxury },
                ].map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => setPaperType(paper.id as any)}
                    className={`w-full p-3 rounded-lg text-left transition ${
                      paperType === paper.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{paper.name}</p>
                        <p className={`text-xs ${paperType === paper.id ? 'text-gray-300' : 'text-gray-500'}`}>{paper.desc}</p>
                      </div>
                      <p className="font-bold text-sm">₹{paper.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h2 className="font-bold text-gray-900 text-base mb-3">Delivery Address</h2>
              {addresses.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {addresses.map((address, i) => (
                    <button
                      key={address._id || i}
                      onClick={() => setSelectedAddress(address)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedAddress?._id === address._id
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <p className="font-semibold text-sm mb-1">{address.label || address.fullName}</p>
                      <p className={`text-xs ${selectedAddress?._id === address._id ? 'text-gray-300' : 'text-gray-600'}`}>
                        {address.line1}, {address.city} {address.pincode}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-lg bg-gray-50 mb-3">
                  <p className="text-gray-500 text-sm mb-2">No addresses found</p>
                </div>
              )}
              <button 
                onClick={() => setShowAddressModal(true)}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
              >
                + Add New Address
              </button>
            </div>
          </div>

          {/* Right - Summary */}
          <div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 sticky top-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>
              
              <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-semibold text-gray-900">{quantity} cards</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paper Type</span>
                  <span className="font-semibold text-gray-900 capitalize">{paperType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price per card</span>
                  <span className="font-semibold text-gray-900">₹{pricePerCard[paperType]}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (18%)</span>
                  <span className="font-semibold text-gray-900">₹{gst.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-5">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="font-bold text-gray-900 text-2xl">₹{total.toFixed(2)}</span>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-2">Payment Method</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`w-full p-3 rounded-lg text-left transition ${
                      paymentMethod === 'razorpay'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Razorpay</p>
                        <p className={`text-xs ${paymentMethod === 'razorpay' ? 'text-gray-300' : 'text-gray-500'}`}>UPI, Cards, Net Banking</p>
                      </div>
                      {paymentMethod === 'razorpay' && <Check size={16} />}
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    className={`w-full p-3 rounded-lg text-left transition ${
                      paymentMethod === 'wallet'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wallet size={16} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Wallet</p>
                        <p className={`text-xs ${paymentMethod === 'wallet' ? 'text-gray-300' : 'text-gray-500'}`}>Pay from wallet</p>
                      </div>
                      {paymentMethod === 'wallet' && <Check size={16} />}
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || !selectedAddress}
                className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Place Order
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                By placing this order, you agree to our terms
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl p-10 text-center w-full" style={{ maxWidth: '440px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#16a34a', boxShadow: '0 0 0 12px #dcfce7' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '22px' }}>Order Placed Successfully!</h2>
            <p className="text-sm mb-1" style={{ color: '#9ca3af' }}>Your business card order has been confirmed</p>
            <p className="font-bold text-gray-900 mb-2" style={{ fontSize: '18px' }}>Order ID: {orderId}</p>
            <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
              {quantity} cards • {paperType} paper • ₹{total.toFixed(2)}
            </p>
            <div className="space-y-3">
              <button onClick={() => navigate('/orders')} className="w-full py-3 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm" style={{ backgroundColor: '#111111' }}>
                View My Orders
              </button>
              <button onClick={() => navigate('/')} className="w-full py-3 font-bold rounded-full hover:bg-gray-100 transition text-sm" style={{ border: '1.5px solid #e5e7eb', color: '#374151' }}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <AddressModal
          onClose={() => {
            setShowAddressModal(false);
            setEditingAddress(null);
          }}
          onSave={handleSaveAddress}
          editingAddress={editingAddress}
          loading={savingAddress}
        />
      )}
    </div>
  );
};

export default BusinessCardCheckoutPage;
