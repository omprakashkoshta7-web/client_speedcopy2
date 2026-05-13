# Customization Editor Flow

This document explains what currently happens in `speedcopy-main` when a user customizes a product.

## Entry Points

The customization editor opens at:

```text
/customization-editor?productId=<productId>&variantId=<variantId>&flow=<flow>&templateId=<templateId>
```

Required query params:

- `productId`: product being customized.
- `variantId`: selected product variant.

Optional query params:

- `templateId`: selected template definition. If omitted and multiple templates are available, user is redirected to template gallery.
- `flow`: `gifting`, `shopping`, or `business_printing`.

Main page:

```text
speedcopy-main/src/pages/CustomizationEditorPage.tsx
```

## Load Flow

1. Editor reads `productId`, `variantId`, `templateId`, and `flow` from the URL.
2. It calls:

```ts
designService.getTemplateConfig(variantId)
```

3. If no published template exists, user is redirected to:

```text
/simple-frame-editor
```

4. If multiple templates exist and no `templateId` is selected, user is redirected to:

```text
/template-gallery
```

5. Editor loads product image using `productService`, then uses it as the editor base image.
6. Template slots are converted into local `slotStates`.
7. First template slot is auto-selected.

## Template Data Used

Template config contains:

- `template.canvas`: canvas width, height, unit, dpi.
- `template.assets.editorBaseImage`: base image shown behind slots.
- `template.assets.overlayImage`: optional overlay/mask shown above slots.
- `template.slots`: image/text editable regions.
- `variant`: selected variant metadata and price.

The editor builds a `previewTemplate` from backend template plus local free text layers.

## Slot State

Each editable item is stored in `slotStates`.

Supported state types:

- `image`
- `text`
- `graphic`

Important fields:

- `previewUrl`: browser preview URL for uploaded image.
- `uploadedAsset`: backend-uploaded image asset metadata.
- `transform`: x/y/scale/rotation/zoom.
- `crop`: crop state.
- `text`: text content, font, size, color, alignment.
- `saved`: whether the slot has been synced or locally accepted.
- `visible`: layer visibility flag.

## Image Customization

Image slots support:

- gallery upload
- camera upload
- drag and drop
- crop/edit via `PinturaCropModal`
- zoom
- move X/Y
- rotate, if template behavior allows it

Upload flow:

1. User selects image.
2. Browser creates `URL.createObjectURL(file)` for instant preview.
3. Editor lazily creates a customization session if needed.
4. Image uploads to:

```ts
designService.uploadCustomizationAsset(customizationId, file)
```

5. Slot is patched to backend:

```ts
designService.updateCustomizationSlot(customizationId, slotId, {
  type: 'image',
  asset,
  transform
})
```

## Text Customization

There are two text paths.

### Template Text Slots

If admin template contains text slots, they are initialized from `template.slots`.

Text controls include:

- text area
- move X/Y
- font family, when template has allowed fonts
- font size
- color
- alignment

Template text slots sync to backend through:

```ts
designService.updateCustomizationSlot(customizationId, slotId, {
  type: 'text',
  text
})
```

### Free Text Layers

The editor also supports user-created free text layers through the `Add Text` button.

Free text layers:

- are created with IDs like `free_text_<timestamp>`.
- are added to local `slotStates`.
- are injected into `previewTemplate.slots`.
- appear on the canvas as movable text boxes.
- can be deleted with `Delete Text`.
- are included in live preview/cart image capture.

Important limitation:

Free text layers are currently client-side only. They are not persisted as backend customization slots because backend template validation only knows template-defined slots. They are preserved in the final cart preview through `html2canvas` capture.

## Canvas Preview

Main preview component:

```text
speedcopy-main/src/components/customization/EditorPreview.tsx
```

Rendering order:

1. Base product image.
2. Template slots and free text slots.
3. Overlay image, if configured.

Image slots are clipped to the slot rectangle/circle and display the uploaded preview image.

Text slots render text with selected font, size, weight, color, and alignment.

Selected slot gets orange outline. Active slot can be dragged on canvas if it is a text/free graphic style slot.

