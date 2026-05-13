import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import orderService from '../services/order.service';
import { useAuth } from '../context/AuthContext';

interface OrderDetail {
  _id: string;
  orderNumber: string;
  status: string;
  customerFacingStatus?: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    price?: number;
    flowType?: string;
    printConfig?: any;
    thumbnail?: string;
  }>;
  total?: number;
  totalAmount?: number;
  subtotal?: number;
  discount?: number;
  deliveryCharge?: number;
  shippingAddress?: any;
  deliveryAddress?: any;
  timeline?: Array<{
    status: string;
    note: string;
    timestamp: string;
  }>;
  paymentMethod?: string;
}

const STATUS_ORDER = ['pending','confirmed','in_production','qc_pending','ready_for_pickup','out_for_delivery','delivered'];

const StepIcon: React.FC<{ stepKey: string; done: boolean; active: boolean }> = ({ stepKey, done, active }) => {
  const bg = done || active ? '#111111' : '#e5e7eb';
  const fg = done || active ? '#ffffff' : '#9ca3af';

  const icons: Record<string, React.ReactNode> = {
    pending: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    confirmed: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    in_production: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v7a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-5h6v5" />
      </svg>
    ),
    qc_pending: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ready_for_pickup: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    out_for_delivery: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM13 8h4l3 3v5h-7V8z" />
      </svg>
    ),
    delivered: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  };

  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: bg, color: fg }}
    >
      {icons[stepKey] || (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      )}
    </div>
  );
};

const OrderDetailPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return; }
    if (orderId) fetchOrderDetail();
  }, [orderId, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrderById(orderId!);
      const orderData = (response as any).data || response;
      setOrder(orderData);
    } catch (_err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
          <button onClick={() => navigate('/orders')} className="px-6 py-2 bg-gray-900 text-white rounded-full">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  // Derive values
  const total = order.total ?? order.totalAmount ?? 0;
  const subtotal = order.subtotal ?? total;
  const discount = order.discount ?? 0;
  const deliveryCharge = order.deliveryCharge ?? 0;
  const address = order.shippingAddress || order.deliveryAddress;
  const currentStatusIdx = STATUS_ORDER.indexOf(order.status);

  // Build timeline: merge TIMELINE_STEPS with actual timeline entries
  // Deduplicate: show only unique steps (pending & confirmed both map to "Order Confirmed" — show once)
  const visibleSteps = [
    { key: 'pending',          label: 'Order Confirmed',   note: "We've received your request" },
    { key: 'in_production',    label: 'Printing',          note: 'Your order is being printed' },
    { key: 'out_for_delivery', label: 'Out for Delivery',  note: 'In Progress' },
    { key: 'delivered',        label: 'Delivered',         note: '' },
  ];

  const getStepState = (stepKey: string) => {
    const stepIdx = STATUS_ORDER.indexOf(stepKey);
    if (stepIdx < 0) return 'pending';
    if (stepIdx < currentStatusIdx) return 'done';
    if (stepIdx === currentStatusIdx) return 'active';
    return 'pending';
  };

  const getTimelineEntry = (stepKey: string) =>
    order.timeline?.find(t => t.status === stepKey);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Status badge label
  const statusLabel = order.customerFacingStatus || order.status.replace(/_/g, ' ');

  const downloadInvoice = () => {
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; padding: 48px; font-size: 14px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #111; }
          .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .brand span { color: #f97316; }
          .invoice-meta { text-align: right; }
          .invoice-meta h2 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          .invoice-meta p { color: #6b7280; font-size: 12px; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
          .info-block p { font-size: 13px; color: #374151; line-height: 1.7; }
          .info-block .name { font-weight: 600; color: #111; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #f9fafb; }
          th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
          td { padding: 12px 14px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
          td.right, th.right { text-align: right; }
          .totals { margin-left: auto; width: 260px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280; }
          .totals-row.total { border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 800; color: #111; }
          .totals-row.discount { color: #16a34a; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; background: #fff7ed; color: #f97316; border: 1px solid #fed7aa; }
          .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
          @media print {
            body { padding: 32px; }
            @page { margin: 0; size: A4; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">speedcopy<span>.</span></div>
            <p style="font-size:12px;color:#6b7280;margin-top:4px;">speedcopy.in</p>
          </div>
          <div class="invoice-meta">
            <h2>INVOICE</h2>
            <p>Order #${order.orderNumber}</p>
            <p>Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style="margin-top:6px;"><span class="status-badge">${statusLabel}</span></p>
          </div>
        </div>

        <div class="info-grid">
          ${address ? `
          <div class="info-block">
            <p class="section-title">Bill To</p>
            ${address.fullName ? `<p class="name">${address.fullName}</p>` : ''}
            <p>${address.line1 || ''}${address.line2 ? ', ' + address.line2 : ''}</p>
            <p>${address.city || ''}${address.state ? ', ' + address.state : ''} ${address.pincode || ''}</p>
            ${address.phone ? `<p>${address.phone}</p>` : ''}
          </div>` : '<div></div>'}
          <div class="info-block" style="text-align:right;">
            <p class="section-title">Payment Info</p>
            <p class="name">SpeedCopy Pvt. Ltd.</p>
            <p>Payment Method: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'Online'}</p>
            <p>Payment Status: Paid</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Flow</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item, i) => {
              const up = item.unitPrice ?? item.price ?? 0;
              const tp = item.totalPrice ?? (up * item.quantity);
              return `
              <tr>
                <td>${i + 1}</td>
                <td>${item.productName || 'Print Order'}</td>
                <td style="text-transform:capitalize;">${item.flowType || 'printing'}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">₹${up.toFixed(2)}</td>
                <td class="right">₹${tp.toFixed(2)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
          <div class="totals-row"><span>Shipping</span><span>${deliveryCharge === 0 ? 'Free' : '₹' + deliveryCharge.toFixed(2)}</span></div>
          ${discount > 0 ? `<div class="totals-row discount"><span>Discount</span><span>-₹${discount.toFixed(2)}</span></div>` : ''}
          <div class="totals-row total"><span>Total Paid</span><span>₹${total.toFixed(2)}</span></div>
        </div>

        <div class="footer">
          <p>Thank you for choosing SpeedCopy! For support, contact support@speedcopy.in</p>
          <p style="margin-top:4px;">This is a computer-generated invoice and does not require a signature.</p>
        </div>
        <script>window.onload = function(){ window.print(); }</script>
      </body>
      </html>
    `;

    // Create a blob and download as HTML file (opens print dialog automatically)
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${order.orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-5" style={{ color: '#9ca3af' }}>
          <button onClick={() => navigate('/')} className="hover:text-gray-700 transition">Home</button>
          <span>/</span>
          <button onClick={() => navigate('/orders')} className="hover:text-gray-700 transition">My Orders</button>
          <span>/</span>
          <span style={{ color: '#374151', fontWeight: 600 }}>Order #{order.orderNumber}</span>
        </div>

        {/* Page title + status badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="font-bold text-gray-900" style={{ fontSize: '26px' }}>
              Order #{order.orderNumber}
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '2px' }}>
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <span
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold capitalize self-start sm:self-auto"
            style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fff', color: '#374151' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
            {statusLabel}
          </span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT — Order Status + Product Details */}
          <div className="lg:col-span-3 space-y-5">

            {/* Order Status / Timeline */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e5e7eb' }}>
              <h2 className="font-bold text-gray-900 mb-6" style={{ fontSize: '17px' }}>Order Status</h2>

              <div className="space-y-0">
                {visibleSteps.map((step, idx) => {
                  const state = getStepState(step.key);
                  const done = state === 'done';
                  const active = state === 'active';
                  const entry = getTimelineEntry(step.key);
                  const isLast = idx === visibleSteps.length - 1;

                  return (
                    <div key={step.key} className="flex gap-4">
                      {/* Icon + connector line */}
                      <div className="flex flex-col items-center">
                        <StepIcon stepKey={step.key} done={done} active={active} />
                        {!isLast && (
                          <div
                            className="w-0.5 flex-1 my-1"
                            style={{
                              minHeight: '36px',
                              backgroundColor: done ? '#111111' : '#e5e7eb',
                            }}
                          />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 pb-6">
                        <p
                          className="font-semibold"
                          style={{
                            fontSize: '14px',
                            color: done || active ? '#111111' : '#9ca3af',
                          }}
                        >
                          {step.label}
                        </p>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {entry
                            ? `${entry.note} • ${formatTime(entry.timestamp)}`
                            : active
                            ? step.note
                            : step.note}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e5e7eb' }}>
              <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: '17px' }}>Product Details</h2>

              <div className="space-y-4">
                {order.items.map((item, idx) => {
                  const itemTotal = item.totalPrice ?? ((item.unitPrice ?? item.price ?? 0) * item.quantity);

                  return (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 rounded-xl"
                      style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
                    >
                      {/* Placeholder icon instead of image */}
                      <div
                        className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#e5e7eb' }}
                      >
                        <svg className="w-7 h-7" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 mb-1" style={{ fontSize: '14px' }}>
                          {item.productName || 'Print Order'}
                        </p>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
                          Flow: {item.flowType || 'printing'}
                        </p>

                        {/* Print config details if available */}
                        {item.printConfig && (
                          <div className="flex flex-wrap gap-4 mb-2">
                            {item.printConfig.pageSize && (
                              <div>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SIZE</p>
                                <p style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{item.printConfig.pageSize}</p>
                              </div>
                            )}
                            {item.printConfig.colorMode && (
                              <div>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COLOR</p>
                                <p style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{item.printConfig.colorMode}</p>
                              </div>
                            )}
                            {item.printConfig.printSide && (
                              <div>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TYPE</p>
                                <p style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{item.printConfig.printSide}</p>
                              </div>
                            )}
                            {item.printConfig.copies && (
                              <div>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>QUANTITY</p>
                                <p style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{item.printConfig.copies} Copies</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          <p style={{ fontSize: '12px', color: '#9ca3af' }}>Qty: {item.quantity}</p>
                          <p className="font-bold text-gray-900" style={{ fontSize: '15px' }}>
                            ₹{itemTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT — Price Summary + Delivery Address */}
          <div className="lg:col-span-2 space-y-5">

            {/* Price Summary */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e5e7eb' }}>
              <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: '17px' }}>Price Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Shipping</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: deliveryCharge === 0 ? '#16a34a' : '#111111' }}>
                    {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge.toFixed(2)}`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span style={{ fontSize: '14px', color: '#16a34a' }}>Discount</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#16a34a' }}>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

              <div className="flex items-center justify-between mb-5">
                <div>
                  {discount > 0 && (
                    <p className="line-through text-sm" style={{ color: '#9ca3af' }}>₹{(total + discount).toFixed(2)}</p>
                  )}
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>Total Paid</p>
                </div>
                <p className="font-bold" style={{ fontSize: '26px', color: '#111111' }}>₹{total.toFixed(2)}</p>
              </div>

              {/* Download Invoice button */}
              <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition hover:bg-gray-700"
                style={{ backgroundColor: '#111111', fontSize: '14px' }}
                onClick={downloadInvoice}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Invoice
              </button>
            </div>

            {/* Delivery Address */}
            {address && (
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }}>
                    <svg className="w-4 h-4" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                      DELIVERY ADDRESS
                    </p>
                    {address.fullName && (
                      <p className="font-semibold text-gray-900" style={{ fontSize: '14px' }}>{address.fullName}</p>
                    )}
                    <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
                      {address.line1}
                      {address.line2 && <>, {address.line2}</>}
                      <br />
                      {address.city}{address.state ? `, ${address.state}` : ''} {address.pincode}
                      {address.country && address.country !== 'India' && <><br />{address.country}</>}
                    </p>
                    {address.phone && (
                      <>
                        <p className="font-bold mt-3 mb-1" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                          CONTACT INFO
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>{address.phone}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold transition hover:bg-gray-100"
              style={{ border: '1px solid #e5e7eb', backgroundColor: '#fff', fontSize: '13px', color: '#6b7280' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need help with this order?
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
