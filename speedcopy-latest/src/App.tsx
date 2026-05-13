import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import TopLoadingBar from './components/TopLoadingBar';
import useAxiosLoader from './hooks/useAxiosLoader';
import AuthStatusBanner from './components/AuthStatusBanner';
import LoginModal from './components/LoginModal';

// Editor routes jahan login banner nahi dikhana
const EDITOR_ROUTES = ['/design-editor', '/simple-frame-editor', '/canvas-editor', '/document-editor', '/card-editor'];

// AuthStatusBanner wrapper — editor pages pe hide karo
function AuthStatusBannerWrapper({ onLoginClick }: { onLoginClick: () => void }) {
  const { pathname } = useLocation();
  const isEditorPage = EDITOR_ROUTES.some(route => pathname.startsWith(route));
  if (isEditorPage) return null;
  return <AuthStatusBanner onLoginClick={onLoginClick} />;
}

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Connects axios to the global loading bar — must be inside LoadingProvider
function AxiosLoaderSetup() {
  useAxiosLoader();
  
  // Debug authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    console.log('═══════════════════════════════════════════════');
    console.log('🔐 AUTHENTICATION STATUS CHECK');
    console.log('═══════════════════════════════════════════════');
    
    if (!token) {
      console.log('❌ No auth_token found in localStorage');
      console.log('📝 Action Required: Login with phone OTP to get token');
    } else {
      console.log('✅ auth_token present:', token.substring(0, 30) + '...');
    }
    
    if (!user) {
      console.log('❌ No user data found in localStorage');
    } else {
      try {
        const userData = JSON.parse(user);
        console.log('✅ User data present:', userData.name || 'Unknown', '|', userData.phone || 'No phone');
      } catch {
        console.log('⚠️ User data exists but is invalid JSON');
      }
    }
    
    console.log('🌐 API Base URL:', import.meta.env.VITE_API_URL);
    console.log('═══════════════════════════════════════════════');
  }, []);
  
  return null;
}

const HomePage = lazy(() => import('./pages/HomePage'));
const ReferPage = lazy(() => import('./pages/ReferPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const AddressPage = lazy(() => import('./pages/AddressPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const RaiseTicketPage = lazy(() => import('./pages/RaiseTicketPage'));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage'));
const PrintingPage = lazy(() => import('./pages/PrintingPage'));
const BusinessPrintingPage = lazy(() => import('./pages/BusinessPrintingPage'));
const GiftingPage = lazy(() => import('./pages/GiftingPage'));
const ShoppingPage = lazy(() => import('./pages/ShoppingPage'));
const ServicePackagePage = lazy(() => import('./pages/ServicePackagePage'));
const PickupLocationPage = lazy(() => import('./pages/PickupLocationPage'));
const FindCenterPage = lazy(() => import('./pages/FindCenterPage'));
const PrintConfigPage = lazy(() => import('./pages/PrintConfigPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PrintCheckoutPage = lazy(() => import('./pages/PrintCheckoutPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const GiftingProductDetailPage = lazy(() => import('./pages/GiftingProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const ContactSalesPage = lazy(() => import('./pages/ContactSalesPage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const DesignEditorPage = lazy(() => import('./pages/DesignEditorPage'));
const SimpleFrameEditorPage = lazy(() => import('./pages/SimpleFrameEditorPage'));
const FrameEditorTestPage = lazy(() => import('./pages/FrameEditorTestPage'));
const AddFundsPage = lazy(() => import('./pages/AddFundsPage'));
const OrderTrackingFAQPage = lazy(() => import('./pages/OrderTrackingFAQPage'));
const PaymentsFAQPage = lazy(() => import('./pages/PaymentsFAQPage'));
const TechnicalSupportFAQPage = lazy(() => import('./pages/TechnicalSupportFAQPage'));
const BusinessCardsListPage = lazy(() => import('./pages/BusinessCardsListPage'));
const FlyersListPage = lazy(() => import('./pages/FlyersListPage'));
const BrochuresListPage = lazy(() => import('./pages/BrochuresListPage'));
const PostersListPage = lazy(() => import('./pages/PostersListPage'));
const LetterheadsListPage = lazy(() => import('./pages/LetterheadsListPage'));
const CustomStationeryListPage = lazy(() => import('./pages/CustomStationeryListPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const CardEditorPage = lazy(() => import('./pages/CardEditorPage'));
const BusinessCardCheckoutPage = lazy(() => import('./pages/BusinessCardCheckoutPage'));
const CanvasEditorPage = lazy(() => import('./pages/CanvasEditorPage'));
const DocumentEditorPage = lazy(() => import('./pages/DocumentEditorPage'));

const RouteFallback: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center text-sm font-semibold"
    style={{ backgroundColor: '#f0f0f0', color: '#6b7280' }}
  >
    {/* intentionally blank — TopLoadingBar handles the visual feedback */}
  </div>
);


const App: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <LoadingProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AxiosLoaderSetup />
            <TopLoadingBar />
            <AuthStatusBannerWrapper onLoginClick={() => setShowLoginModal(true)} />
            <ScrollToTop />
            <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/refer" element={<ReferPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/addresses" element={<AddressPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/support/ticket" element={<RaiseTicketPage />} />
            <Route path="/support/ticket/:id" element={<TicketDetailPage />} />
            <Route path="/printing" element={<PrintingPage />} />
            <Route path="/business-printing" element={<BusinessPrintingPage />} />
            <Route path="/gifting" element={<GiftingPage />} />
            <Route path="/shopping" element={<ShoppingPage />} />
            <Route path="/service-package" element={<ServicePackagePage />} />
            <Route path="/pickup-location" element={<PickupLocationPage />} />
            <Route path="/find-center" element={<FindCenterPage />} />
          <Route path="/print-config" element={<PrintConfigPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/print-checkout" element={<PrintCheckoutPage />} />
          <Route path="/order-detail/:id" element={<OrderDetailPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/gifting-product/:id" element={<GiftingProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/contact-sales" element={<ContactSalesPage />} />
          <Route path="/product-list" element={<ProductListPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/design-editor" element={<DesignEditorPage />} />
          <Route path="/canvas-editor" element={<CanvasEditorPage />} />
          <Route path="/document-editor" element={<DocumentEditorPage />} />
          <Route path="/simple-frame-editor" element={<SimpleFrameEditorPage />} />
          <Route path="/frame-editor-test" element={<FrameEditorTestPage />} />
          <Route path="/add-funds" element={<AddFundsPage />} />
          <Route path="/faq/order-tracking" element={<OrderTrackingFAQPage />} />
          <Route path="/faq/payments" element={<PaymentsFAQPage />} />
          <Route path="/faq/technical-support" element={<TechnicalSupportFAQPage />} />
          <Route path="/business-cards" element={<BusinessCardsListPage />} />
          <Route path="/flyers" element={<FlyersListPage />} />
          <Route path="/brochures" element={<BrochuresListPage />} />
          <Route path="/posters" element={<PostersListPage />} />
          <Route path="/letterheads" element={<LetterheadsListPage />} />
          <Route path="/custom-stationery" element={<CustomStationeryListPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/card-editor" element={<CardEditorPage />} />
          <Route path="/business-card-checkout" element={<BusinessCardCheckoutPage />} />
        </Routes>
      </Suspense>
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </LoadingProvider>
  );
};

export default App;
