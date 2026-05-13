# Printing Flow Requirements

## Changes Required

### 1. Card Editor - Load Templates
**Current**: Empty card with manual editing
**Required**: Pre-designed card templates that user can select and customize

**Files to modify**:
- `client/src/pages/CardEditorPage.tsx` - Add template previews with actual designs

---

### 2. Document Printing Flow - Direct Checkout
**Current Flow**: 
```
Document Printing → Pickup Location → Shop → Service Package → Checkout
```

**Required Flow**:
```
Document Printing → Pickup Location → Shop → Checkout (Direct)
```

**Changes**:
- Skip service package page
- Pass pickup location and shop details directly to checkout
- Show selected location and shop in checkout page

**Files to modify**:
- `client/src/pages/PickupLocationPage.tsx` - Navigate directly to checkout with location data
- `client/src/pages/PrintCheckoutPage.tsx` - Accept and display location/shop details
- Remove service package navigation

---

### 3. Checkout Page - Show Location & Shop Details
**Required**:
- Display selected pickup location name and address
- Display selected shop name and details
- Remove service package section
- Show only: Items, Location, Shop, Payment

**Files to modify**:
- `client/src/pages/PrintCheckoutPage.tsx` - Add location and shop display sections

---

### 4. Razorpay Integration - Proper Test Mode
**Current**: Mock mode or not opening properly
**Required**: Real Razorpay test modal with proper test mode screen

**Already implemented in**:
- `client/src/services/payment.service.ts` - Has proper Razorpay integration
- `client/src/pages/GiftingCheckoutPage.tsx` - Has working Razorpay flow

**Need to apply same to**:
- `client/src/pages/PrintCheckoutPage.tsx` - Use same Razorpay integration

---

## Implementation Order

1. ✅ Card Editor Templates (Quick)
2. ✅ Pickup Location → Direct Checkout (Medium)
3. ✅ Checkout Page Updates (Medium)
4. ✅ Razorpay Integration (Already done, just copy)

---

## Testing Checklist

- [ ] Card templates load and display correctly
- [ ] Clicking shop in pickup location goes to checkout
- [ ] Checkout shows selected location and shop
- [ ] Service package is skipped
- [ ] Razorpay modal opens in test mode
- [ ] Payment flow completes successfully
