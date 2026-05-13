# Website Issues - Implementation Plan

## Overview
This document outlines all 14 issues identified in the website and provides detailed solutions for each.

---

## Issue #1: PDF Page Count Not Calculating Correctly

**Location:** `src/pages/PrintConfigPage.tsx`

**Problem:** Page count estimation is using `Math.ceil(file.size / 100000)` which is inaccurate.

**Solution:** 
- For PDF files, use a proper PDF parsing library (pdf-lib or pdfjs-dist)
- For other files, prompt user to enter page count manually
- Update the page count calculation logic

**Files to modify:**
- `src/pages/PrintConfigPage.tsx` (lines 113, 167-177, 274, 306)

---

## Issue #2: Graphs Adding Automatically and Showing Price

**Location:** `src/pages/PrintConfigPage.tsx`

**Problem:** Linear Graph Sheets and Semi Log Graph sheets default to 1 and are always included in price calculation.

**Solution:**
- Change default values from 1 to 0
- Only include graph sheets in price calculation when > 0
- Add conditional rendering to hide graph sheet pricing when count is 0

**Files to modify:**
- `src/pages/PrintConfigPage.tsx` (lines 79-80, 117-118, 477-485)

---

## Issue #3: Pickup Option Not Showing Estimated Delivery Time

**Location:** `src/pages/PickupLocationPage.tsx`, `src/pages/PrintCheckoutPage.tsx`

**Problem:** No estimated delivery/ready time displayed for pickup locations.

**Solution:**
- Add estimated ready time field to pickup location display
- Calculate based on print job complexity (pages, binding type)
- Display prominently in location selection and checkout

**Files to modify:**
- `src/pages/PickupLocationPage.tsx`
- `src/pages/PrintCheckoutPage.tsx`

---

## Issue #4: Soft Binding - Cover Pages Not Showing

**Location:** `src/pages/PrintConfigPage.tsx`, `src/components/PrintTypeModal.tsx`

**Problem:** No cover page options when soft binding is selected.

**Solution:**
- Add cover page selection dropdown (None, Transparent, Colored, Leather-finish)
- Show cover page options conditionally when binding type requires it
- Update price calculation to include cover page costs

**Files to modify:**
- `src/pages/PrintConfigPage.tsx`
- `src/components/PrintTypeModal.tsx`

---

## Issue #5: No Back Button in Printing Options

**Location:** `src/pages/PrintConfigPage.tsx`, `src/pages/PrintCheckoutPage.tsx`

**Problem:** Users cannot navigate back once they select printing options.

**Solution:**
- Add back button in header of PrintConfigPage
- Add back button in PrintCheckoutPage
- Ensure navigation preserves state

**Files to modify:**
- `src/pages/PrintConfigPage.tsx`
- `src/pages/PrintCheckoutPage.tsx`

---

## Issue #6: Products Scrolling Sideways Instead of Downwards

**Location:** `src/pages/ProductListPage.tsx`, `src/pages/BusinessPrintingPage.tsx`

**Problem:** Product grid might have horizontal scroll on some sections.

**Solution:**
- Review all product grid layouts
- Ensure grid uses proper responsive classes (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)
- Remove any overflow-x-auto or horizontal scroll containers
- Fix any flex containers that might cause horizontal scrolling

**Files to modify:**
- `src/pages/ProductListPage.tsx`
- `src/pages/BusinessPrintingPage.tsx`
- `src/pages/ShoppingPage.tsx`
- `src/pages/GiftingPage.tsx`

---

## Issue #7: Reduce Canvas Editor Page Length

**Location:** `src/pages/CanvasEditorPage.tsx`, `src/pages/DesignEditorPage.tsx`

**Problem:** Canvas editor page is too long with tools spread out.

**Solution:**
- Compact tool panel layout
- Place tools around the canvas in a sidebar
- Reduce padding and spacing
- Make canvas area more prominent
- Use collapsible sections for tool groups

**Files to modify:**
- `src/pages/CanvasEditorPage.tsx`
- `src/pages/DesignEditorPage.tsx`
- `src/pages/SimpleDesignEditorPage.tsx`
- `src/pages/SimpleFrameEditorPage.tsx`

---

## Issue #8: Add Upload Design Option for All Products

**Location:** Multiple product pages

**Problem:** Not all products have an option to upload ready-to-print files.

**Solution:**
- Add "Upload Your Design" button on all product detail pages
- Create a universal file upload flow
- Skip canvas editor if user has ready design
- Support PDF, PNG, JPG, AI, PSD formats

**Files to modify:**
- `src/pages/ProductDetailPage.tsx`
- `src/pages/GiftingProductDetailPage.tsx`
- `src/pages/BusinessPrintingPage.tsx`
- Create new component: `src/components/DesignUploadModal.tsx`