## Sidebar

Main sidebar component:

```text
speedcopy-main/src/components/customization/EditorSidebar.tsx
```

Tabs:

- `Slots`: image/text editing controls.
- `Graphics`: graphic picker.
- `Layers`: layer list and visibility controls.

Current user-facing controls:

- Add Text
- Delete Text for free text layers
- upload image
- crop/edit image
- image zoom/move/rotate
- text edit/move/size/color/alignment

## Backend Customization Session

Customization session is lazy-created. It is created only when the user performs an action that needs backend persistence, such as image upload or template text update.

API:

```ts
designService.createCustomization({
  variantId,
  templateId
})
```

If user is not authenticated, login modal opens.

If auth token is invalid/expired, token is removed and login modal opens.

## Preview Generation

Preview button calls:

```ts
designService.renderCustomizationPreview(customizationId)
```

Then editor also captures the visible browser preview:

```ts
html2canvas(document.querySelector('[data-customization-preview="true"]'))
```

The UI prefers the live captured preview because it includes client-side free text layers.

If backend image fails to load, editor tries alternate upload/CDN URLs, then falls back to live capture, then placeholder image.

## Add To Cart Flow

Add to cart requires authentication.

Flow:

1. Ensure customization session exists.
2. Render backend preview if image slots are filled.
3. Finalize customization:

```ts
designService.finalizeCustomization(customizationId)
```

4. Capture live preview with `html2canvas`.
5. Cache live preview in:

```text
localStorage.speedcopy_customization_previews[customizationId]
```

6. Build cart payload.
7. `business_printing` is mapped to backend cart flow `printing`.
8. Send payload through:

```ts
orderService.addToCart(payload)
```

Cart payload includes:

- `productId`
- `productName`
- `flowType`
- `quantity`
- `unitPrice`
- `totalPrice`
- `variantId`
- `designId`
- `designName`
- `thumbnail`
- `designPreview`
- `designJson`
- `customization`

`designJson` includes:

- `customizationId`
- `renderedPreviewUrl`
- `printReadyAssetUrl`
- `livePreview`

`customization` includes:

- `customizationId`
- `templateId`
- `templateVersion`
- `renderedPreviewUrl`
- `printReadyAssetUrl`
- `lockedAt`

## Cart Image Handling

Cart page resolves image candidates in priority order:

1. cached live preview by `customizationId`
2. `designJson.livePreview`
3. `customization.renderedPreviewUrl`
4. `designJson.renderedPreviewUrl`
5. `designPreview`
6. `thumbnail`
7. product image
8. print-ready URLs

This is necessary because backend rendered preview may not include local-only free text layers.

## Local Fallbacks

If cart API fails, `orderService.addToCart` stores item in:

```text
localStorage.speedcopy_cart
```

`orderService` normalizes old array-style local carts into:

```json
{ "items": [] }
```

Cart page merges API cart items with local fallback cart items.

## Known Limitations

- Free text layers are client-only and depend on live preview capture for cart/order image.
- Backend final render currently only knows template-defined slots.
- Graphics support is partially wired; backend may reject graphic slot updates if slot is not defined in template.
- Layer reorder currently logs only and does not persist actual ordering.
- Layer visibility is tracked in state but preview rendering does not fully skip hidden layers yet.
- Build currently fails due to unrelated existing TypeScript errors in other files such as `ImageEditor.tsx` and `DesignEditorPage.tsx`.

## Main Files

```text
speedcopy-main/src/pages/CustomizationEditorPage.tsx
speedcopy-main/src/components/customization/EditorSidebar.tsx
speedcopy-main/src/components/customization/EditorPreview.tsx
speedcopy-main/src/components/customization/PinturaCropModal.tsx
speedcopy-main/src/components/customization/LayersPanel.tsx
speedcopy-main/src/components/customization/GraphicsLibrary.tsx
speedcopy-main/src/services/design.service.ts
speedcopy-main/src/services/order.service.ts
speedcopy-main/src/pages/CartPage.tsx
```

