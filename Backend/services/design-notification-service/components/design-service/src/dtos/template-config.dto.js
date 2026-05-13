const toSlotConfig = (slot) => ({
    slotId: slot.slotId,
    name: slot.name,
    type: slot.type,
    geometry: slot.geometry,
    behavior: slot.behavior,
    imageConfig: slot.type === 'image' ? slot.imageConfig : undefined,
    textConfig: slot.type === 'text' ? slot.textConfig : undefined,
    zIndex: slot.zIndex,
    required: slot.required,
});

const toTemplateConfigDto = ({ variant, template }) => ({
    variant: {
        id: variant.id,
        productId: variant.productId,
        productTypeId: variant.productTypeId,
        categoryId: variant.categoryId,
        name: variant.name,
        slug: variant.slug,
        sku: variant.sku,
        price: variant.price,
        mrp: variant.mrp,
        salePrice: variant.salePrice,
        currency: variant.currency || 'INR',
        attributes: variant.attributes || {},
        previewImages: variant.previewImages || [],
    },
    template: template
        ? {
              id: String(template._id),
              name: template.name,
              slug: template.slug,
              version: template.version,
              assets: template.assets,
              canvas: template.canvas,
              slots: (template.slots || []).map(toSlotConfig),
              previewConfig: template.previewConfig,
              rules: template.rules,
          }
        : null,
});

module.exports = { toTemplateConfigDto };