---

## Issue #9: Canvas Editor Not Satisfactory

**Location:** `src/pages/CanvasEditorPage.tsx`

**Problem:** Canvas editor lacks features compared to competitors (Printo, Printshoppy).

**Solution:**
- Add text editing with multiple fonts
- Add shapes (rectangle, circle, line)
- Add filters and effects
- Add layers panel
- Add undo/redo functionality
- Add alignment tools
- Add color picker
- Improve image manipulation (crop, rotate, flip)
- Add templates library

**Files to modify:**
- `src/pages/CanvasEditorPage.tsx`
- Create new components for advanced features

---

## Issue #10: Canvas Editor for Document Printing

**Location:** `src/pages/PrintConfigPage.tsx`

**Problem:** Document printing doesn't have canvas editor option.

**Solution:**
- Add "Design Document" button in PrintConfigPage
- Create document-specific canvas editor
- Support adding headers, footers, page numbers
- Support text formatting and layout

**Files to modify:**
- `src/pages/PrintConfigPage.tsx`
- Create: `src/pages/DocumentCanvasEditorPage.tsx`

---

## Issue #11: Remove Download Button in Canvas Editor

**Location:** `src/pages/CanvasEditorPage.tsx`, `src/pages/DesignEditorPage.tsx`

**Problem:** Download button allows users to download without purchasing.

**Solution:**
- Remove download button from canvas editor
- Keep only "Add to Cart" and "Continue to Pay" buttons
- Add watermark to preview if needed

**Files to modify:**
- `src/pages/CanvasEditorPage.tsx` (line 301-304)
- `src/pages/DesignEditorPage.tsx` (line 1690-1694)
- `src/pages/SimpleDesignEditorPage.tsx` (line 285-287)
- `src/pages/SimpleFrameEditorPage.tsx` (line 730-736)

---

## Issue #12: Cart Page Too Long

**Location:** `src/pages/CartPage.tsx`

**Problem:** Cart page has excessive length and spacing.

**Solution:**
- Reduce padding and margins
- Make cart items more compact
- Reduce order summary card size
- Remove excessive whitespace
- Make suggested products section more compact

**Files to modify:**
- `src/pages/CartPage.tsx`

---

## Issue #13: Product Sharing Button Missing

**Location:** `src/pages/ProductDetailPage.tsx`, `src/pages/GiftingProductDetailPage.tsx`

**Problem:** No share button on product pages.

**Solution:**
- Add share button in product detail header
- Implement share functionality (WhatsApp, Facebook, Twitter, Copy Link)
- Add share modal with social media options

**Files to modify:**
- `src/pages/ProductDetailPage.tsx`
- `src/pages/GiftingProductDetailPage.tsx`
- Create: `src/components/ShareModal.tsx`

---

## Issue #14: Wishlist Missing in Business Printing and Shopping

**Location:** `src/pages/ProductListPage.tsx`

**Problem:** Wishlist button only shows for business printing and gifting, not shopping.

**Solution:**
- Enable wishlist for all product types
- Update showWishlistButton logic to include shopping flow
- Ensure wishlist API supports all product types

**Files to modify:**
- `src/pages/ProductListPage.tsx` (line 193-195)
- `src/pages/ShoppingPage.tsx`

---

## Priority Order for Implementation

### High Priority (Critical Issues)
1. Issue #2 - Graphs adding automatically (affects pricing)
2. Issue #5 - No back button (UX blocker)
3. Issue #11 - Remove download button (business logic)
4. Issue #14 - Wishlist missing (feature parity)

### Medium Priority (Important UX)
5. Issue #1 - PDF page count calculation
6. Issue #3 - Pickup delivery time
7. Issue #6 - Products scrolling sideways
8. Issue #12 - Cart page too long
9. Issue #13 - Product sharing button

### Low Priority (Enhancements)
10. Issue #4 - Soft binding cover pages
11. Issue #7 - Canvas editor page length
12. Issue #8 - Upload design option
13. Issue #9 - Canvas editor improvements
14. Issue #10 - Canvas editor for documents

---

## Testing Checklist

After implementing fixes:
- [ ] Test PDF page count with various file sizes
- [ ] Verify graph sheets don't auto-add to cart
- [ ] Check pickup locations show delivery estimates
- [ ] Test soft binding shows cover page options
- [ ] Verify back buttons work on all printing pages
- [ ] Confirm products scroll vertically on all devices
- [ ] Test canvas editor is compact and usable
- [ ] Verify upload design works for all products
- [ ] Test canvas editor features match competitors
- [ ] Check document printing has canvas option
- [ ] Confirm download button is removed from editors
- [ ] Verify cart page is compact
- [ ] Test product sharing on all platforms
- [ ] Confirm wishlist works for all product types
