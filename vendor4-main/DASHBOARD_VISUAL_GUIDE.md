# 📊 Vendor Dashboard - Visual Layout Guide

## 🎨 Complete Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard                                          [🔄 Refresh]     │
│  Overview of your vendor operations                                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  📦 Jobs Closed  │  💰 Net Payout   │  📈 SLA Score    │  👥 Active Staff │
│                  │                  │                  │                  │
│      12          │    ₹45,000       │      95%         │        8         │
│  25 total jobs   │  Available for   │  Completion rate │  On current      │
│                  │  withdrawal      │                  │  roster          │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────────────┬─────────────────────────────────────┐
│  📦 Recent Orders      [View All →] │  🏪 Store Performance  [View All →] │
├─────────────────────────────────────┼─────────────────────────────────────┤
│  Order      Status         Amount   │  Store          Status    Earnings  │
│  ────────────────────────────────   │  ──────────────────────────────────  │
│  #ORD123   ✅ Delivered    ₹1,250   │  Mumbai Central  🟢 Active  ₹45,000 │
│  01/15/24                           │  Mumbai                    120 orders│
│                                     │                                      │
│  #ORD122   📦 In Prod...   ₹890    │  Andheri Store   🟢 Active  ₹32,500 │
│  01/14/24                           │  Mumbai                    85 orders │
│                                     │                                      │
│  #ORD121   🕐 QC Pending   ₹2,100   │  Thane Store     🔴 Inactive ₹18,200│
│  01/14/24                           │  Thane                     45 orders │
│                                     │                                      │
│  #ORD120   ✅ Delivered    ₹1,450   │  Pune Store      🟢 Active  ₹28,900 │
│  01/13/24                           │  Pune                      72 orders │
│                                     │                                      │
│  #ORD119   ❌ Cancelled    ₹750     │                                      │
│  01/13/24                           │                                      │
└─────────────────────────────────────┴─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Quick Actions                                                       │
├──────────────────┬──────────────────┬──────────────────┬────────────┤
│  📦 View Orders  │  💰 Earnings     │  🏪 Stores       │  👥 Staff  │
│  Manage job      │  View financials │  Manage          │  Team      │
│  queue           │                  │  locations       │  management│
└──────────────────┴──────────────────┴──────────────────┴────────────┘
```

---

## 📱 Mobile Layout (< 768px)

```
┌─────────────────────────────┐
│  Dashboard        [🔄]      │
│  Overview of operations     │
└─────────────────────────────┘

┌─────────────────────────────┐
│  📦 Jobs Closed             │
│      12                     │
│  25 total jobs              │
└─────────────────────────────┘

┌─────────────────────────────┐
│  💰 Net Payout              │
│    ₹45,000                  │
│  Available for withdrawal   │
└─────────────────────────────┘

┌─────────────────────────────┐
│  📈 SLA Score               │
│      95%                    │
│  Completion rate            │
└─────────────────────────────┘

┌─────────────────────────────┐
│  👥 Active Staff            │
│        8                    │
│  On current roster          │
└─────────────────────────────┘

