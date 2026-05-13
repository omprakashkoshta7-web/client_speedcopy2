# SpeedCopy Vendor Portal

A comprehensive vendor management portal for SpeedCopy printing services.

## 🚀 Features

### 📊 Dashboard
- Real-time order statistics
- Revenue analytics
- Performance metrics
- Quick action buttons
- Order status overview

### 📦 Order Management
- Job queue with priority sorting
- Order details and tracking
- Status updates
- Production workflow
- Quality control

### 🏪 Store Management
- Multiple store locations
- Store creation and configuration
- Store-specific analytics
- Inventory management
- Staff assignment

### 💰 Earnings & Payouts
- Revenue tracking
- Payout history
- Closure reports
- Financial analytics
- Transaction history

### 📈 Analytics
- Performance metrics
- Revenue trends
- Order analytics
- Customer insights
- Vendor score tracking

### 👥 Staff Management
- Staff member management
- Role assignment
- Performance tracking
- Access control

### 🏢 Organization Profile
- Vendor information
- Legal documents
- Business details
- Contact information

### 🎯 Support
- Help center
- Ticket management
- FAQ section
- Contact support

## 🛠️ Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit
- **Authentication:** Firebase Auth
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn installed
- Firebase project configured
- Backend API running

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/omprakashkoshta7-web/vendor_speedcopy.git

# Navigate to project directory
cd vendor_speedcopy

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
# Edit .env file with your Firebase and API credentials

# Start development server
npm run dev
```

## 🌐 Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:4000/api

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Application Settings
VITE_APP_NAME=SpeedCopy Vendor Portal
VITE_APP_VERSION=1.0.0
```

## 🚀 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📁 Project Structure

```
vendor/
├── public/              # Static assets
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/         # Images and media
│   ├── components/     # Reusable components
│   │   ├── layout/    # Layout components
│   │   └── ui/        # UI components
│   ├── config/        # Configuration files
│   │   ├── api.ts
│   │   └── firebase.ts
│   ├── pages/         # Page components
│   │   ├── auth/      # Authentication pages
│   │   ├── dashboard/ # Dashboard pages
│   │   ├── orders/    # Order management
│   │   ├── stores/    # Store management
│   │   ├── earnings/  # Earnings & payouts
│   │   ├── production/# Production workflow
│   │   ├── staff/     # Staff management
│   │   ├── org/       # Organization profile
│   │   └── support/   # Support pages
│   ├── services/      # API services
│   │   ├── api.ts
│   │   ├── firebase-auth.ts
│   │   ├── vendor.service.ts
│   │   └── notification.service.ts
│   ├── types/         # TypeScript types
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── .env.example       # Environment template
├── .gitignore         # Git ignore rules
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── vite.config.ts     # Vite config
└── tailwind.config.js # Tailwind config
```

## 🔐 Authentication

The vendor portal uses Firebase Authentication with JWT token exchange:

1. **Login with Firebase** - Vendor signs in with email/password
2. **Token Exchange** - Firebase token is exchanged for backend JWT
3. **API Requests** - All API calls use the backend JWT

### Login Flow

```typescript
// 1. Sign in with Firebase
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// 2. Get Firebase ID token
const firebaseToken = await userCredential.user.getIdToken();

// 3. Exchange for backend JWT
const response = await fetch('/api/auth/verify', {
  headers: { Authorization: `Bearer ${firebaseToken}` }
});

// 4. Store backend JWT
localStorage.setItem('vendor_token', response.data.token);

// 5. Use JWT for all API calls
```

## 📊 Key Features

### Dashboard
- **Real-time Metrics:** Live order counts, revenue, and performance stats
- **Quick Actions:** Fast access to common tasks
- **Order Overview:** Visual representation of order statuses
- **Revenue Charts:** Daily, weekly, and monthly revenue trends

### Order Management
- **Job Queue:** Prioritized list of pending orders
- **Order Details:** Complete order information and history
- **Status Updates:** Real-time order status tracking
- **Production Workflow:** Step-by-step production process

### Store Management
- **Multi-Store Support:** Manage multiple store locations
- **Store Analytics:** Per-store performance metrics
- **Staff Assignment:** Assign staff to specific stores
- **Inventory Tracking:** Monitor stock levels

### Earnings
- **Revenue Tracking:** Detailed revenue breakdown
- **Payout History:** Complete payout records
- **Financial Reports:** Comprehensive financial analytics
- **Closure Reports:** Daily/weekly closure summaries

## 🎨 UI Components

### Metric Cards
```typescript
<VendorMetricCard
  label="Total Orders"
  value="150"
  accent="#3b82f6"
  icon={ShoppingCart}
  note="+12% vs last week"
/>
```

### Loading States
```typescript
<LoadingState message="Loading orders..." />
```

### Layout
```typescript
<VendorLayout>
  <YourPageContent />
</VendorLayout>
```

## 🔄 State Management

The app uses Redux Toolkit for state management:

```typescript
// Store configuration
const store = configureStore({
  reducer: {
    vendor: vendorReducer,
    orders: ordersReducer,
    stores: storesReducer,
  },
});
```

## 🌐 API Integration

### API Client

```typescript
import { apiClient } from './services/api';

// Get vendor dashboard
const dashboard = await apiClient.get('/vendor/dashboard');

// Update order status
await apiClient.patch(`/vendor/orders/${orderId}`, {
  status: 'in_production'
});
```

### Available Endpoints

- `GET /vendor/dashboard` - Dashboard data
- `GET /vendor/orders` - Order list
- `GET /vendor/orders/:id` - Order details
- `PATCH /vendor/orders/:id` - Update order
- `GET /vendor/stores` - Store list
- `POST /vendor/stores` - Create store
- `GET /vendor/earnings` - Earnings data
- `GET /vendor/analytics` - Analytics data

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚢 Deployment

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Output will be in dist/ directory
```

### Deploy to Cloud Run

```bash
# Build and deploy
gcloud run deploy vendor-portal \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

### Deploy to Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🐛 Troubleshooting

### Issue: Cannot connect to API

**Solution:**
1. Check `VITE_API_BASE_URL` in `.env`
2. Ensure backend is running
3. Verify CORS is configured

### Issue: Firebase authentication fails

**Solution:**
1. Verify Firebase credentials in `.env`
2. Check Firebase project settings
3. Ensure authentication is enabled

### Issue: Build fails

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 Documentation

- [API Documentation](../backend/docs/API_DOCUMENTATION.md)
- [Authentication Guide](./docs/AUTH_GUIDE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential.

## 👥 Team

- **Development Team:** SpeedCopy Tech Team
- **Project Manager:** [Name]
- **Lead Developer:** [Name]

## 📞 Support

For support, email support@speedcopy.com or join our Slack channel.

## 🔗 Links

- [Live Demo](https://vendor.speedcopy.com)
- [API Documentation](https://api.speedcopy.com/docs)
- [Admin Portal](https://admin.speedcopy.com)
- [Customer App](https://app.speedcopy.com)

---

**Built with ❤️ by SpeedCopy Team**
