const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;

const clampDiscount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(0, Math.min(100, roundCurrency(numeric)));
};

const deriveSalePriceFromDiscount = (mrp, discountPct) => {
    const normalizedMrp = Number(mrp);
    const normalizedDiscount = clampDiscount(discountPct);
    if (!Number.isFinite(normalizedMrp) || normalizedDiscount === null) return null;
    return roundCurrency(normalizedMrp * (1 - normalizedDiscount / 100));
};

const deriveDiscountPctFromPrices = (mrp, salePrice) => {
    const normalizedMrp = Number(mrp);
    const normalizedSalePrice = Number(salePrice);
    if (!Number.isFinite(normalizedMrp) || normalizedMrp <= 0) return 0;
    if (!Number.isFinite(normalizedSalePrice) || normalizedSalePrice >= normalizedMrp) return 0;
    return roundCurrency(((normalizedMrp - normalizedSalePrice) / normalizedMrp) * 100);
};

const resolveDiscountBadge = (discountPct, explicitBadge, existingBadge) => {
    const normalizedDiscount = clampDiscount(discountPct) || 0;

    if (explicitBadge !== undefined) {
        return explicitBadge;
    }

    if (normalizedDiscount > 0) {
        return existingBadge || 'sale';
    }

    if (existingBadge === 'sale') {
        return null;
    }

    return existingBadge;
};

const normalizePriceInput = (payload = {}, { partial = false, existingBadge } = {}) => {
    const normalized = { ...payload };
    const hasMrp = payload.mrp !== undefined && payload.mrp !== null && payload.mrp !== '';
    const hasSalePrice =
        payload.sale_price !== undefined && payload.sale_price !== null && payload.sale_price !== '';
    const hasDiscountPct =
        payload.discount_pct !== undefined &&
        payload.discount_pct !== null &&
        payload.discount_pct !== '';

    if (hasMrp && hasDiscountPct && !hasSalePrice) {
        normalized.sale_price = deriveSalePriceFromDiscount(payload.mrp, payload.discount_pct);
    }

    if (hasMrp && hasSalePrice) {
        normalized.discount_pct = deriveDiscountPctFromPrices(payload.mrp, payload.sale_price);
    } else if (hasDiscountPct) {
        normalized.discount_pct = clampDiscount(payload.discount_pct);
    } else if (!partial) {
        normalized.discount_pct = 0;
    }

    if (hasMrp || hasSalePrice || hasDiscountPct || normalized.badge !== undefined || existingBadge) {
        normalized.badge = resolveDiscountBadge(
            normalized.discount_pct,
            normalized.badge,
            existingBadge
        );
    }

    return normalized;
};

module.exports = {
    clampDiscount,
    deriveSalePriceFromDiscount,
    deriveDiscountPctFromPrices,
    resolveDiscountBadge,
    normalizePriceInput,
};