┌─────────────────────────────┐
│  📦 Recent Orders           │
│              [View All →]   │
├─────────────────────────────┤
│  #ORD123  ✅ Delivered      │
│  01/15/24        ₹1,250     │
├─────────────────────────────┤
│  #ORD122  📦 In Production  │
│  01/14/24        ₹890       │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🏪 Store Performance       │
│              [View All →]   │
├─────────────────────────────┤
│  Mumbai Central             │
│  🟢 Active      ₹45,000     │
│                 120 orders  │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Quick Actions              │
├─────────────────────────────┤
│  📦 View Orders             │
│  Manage job queue           │
├─────────────────────────────┤
│  💰 Earnings                │
│  View financials            │
└─────────────────────────────┘
```

---

## 🎨 Color Scheme

### Status Colors:
```
✅ Delivered / Ready        → Green  (#10b981 / #d1fae5)
📦 In Production           → Blue   (#3b82f6 / #dbeafe)
🕐 QC Pending / Assigned   → Yellow (#f59e0b / #fef3c7)
❌ Cancelled               → Red    (#ef4444 / #fee2e2)
```

### Component Colors:
```
Background:
- Cards: White (#ffffff)
- Page: Light Gray (#f9fafb)
- Quick Actions: Gradient (gray-50 to gray-100)

Borders:
- Default: #e5e7eb
- Hover: #111827

Text:
- Primary: #111827
- Secondary: #6b7280
- Muted: #9ca3af
```

---

## 🖱️ Interactive Elements

### Clickable Areas:
1. **Refresh Button** (Top Right)
   - Reloads all dashboard data
   - Shows spinner while loading

2. **Order Rows** (Recent Orders Table)
   - Click → Navigate to `/orders/{orderId}`
   - Hover → Light gray background

3. **Store Rows** (Store Performance Table)
   - Click → Navigate to `/stores/{storeId}`
   - Hover → Light gray background

4. **View All Buttons** (Tables)
   - Recent Orders → Navigate to `/orders`
   - Store Performance → Navigate to `/stores`

5. **Quick Action Buttons**
   - View Orders → `/orders`
   - Earnings → `/earnings`
   - Stores → `/stores`
   - Staff → `/staff`

---

## 📊 Data Display Format

### Numbers:
```javascript
// Currency
₹45,000  // Indian Rupee with comma separator

// Percentage
95%      // Whole number with % symbol

// Count
12       // Plain number
```

### Dates:
```javascript
// Format: MM/DD/YY or DD/MM/YYYY (based on locale)
01/15/24
15/01/2024
```

### Status Badges:
```
[Icon] Status Text
✅ Delivered
📦 In Production
🕐 QC Pending
❌ Cancelled
```

---

## 🎯 Empty States

### No Orders:
```
┌─────────────────────────────┐
│  📦 Recent Orders           │
├─────────────────────────────┤
│                             │
│         📦                  │
│     No orders yet           │
│                             │
└─────────────────────────────┘
```

### No Stores:
```
┌─────────────────────────────┐
│  🏪 Store Performance       │
├─────────────────────────────┤
│                             │
│         🏪                  │
│  No stores configured       │
│                             │
└─────────────────────────────┘
```

---

## 🔄 Loading State

```
┌─────────────────────────────┐
│                             │
│         ⏳                  │
│   Loading dashboard...      │
│                             │
└─────────────────────────────┘
```

---

## ⚠️ Error State

```
┌─────────────────────────────────────────────┐
│  ⚠️ Unable to load dashboard data.          │
│     Please check your connection and        │
│     try again.                              │
└─────────────────────────────────────────────┘
```

---

## 📐 Spacing & Sizing

### Card Metrics:
- Height: Auto
- Padding: 16px
- Gap: 16px
- Border Radius: 16px

### Tables:
- Row Height: Auto (min 64px)
- Cell Padding: 24px (horizontal), 16px (vertical)
- Border Radius: 16px
- Border Width: 1px

### Quick Actions:
- Button Height: Auto
- Padding: 12px 16px
- Gap: 12px
- Border Radius: 12px

---

## 🎭 Animations & Transitions

### Hover Effects:
```css
transition: all 0.2s ease
hover:bg-gray-50
hover:border-gray-900
hover:shadow-sm
```

### Loading Spinner:
```css
animate-spin (on refresh icon)
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile First */
default: Single column

/* Tablet */
@media (min-width: 768px) {
  - Metrics: 2 columns
  - Tables: 2 columns
  - Quick Actions: 2 columns
}

/* Desktop */
@media (min-width: 1024px) {
  - Metrics: 4 columns
  - Tables: 2 columns
  - Quick Actions: 4 columns
}
```

---

## ✅ Accessibility Features

1. **Semantic HTML**: Proper table structure
2. **Color Contrast**: WCAG AA compliant
3. **Keyboard Navigation**: All interactive elements focusable
4. **Screen Reader**: Proper labels and ARIA attributes
5. **Focus Indicators**: Visible focus states

---

**Last Updated**: April 30, 2026
