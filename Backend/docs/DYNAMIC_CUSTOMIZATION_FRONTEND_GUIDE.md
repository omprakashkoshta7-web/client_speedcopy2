# SpeedCopy Dynamic Customization Frontend Guide

This guide explains how the frontend should integrate the backend-driven product customization system.

The frontend must stay generic. It should not hardcode product logic for pens, clocks, cups, photo frames, acrylic wall frames, photo albums, refrigerator stickers, pencils, or future products. The backend sends product, variant, template, slot, and preview rules.

## Core Rule

Frontend renders controls from backend config:

```txt
GET /api/designs/template-config/:variantId
```

The response tells the frontend:

- Which template to use
- Which assets to show
- Which editable slots exist
- Whether a slot is image or text
- Whether crop, zoom, move, resize, or rotate is allowed
- Shape of the slot: rectangle, circle, or custom
- Text limits, fonts, sizes, and alignment
- Preview/mockup behavior

The frontend should only implement generic slot behavior.

## Supported Product Examples

All these products use the same frontend flow:

```txt
Pen engraving
Clock
Cup / mug
Photo frame
Acrylic wall photo frame
Photo album
Refrigerator sticker
Pencil
Collage
Room mockup wall art
```

The difference is only backend data:

```txt
ProductType -> Category -> Variant -> Template -> Slots
```

Example:

```txt
ProductType: Gift
Category: Acrylic Wall Frame
Variant: 12x8 inch / 3mm / Rectangle
Template: Blessed Together 2 Photo Layout
Slots: photo_1 image slot, photo_2 image slot, title text slot
```

Example:

```txt
ProductType: Stationery
Category: Metal Pen
Variant: Black Matte Pen
Template: Name Engraving Layout
Slots: engraved_name text slot
```

## API Index

This section lists the customization-related APIs now available for frontend integration.

### Public and User APIs

Catalog discovery:

```http
GET /api/products/product-types
GET /api/products/categories?productTypeId=&flowType=
GET /api/products/categories/:slug
GET /api/products/categories/:id/subcategories
GET /api/products/variants?productId=&categoryId=&productTypeId=
GET /api/products/variants/product/:productId
GET /api/products/:id
GET /api/products/slug/:slug
```

Customization config and editing:

```http
GET /api/designs/template-config/:variantId
POST /api/designs/customizations
GET /api/designs/customizations/:id
POST /api/designs/customizations/:id/assets
PATCH /api/designs/customizations/:id/slots/:slotId
POST /api/designs/customizations/:id/render-preview
POST /api/designs/customizations/:id/finalize
```

Cart:

```http
GET /api/cart
POST /api/cart
PATCH /api/cart/:itemId
DELETE /api/cart/:itemId
DELETE /api/cart/clear
POST /api/cart/apply-coupon
```

### Admin APIs

Product type management:

```http
GET /api/admin/product-types
POST /api/admin/product-types
PATCH /api/admin/product-types/:id
DELETE /api/admin/product-types/:id
```

Category and subcategory management:

```http
POST /api/products/categories
PUT /api/products/categories/:id
DELETE /api/products/categories/:id
POST /api/products/categories/subcategories
PUT /api/products/categories/subcategories/:id
```

Variant management:

```http
GET /api/admin/variants
POST /api/admin/variants
PATCH /api/admin/variants/:id
DELETE /api/admin/variants/:id
```

Template definition management:

```http
GET /api/designs/admin/template-definitions?variantId=
POST /api/designs/admin/template-definitions
PATCH /api/designs/admin/template-definitions/:id
POST /api/designs/admin/template-definitions/:id/publish
```

## API Flow

### 1. Load Template Config

```http
GET /api/designs/template-config/:variantId
```

Use this on product detail page or when user clicks `Customize Now`.

Response shape:

