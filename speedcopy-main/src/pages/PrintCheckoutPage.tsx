import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import walletService from '../services/wallet.service';
import paymentService from '../services/payment.service';
import productService, { extractStoresFromResponse, getStoreIdentifier } from '../services/product.service';
import orderService from '../services/order.service';
import PaymentMethodSelector, { type PaymentMethodType } from '../components/PaymentMethodSelector';

type PaymentMethod = PaymentMethodType;

const PrintCheckoutPage: React.FC = () => {
  const [method, setMethod] = useState<PaymentMethod>('razorpay');
  const [wallet, setWallet] = useState<any>(null);
  const [pickupLocation, setPickupLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [printConfig, setPrintConfig] = useState<any>(null);
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [isAddressFormExpanded, setIsAddressFormExpanded] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  
  const locationId = searchParams.get('locationId') || '';
  const configId = searchParams.get('configId') || '';
  const selectedPackage = searchParams.get('package') || '';

  useEffect(() => {
    fetchCheckoutData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching checkout data for locationId:', locationId);
      
      if (isAuthenticated) {
        // Fetch wallet
        const walletRes = await walletService.getBalance();
        setWallet(walletRes.data);
        
        // Fetch location details if locationId exists
        if (locationId) {
          // 1. First try sessionStorage cache (fastest)
          const cachedLocation = sessionStorage.getItem(`pickup_location_${locationId}`);
          if (cachedLocation) {
            try {
              const parsedLocation = JSON.parse(cachedLocation);
              setPickupLocation(parsedLocation);
              console.log('[PrintCheckout] Store loaded from sessionStorage cache');
            } catch (error) {
              console.warn('[PrintCheckout] Failed to parse cached pickup location:', error);
            }
          }

          // 2. If it's the default SpeedCopyHub, skip - no mock data
          if (locationId === 'speedcopyhub-main') {
            // legacy locationId - ignore mock store
          }
          // 3. Only call API if we have a real MongoDB ObjectId (not a default store)
          else if (/^[0-9a-fA-F]{24}$/.test(locationId)) {
            try {
              // Try to get user location for nearby search
              let storeParams: any = { limit: 100 };
              try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                );
                storeParams = { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 50, limit: 100 };
              } catch {
                // No location available - skip API call, rely on sessionStorage
                console.log('[PrintCheckout] No location available, skipping store API call');
              }

              if (storeParams.lat) {
                const [vendorRes, printingRes] = await Promise.allSettled([
                  productService.getNearbyVendorStores(storeParams),
                  productService.getPrintingPickupLocations(storeParams),
                ]);

                const allStores: any[] = [];
                if (vendorRes.status === 'fulfilled') allStores.push(...extractStoresFromResponse(vendorRes.value));
                if (printingRes.status === 'fulfilled') allStores.push(...extractStoresFromResponse(printingRes.value));

                const foundStore = allStores.find((store: any) => getStoreIdentifier(store) === locationId);
                if (foundStore) {
                  setPickupLocation(foundStore);
                  console.log('[PrintCheckout] Store loaded from API:', foundStore);
                }
              }
            } catch (error) {
              console.error('[PrintCheckout] Failed to fetch store from API:', error);
            }
          }
        }
        // Get print config from localStorage
        if (configId && configId !== 'undefined') {
          const savedConfig = localStorage.getItem(`printConfig_${configId}`);
          if (savedConfig) {
            setPrintConfig(JSON.parse(savedConfig));
            console.log('✅ Print config loaded:', JSON.parse(savedConfig));
          } else {
            // Fallback: find the most recent printConfig_* key in localStorage
            const keys = Object.keys(localStorage).filter(k => k.startsWith('printConfig_'));
            if (keys.length > 0) {
              // Sort by key name descending (temp_ keys have timestamps)
              keys.sort().reverse();
              const fallbackConfig = localStorage.getItem(keys[0]);
              if (fallbackConfig) {
                setPrintConfig(JSON.parse(fallbackConfig));
                console.log('✅ Print config loaded from fallback key:', keys[0]);
              }
            }
          }
        } else {
          // configId is missing or literally "undefined" — find most recent config
          const keys = Object.keys(localStorage).filter(k => k.startsWith('printConfig_'));
          if (keys.length > 0) {
            keys.sort().reverse();
            const fallbackConfig = localStorage.getItem(keys[0]);
            if (fallbackConfig) {
              setPrintConfig(JSON.parse(fallbackConfig));
              console.log('✅ Print config loaded from fallback (no configId):', keys[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch checkout data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!printConfig) return 0;
    
    // Service package pricing
    const servicePackages: Record<string, { name: string; price: number }> = {
      'standard': { name: 'Standard Package', price: 9 },
      'express': { name: 'Express Package', price: 14.5 },
      'instant': { name: 'Instant Package', price: 25 },
    };
    
    // Use the same pricing configuration as PrintConfigPage
    const pricingConfig = {
      basePrice: {
        'B&W': { 'A4': 2, 'A3': 4 },
        'color': { 'A4': 5, 'A3': 8 },
        'Custom': { 'A4': 3, 'A3': 6 }
      },
      printSideMultiplier: {
        'one-sided': 1,
        'Two-sided': 1.5,
        '4 in 1 (2 front+2 Back)': 0.8
      },
      graphSheetPrice: 3,
      processingFee: 5,
      bindingPrice: {
        'None': 0,
        'Soft Binding': 15,
        'Spiral Binding': 25,
        'Thesis Binding': 50
      },
      coverPagePrice: {
        'None': 0,
        'Transparent': 5,
        'Colored': 10,
        'Leather-finish': 20
      }
    };
    
    let total = 0;
    
    // Base printing cost
    const colorMode = printConfig.colorMode || 'B&W';
    const pageSize = printConfig.pageSize || 'A4';
    const printSide = printConfig.printSide || 'one-sided';
    const copies = printConfig.copies || 1;
    const totalPages = printConfig.totalPages || 0;
    const linearSheets = printConfig.linearSheets || 0;
    const semiLog = printConfig.semiLog || 0;
    const bindingType = printConfig.bindingType || 'None';
    const coverPage = printConfig.coverPage || 'None';
    
    if (colorMode && pageSize) {
      const baseRate = pricingConfig.basePrice[colorMode as keyof typeof pricingConfig.basePrice]?.[pageSize as 'A4' | 'A3'] || 2;
      const sideMultiplier = pricingConfig.printSideMultiplier[printSide as keyof typeof pricingConfig.printSideMultiplier] || 1;
      total += baseRate * totalPages * copies * sideMultiplier;
    }
    
    // Graph sheets cost
    total += (linearSheets + semiLog) * pricingConfig.graphSheetPrice;
    
    // Binding cost
    total += pricingConfig.bindingPrice[bindingType as keyof typeof pricingConfig.bindingPrice] || 0;
    
    // Cover page cost
    total += pricingConfig.coverPagePrice[coverPage as keyof typeof pricingConfig.coverPagePrice] || 0;
    
    // Processing fee
    total += pricingConfig.processingFee;
    
    // Add service package cost if selected
    if (selectedPackage && servicePackages[selectedPackage]) {
      total += servicePackages[selectedPackage].price;
    }
    
    return total;
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);

      // Validation: Check if print config exists
      if (!printConfig) {
        alert('Print configuration not found. Please go back and configure your print job.');
        setProcessing(false);
        return;
      }

      // Validation: Check if pickup location is selected (only required if no service package selected)
      // Service packages are for delivery, so they need a delivery address
      if (!selectedPackage && (!pickupLocation || !locationId)) {
        alert('Please select a pickup location before proceeding with payment.');
        setProcessing(false);
        return;
      }

      // Validation: delivery address required for service packages
      if (selectedPackage && (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode)) {
        alert('Please fill in all delivery address fields.');
        setProcessing(false);
        return;
      }

      const totalAmount = calculateTotal();

      // Validation: Check amount
      if (totalAmount <= 0) {
        alert('Invalid order amount. Please check your print configuration.');
        setProcessing(false);
        return;
      }

      // Check wallet balance only if wallet payment is selected
      if (method === 'wallet') {
        const walletBalance = wallet?.balance || 0;
        if (walletBalance < totalAmount) {
          alert(`Insufficient wallet balance. You have ₹${walletBalance.toFixed(2)} but need ₹${totalAmount.toFixed(2)}.`);
          setProcessing(false);
          return;
        }
      }

      if (isAuthenticated) {
        // Validate pickup location has required fields (only if no service package)
        // For delivery packages, we'll use a default delivery address
        let phoneNumber = '9999999999';
        let addressLine1 = 'Home Delivery';
        let cityName = 'Mumbai';
        let stateName = 'Maharashtra';
        let pincodeName = '400001';
        
        if (pickupLocation) {
          // Use pickup location details if available
          phoneNumber = pickupLocation?.phone || pickupLocation?.contact || '';
          
          // Clean phone number (remove spaces, dashes, etc.)
          phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
          
          // If phone is still empty or invalid, use a default
          if (!phoneNumber || phoneNumber.length < 10) {
            phoneNumber = '9999999999';  // Valid default instead of 0000000000
          }
          
          // Ensure address is properly formatted
          addressLine1 = '';
          
          // Try to get a proper address line
          if (pickupLocation?.address) {
            if (typeof pickupLocation.address === 'string') {
              addressLine1 = pickupLocation.address;
            } else if (pickupLocation.address.line1) {
              addressLine1 = pickupLocation.address.line1;
            } else {
              // Build address from components
              const parts = [
                pickupLocation.address.street,
                pickupLocation.address.area,
                pickupLocation.address.landmark
              ].filter(Boolean);
              addressLine1 = parts.join(', ') || 'Store Address';
            }
          }
          
          // Fallback to store name if no address
          if (!addressLine1 || addressLine1.trim() === '') {
            addressLine1 = pickupLocation?.name || 'Pickup Location';
          }
          
          // Validate address is not just city/state/pincode
          if (addressLine1.includes('Mumbai, Maharashtra') && addressLine1.length < 30) {
            addressLine1 = `${pickupLocation?.name || 'Store'}, ${addressLine1}`;
          }
          
          cityName = pickupLocation?.city || pickupLocation?.address?.city || 'Mumbai';
          stateName = pickupLocation?.state || pickupLocation?.address?.state || 'Maharashtra';
          pincodeName = String(pickupLocation?.pincode || pickupLocation?.pinCode || pickupLocation?.address?.pincode || '400001');
        } else if (selectedPackage) {
          // For delivery packages, use the address entered by the user
          phoneNumber = deliveryAddress.phone.replace(/[^0-9]/g, '') || '9999999999';
          addressLine1 = deliveryAddress.line1 || 'Home Delivery';
          cityName    = deliveryAddress.city  || 'Mumbai';
          stateName   = deliveryAddress.state || 'Maharashtra';
          pincodeName = deliveryAddress.pincode || '400001';
        }

        // Build order data with only required fields
        const orderData: any = {
          items: [{
            productId: 'print-job',
            productName: 'Document Printing',
            flowType: 'printing' as const,
            quantity: printConfig.copies || 1,
            unitPrice: Math.round(totalAmount / (printConfig.copies || 1)),
            totalPrice: Math.round(totalAmount),
          }],
          shippingAddress: {
            fullName: pickupLocation?.name || (selectedPackage ? (deliveryAddress.fullName || 'Customer') : 'Pickup Location'),
            phone: phoneNumber,
            line1: addressLine1,
            city: cityName,
            state: stateName,
            pincode: pincodeName,
          },
          subtotal: Math.round(totalAmount),
          total: Math.round(totalAmount),
        };

        // Add optional fields only if they have values
        // Only add pickupShopId if it's a valid MongoDB ObjectId (24 hex characters)
        if (locationId && /^[0-9a-fA-F]{24}$/.test(locationId)) {
          orderData.pickupShopId = locationId;
        }
        
        // Add discount and delivery charge (set to 0)
        orderData.discount = 0;
        orderData.deliveryCharge = 0;
        
        // Add payment method
        if (method) {
          orderData.paymentMethod = method;
        }

        console.log('🔍 Order data before sending:', JSON.stringify(orderData, null, 2));
        console.log('🔍 Print config:', printConfig);
        console.log('🔍 Pickup location:', pickupLocation);
        console.log('🔍 Total amount:', totalAmount);

        // Create order based on payment method
        if (method === 'wallet') {
          try {
            const response = await orderService.createOrder(orderData);
            const createdOrder = response.data;
            const createdOrderId = createdOrder?._id;
            
            if (createdOrderId) {
              // Now process wallet payment
              const walletPaymentRes = await walletService.payOrderWithWallet(createdOrderId);
              
              if (walletPaymentRes.success && walletPaymentRes.data) {
                navigate(`/payment-success?orderId=${createdOrderId}&paymentMethod=wallet&status=success`);
              } else {
                alert(walletPaymentRes.message || 'Payment failed. Please try again or use another payment method.');
                setProcessing(false);
                return;
              }
            } else {
              throw new Error('Order creation failed');
            }
          } catch (walletErr: any) {
            console.error('Wallet payment error:', walletErr);
            alert(walletErr?.response?.data?.message || walletErr?.message || 'Failed to process wallet payment. Please try again.');
            setProcessing(false);
            return;
          }
        } else {
          // Razorpay payment for card, UPI, netbanking
          await handleRazorpayPayment(orderData, totalAmount);
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      
      // Extract validation errors if present
      let errorMessage = 'Payment failed. Please try again.';
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errors = err.response.data.errors;
        console.error('❌ Validation errors:', errors);
        
        // Show first error to user
        if (errors.length > 0) {
          const firstError = errors[0];
          errorMessage = `Validation failed: ${firstError.field || 'Field'} - ${firstError.message || firstError}`;
        }
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      alert(`Payment failed: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayPayment = async (orderData: any, totalAmount: number) => {
    try {
      console.log('🎯 Starting Razorpay payment for amount:', totalAmount);

      // 1) Initiate via wallet service
      const initiateRes = await walletService.initiateRazorpay(totalAmount, `print_${Date.now()}`);
      const paymentData = initiateRes.data;

      console.log('🔑 Using Razorpay key:', paymentData.keyId?.substring(0, 8) + '...');
      console.log('📦 Razorpay Order ID:', paymentData.razorpayOrderId);
      console.log('💰 Amount in paise:', paymentData.amount);

      // 2) Open Razorpay checkout via paymentService
      const checkoutResult = await paymentService.openCheckout({
        keyId: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        orderId: paymentData.razorpayOrderId,
        name: 'SpeedCopy',
        description: `Print Job - ${printConfig?.totalPages || 0} pages`,
      });

      console.log('✅ Payment completed, creating order...');

      // 3) Create order after successful payment
      const response = await orderService.createOrder(orderData);
      const createdOrderId = response.data?._id;

      if (createdOrderId) {
        console.log('✅ Order created successfully:', createdOrderId);
        
        // Store payment details separately for reference
        sessionStorage.setItem(`order_payment_${createdOrderId}`, JSON.stringify({
          razorpayPaymentId: checkoutResult.razorpayPaymentId,
          razorpayOrderId: checkoutResult.razorpayOrderId || paymentData.razorpayOrderId,
          razorpaySignature: checkoutResult.razorpaySignature,
          paymentStatus: 'completed',
        }));
        
        navigate(`/payment-success?orderId=${createdOrderId}&paymentId=${checkoutResult.razorpayPaymentId}`);
      } else {
        throw new Error('Order creation failed after payment');
      }

    } catch (error: any) {
      console.error('❌ Razorpay payment failed:', error);
      
      // Don't show error for user cancellation
      if (error.message === 'Payment cancelled by user') {
        console.log('ℹ️ User cancelled payment');
        return;
      }
      
      // For other errors, show user-friendly message
      throw error;
    }
  };

  const formatStoreAddress = (address: any) => {
    if (!address) return 'Address not available';
    if (typeof address === 'string') return address;

    const parts = [address.line1, address.line2, address.city, address.state, address.pincode]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Address not available';
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

  const totalAmount = calculateTotal();

  console.log('🎨 Rendering PrintCheckoutPage with:', {
    locationId,
    configId,
    pickupLocation,
    printConfig,
    loading,
  });

  return (
    <>
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold mb-6" style={{ color: '#111111' }}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left - Payment Methods & Pickup Location / Delivery Address */}
          <div className="w-full lg:w-1/2">
            {/* Delivery Address — shown when a service package is selected */}
            {selectedPackage && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '20px' }}>Delivery Address</h2>
                <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>Enter the address where your order should be delivered.</p>

                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb' }}>
                  {/* Collapsed summary — shown when all fields filled and form is collapsed */}
                  {!isAddressFormExpanded && deliveryAddress.fullName && deliveryAddress.phone && deliveryAddress.line1 && deliveryAddress.city && deliveryAddress.state && deliveryAddress.pincode ? (
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0fdf4' }}>
                          <MapPin size={18} style={{ color: '#16a34a' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{deliveryAddress.fullName} · {deliveryAddress.phone}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{deliveryAddress.line1}, {deliveryAddress.city}, {deliveryAddress.state} – {deliveryAddress.pincode}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAddressFormExpanded(true)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
                        style={{ backgroundColor: '#f3f4f6', color: '#111' }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    /* Expanded form */
                    <div className="p-5 space-y-3">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                        <input
                          type="text"
                          placeholder="Enter full name"
                          value={deliveryAddress.fullName}
                          onChange={e => setDeliveryAddress(a => ({ ...a, fullName: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition"
                          style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                          onFocus={e => (e.target.style.borderColor = '#111')}
                          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          value={deliveryAddress.phone}
                          onChange={e => setDeliveryAddress(a => ({ ...a, phone: e.target.value.replace(/\D/g, '') }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition"
                          style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                          onFocus={e => (e.target.style.borderColor = '#111')}
                          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                        />
                      </div>

                      {/* Address Line */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label>
                        <input
                          type="text"
                          placeholder="House no., Street, Area, Landmark"
                          value={deliveryAddress.line1}
                          onChange={e => setDeliveryAddress(a => ({ ...a, line1: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition"
                          style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                          onFocus={e => (e.target.style.borderColor = '#111')}
                          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                        />
                      </div>

                      {/* City + State */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">City *</label>
                          <input
                            type="text"
                            placeholder="City"
                            value={deliveryAddress.city}
                            onChange={e => setDeliveryAddress(a => ({ ...a, city: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition"
                            style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                            onFocus={e => (e.target.style.borderColor = '#111')}
                            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">State *</label>
                          <input
                            type="text"
                            placeholder="State"
                            value={deliveryAddress.state}
                            onChange={e => setDeliveryAddress(a => ({ ...a, state: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition"
                            style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                            onFocus={e => (e.target.style.borderColor = '#111')}
                            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                          />
                        </div>
                      </div>

                      {/* Pincode */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Pincode *</label>
                        <input
                          type="text"
                          placeholder="6-digit pincode"
                          maxLength={6}
                          value={deliveryAddress.pincode}
                          onChange={e => setDeliveryAddress(a => ({ ...a, pincode: e.target.value.replace(/\D/g, '') }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition"
                          style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                          onFocus={e => (e.target.style.borderColor = '#111')}
                          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                        />
                      </div>

                      {/* Save / Confirm button */}
                      {deliveryAddress.fullName && deliveryAddress.phone && deliveryAddress.line1 && deliveryAddress.city && deliveryAddress.state && deliveryAddress.pincode && (
                        <button
                          onClick={() => setIsAddressFormExpanded(false)}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition"
                          style={{ backgroundColor: '#111' }}
                        >
                          Save Address
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pickup Location Section — shown when no service package */}
            {!selectedPackage && pickupLocation && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '20px' }}>Pickup Location</h2>
                <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>Your order will be ready at this location.</p>
                
                <div className="p-5 rounded-2xl bg-white" style={{ border: '1.5px solid #e5e7eb' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0fdf4' }}>
                      <MapPin size={24} style={{ color: '#16a34a' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-1">{pickupLocation.name}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{formatStoreAddress(pickupLocation.address)}</p>
                      {pickupLocation.phone && (
                        <p className="text-sm text-gray-500 mt-2">📞 {pickupLocation.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!selectedPackage && !pickupLocation && locationId && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '20px' }}>Pickup Location</h2>
                <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>Loading pickup location details...</p>
                
                <div className="p-5 rounded-2xl bg-white" style={{ border: '1.5px solid #e5e7eb' }}>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              </div>
            )}

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
              
              {/* Print Details — full breakdown */}
              {printConfig && (() => {
                const pricingConfig = {
                  basePrice: {
                    'B&W':    { 'A4': 2, 'A3': 4 },
                    'color':  { 'A4': 5, 'A3': 8 },
                    'Custom': { 'A4': 3, 'A3': 6 },
                  },
                  printSideMultiplier: {
                    'one-sided':              1,
                    'Two-sided':              1.5,
                    '4 in 1 (2 front+2 Back)': 0.8,
                  },
                  graphSheetPrice: 3,
                  processingFee: 5,
                  bindingPrice: { 'None': 0, 'Soft Binding': 15, 'Spiral Binding': 25, 'Thesis Binding': 50 },
                  coverPagePrice: { 'None': 0, 'Transparent': 5, 'Colored': 10, 'Leather-finish': 20 },
                };
                const servicePackages: Record<string, { name: string; price: number; desc: string }> = {
                  'standard': { name: 'Standard Package', price: 9,    desc: 'Ready in 3 days' },
                  'express':  { name: 'Express Package',  price: 14.5, desc: 'Ready in 24 hours' },
                  'instant':  { name: 'Instant Package',  price: 25,   desc: 'Delivered within 4 hours' },
                };

                const colorMode   = printConfig.colorMode  || 'B&W';
                const pageSize    = printConfig.pageSize    || 'A4';
                const printSide   = printConfig.printSide   || 'one-sided';
                const copies      = printConfig.copies      || 1;
                const totalPages  = printConfig.totalPages  || 0;
                const linearSheets = printConfig.linearSheets || 0;
                const semiLog     = printConfig.semiLog     || 0;
                const bindingType = printConfig.bindingType || 'None';
                const coverPage   = printConfig.coverPage   || 'None';

                const baseRate       = pricingConfig.basePrice[colorMode as keyof typeof pricingConfig.basePrice]?.[pageSize as 'A4' | 'A3'] || 2;
                const sideMultiplier = pricingConfig.printSideMultiplier[printSide as keyof typeof pricingConfig.printSideMultiplier] || 1;
                const printCost      = baseRate * totalPages * copies * sideMultiplier;
                const graphCost      = (linearSheets + semiLog) * pricingConfig.graphSheetPrice;
                const bindingCost    = pricingConfig.bindingPrice[bindingType as keyof typeof pricingConfig.bindingPrice] || 0;
                const coverCost      = pricingConfig.coverPagePrice[coverPage as keyof typeof pricingConfig.coverPagePrice] || 0;
                const processingFee  = pricingConfig.processingFee;
                const pkgCost        = selectedPackage ? (servicePackages[selectedPackage]?.price || 0) : 0;

                const Row = ({ label, sub, amount }: { label: string; sub?: string; amount: number }) => (
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      {sub && <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{sub}</p>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-4">₹{amount.toFixed(2)}</p>
                  </div>
                );

                return (
                  <div className="mb-4 pb-2" style={{ borderBottom: '2px solid #f3f4f6' }}>
                    {/* Base print cost */}
                    <Row
                      label="Printing"
                      sub={`${totalPages} pages × ${copies} ${copies > 1 ? 'copies' : 'copy'} · ${colorMode} · ${pageSize} · ${printSide}`}
                      amount={printCost}
                    />

                    {/* Graph sheets */}
                    {linearSheets > 0 && (
                      <Row label="Linear Graph Sheets" sub={`${linearSheets} sheet${linearSheets > 1 ? 's' : ''} × ₹${pricingConfig.graphSheetPrice}`} amount={linearSheets * pricingConfig.graphSheetPrice} />
                    )}
                    {semiLog > 0 && (
                      <Row label="Semi-Log Graph Sheets" sub={`${semiLog} sheet${semiLog > 1 ? 's' : ''} × ₹${pricingConfig.graphSheetPrice}`} amount={semiLog * pricingConfig.graphSheetPrice} />
                    )}

                    {/* Binding */}
                    {bindingType !== 'None' && bindingCost > 0 && (
                      <Row label={bindingType} sub="Binding service" amount={bindingCost} />
                    )}

                    {/* Cover page */}
                    {coverPage !== 'None' && coverCost > 0 && (
                      <Row label={`${coverPage} Cover`} sub="Cover page" amount={coverCost} />
                    )}

                    {/* Service package */}
                    {selectedPackage && servicePackages[selectedPackage] && (
                      <Row label={servicePackages[selectedPackage].name} sub={servicePackages[selectedPackage].desc} amount={pkgCost} />
                    )}

                    {/* Processing fee */}
                    <Row label="Processing Fee" sub="Handling & platform fee" amount={processingFee} />

                    {/* Graph cost combined line if both exist — skip, already shown individually above */}
                    {graphCost === 0 && linearSheets === 0 && semiLog === 0 ? null : null}
                  </div>
                );
              })()}

              {/* Totals */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Delivery</span>
                  <span className="text-sm font-semibold text-gray-900">₹0.00</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mb-5" style={{ borderTop: '1px solid #f3f4f6' }}>
                <span className="font-bold text-gray-900">Total Payable</span>
                <span className="font-bold text-gray-900" style={{ fontSize: '20px' }}>₹{totalAmount.toFixed(2)}</span>
              </div>

              <button 
                className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: ((!pickupLocation && !selectedPackage) || !printConfig || processing || (selectedPackage && (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode))) ? '#9ca3af' : '#111111' }}
                onClick={handlePayment}
                disabled={processing || (!pickupLocation && !selectedPackage) || !printConfig || (!!selectedPackage && (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode))}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {processing ? 'Processing...' : 
                 (!pickupLocation && !selectedPackage) ? 'Select Pickup Location or Service Package' :
                 !printConfig ? 'Configure Print Job' :
                 (selectedPackage && (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode)) ? 'Fill Delivery Address' :
                 method === 'gpay' ? `Pay with Google Pay ₹${totalAmount.toFixed(2)}` :
                 method === 'phonepe' ? `Pay with PhonePe ₹${totalAmount.toFixed(2)}` :
                 `Pay ₹${totalAmount.toFixed(2)}`}
              </button>

              <p className="text-center text-xs mt-3 font-bold tracking-widest" style={{ color: '#9ca3af' }}>
                {method === 'wallet' ? 'SPEEDCOPY WALLET' : method === 'gpay' ? 'VIA GOOGLE PAY · RAZORPAY' : method === 'phonepe' ? 'VIA PHONEPE · RAZORPAY' : 'POWERED BY RAZORPAY'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Payment Processing Modal */}
    {processing && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
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

export default PrintCheckoutPage;