```json
{
  "success": true,
  "data": {
    "variant": {
      "id": "variantId",
      "productId": "productId",
      "name": "12x8 Acrylic Frame",
      "sku": "ACR-12X8",
      "price": 1198,
      "currency": "INR",
      "attributes": {
        "size": "12x8 inch",
        "shape": "rectangle",
        "material": "acrylic"
      },
      "previewImages": []
    },
    "template": {
      "id": "templateId",
      "name": "Blessed Together",
      "version": 1,
      "assets": {
        "editorBaseImage": "https://...",
        "overlayImage": "https://...",
        "maskImage": "https://...",
        "mockupSceneImage": "https://..."
      },
      "canvas": {
        "width": 1200,
        "height": 800,
        "unit": "px",
        "dpi": 300
      },
      "slots": [
        {
          "slotId": "photo_1",
          "name": "Photo 1",
          "type": "image",
          "geometry": {
            "x": 120,
            "y": 90,
            "width": 400,
            "height": 300,
            "shape": "rectangle"
          },
          "behavior": {
            "movable": true,
            "resizable": false,
            "cropEnabled": true,
            "zoomEnabled": true,
            "rotateEnabled": false
          },
          "imageConfig": {
            "fitMode": "cover",
            "minZoom": 1,
            "maxZoom": 4,
            "acceptedMimeTypes": ["image/jpeg", "image/png", "image/webp"],
            "maxFileSizeMb": 10
          },
          "required": true
        }
      ],
      "previewConfig": {
        "renderer": "sharp",
        "livePreview": true,
        "mockups": []
      },
      "rules": {
        "allowFreeDesign": false
      }
    }
  }
}
```

### 2. Create Customization Draft

```http
POST /api/designs/customizations
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "variantId": "variantId",
  "templateId": "templateId"
}
```

`templateId` is optional if the variant has one published default template.

Store returned `_id` as `customizationId`.

### 3. Render Generic Editor

Frontend layout:

```txt
Canvas size = template.canvas.width x template.canvas.height
Base layer = template.assets.editorBaseImage
Editable layers = template.slots
Overlay layer = template.assets.overlayImage
Mask layer = template.assets.maskImage, if supplied
```

For each slot:

```txt
if slot.type == image:
  show upload button
  allow crop/zoom/move only if behavior allows it
  clip image to geometry.shape

if slot.type == text:
  show text input
  enforce textConfig limits
  use allowed font settings
```

Do not add free drawing, stickers, shapes, arbitrary text boxes, or user-created layers.

### 4. Update Image Slot

First upload the image asset:

```http
POST /api/designs/customizations/:customizationId/assets
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form field:

```txt
image=<file>
```

Response:

```json
{
  "success": true,
  "data": {
    "asset": {
      "assetId": "177000000-photo.jpg",
      "originalUrl": "https://api.speedcopy.in/uploads/customizations/177000000-photo.jpg",
      "processedUrl": "",
      "mimeType": "image/jpeg",
      "width": 3024,
      "height": 4032,
      "sizeBytes": 2400000
    }
  }
}
```

After user uploads and crops image:

```http
PATCH /api/designs/customizations/:customizationId/slots/:slotId
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "type": "image",
  "asset": {
    "assetId": "asset_123",
    "originalUrl": "https://cdn.speedcopy.in/uploads/photo.jpg",
    "processedUrl": "",
    "mimeType": "image/jpeg",
    "width": 3024,
    "height": 4032,
    "sizeBytes": 2400000
  },
  "transform": {
    "x": 0,
    "y": 0,
    "scale": 1,
    "rotation": 0,
    "zoom": 1.4
  },
  "crop": {
    "x": 120,
    "y": 240,
    "width": 900,
    "height": 900,
    "unit": "px"
  }
}
```

### 5. Update Text Slot

```http
PATCH /api/designs/customizations/:customizationId/slots/:slotId
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "type": "text",
  "text": {
    "value": "ARJUN",
    "fontFamily": "Inter",
    "fontSize": 28,
    "fontWeight": "700",
    "color": "#ffffff",
    "alignment": "center"
  },
  "transform": {
    "x": 0,
    "y": 0,
    "scale": 1,
    "rotation": 0,
    "zoom": 1
  }
}
```

### 6. Generate Preview

Use this before add to cart or when user asks for final preview.

```http
POST /api/designs/customizations/:customizationId/render-preview
Authorization: Bearer <token>
```

The backend validates required slots and stores a rendered preview reference.

The backend now generates a real PNG render and returns `renderedPreview.url`.

### 7. Finalize Customization

Call this before adding to cart or during checkout.

```http
POST /api/designs/customizations/:customizationId/finalize
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "orderId": ""
}
```

Response includes:

```json
{
  "status": "locked",
  "renderedPreview": {
    "url": "..."
  },
  "printReadyAsset": {
    "url": "...",
    "dpi": 300,
    "format": "png"
  }
}
```

The backend now generates a real print-ready PNG and returns `printReadyAsset.url`.

### 8. Add To Cart

Send customization snapshot to cart:

```http
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "productId": "productId",
  "productName": "Creative Acrylic Wall Art",
  "flowType": "gifting",
  "variantId": "variantId",
  "variantSnapshot": {
    "name": "12x8 inch",
    "sku": "ACR-12X8",
    "attributes": {
      "size": "12x8 inch",
      "shape": "rectangle",
      "material": "acrylic"
    }
  },
  "customization": {
    "customizationId": "customizationId",
    "templateId": "templateId",
    "templateVersion": 1,
    "renderedPreviewUrl": "https://...",
    "printReadyAssetUrl": "https://...",
    "slotSummary": {
      "photo_1": "image",
      "title": "text"
    },
    "lockedAt": "2026-05-06T10:00:00.000Z"
  },
  "thumbnail": "https://...",
  "quantity": 1,
  "unitPrice": 1198,
  "totalPrice": 1198
}
```

## Product-Specific UI Examples

The UI should be generated from slots:

| Product | Backend Slot Config | Frontend UI |
|---|---|---|
| Pen | one text slot | text input + live engraving preview |
| Pencil | one text slot | text input |
| Cup | image slot + optional text slot | upload/crop + text input |
| Clock | image slot | upload/crop/zoom |
| Photo frame | image slot | upload/crop/zoom/reposition |
| Acrylic wall frame | image slots + room mockup | upload/crop + room preview |
| Photo album | multiple image slots | multi-photo upload |
| Refrigerator sticker | image/text slot with custom shape | upload/crop clipped to shape |

The frontend should not check product name to decide UI. It should check slot type and behavior.

## Recommended Frontend Components

```txt
TemplateConfigLoader
CustomizationEditor
CanvasPreview
ImageSlotEditor
TextSlotEditor
SlotToolbar
MockupPreview
FinalizeCustomizationButton
```

Suggested state:

```js
{
  variantId,
  templateConfig,
  customizationId,
  slotValues: {
    photo_1: {
      type: 'image',
      asset,
      crop,
      transform
    },
    engraved_name: {
      type: 'text',
      text,
      transform
    }
  },
  renderedPreview,
  printReadyAsset
}
```

## Error Handling

Common backend errors:

```txt
404 Variant not found
404 No published template configuration found for this variant
400 Slot does not exist on this template
400 Unsupported image type
400 Text slot must be X-Y characters
400 Required customization slots are missing
409 Customization is locked
```

Frontend should show these as user-friendly messages.

## Important Backend Status

Implemented:

- Template definition schema
- Slot schema
- Preview configuration schema
- User customization schema
- Render job schema
- Admin template definition APIs
- Customer customization APIs
- `GET /template-config/:variantId`
- Cart/order customization snapshots
- Variant metadata for shape/material/SKU/pricing/preview images
- Product Type admin APIs
- Variant admin APIs
- Customization asset upload API
- Sharp-based PNG preview rendering
- Sharp-based PNG print-ready rendering
- Admin permission checks on template definition APIs

Production configuration still required:

- Configure `DESIGN_SERVICE_PUBLIC_URL` to the public CDN/API host used for `/uploads`.
- Mount persistent storage or CDN sync for design-service uploads/renders in production.
- Build/admin UI screens that call the APIs below.

Required admin/staff permissions:

```txt
catalog.product-type.create
catalog.product-type.update
catalog.product-type.delete
catalog.variant.create
catalog.variant.update
catalog.variant.delete
design.template.read
design.template.create
design.template.update
design.template.publish
```
