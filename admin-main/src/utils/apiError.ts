const FIELD_LABELS: Record<string, string> = {
  basePrice: "Base price",
  categoryId: "Category",
  compensationType: "Compensation type",
  compensationValue: "Compensation amount",
  confirmPassword: "Confirm password",
  currentPassword: "Current password",
  customerId: "Customer ID",
  flowType: "Flow type",
  fromStatus: "From status",
  imageUrl: "Image URL",
  isActive: "Status",
  maxMinutes: "Max time",
  newPassword: "New password",
  orderId: "Order ID",
  phone: "Phone number",
  sale_price: "Sale price",
  toStatus: "To status",
  warningMinutes: "Warning time",
};

const humanizeField = (field: string) => {
  const clean = String(field || "")
    .replace(/^body\./, "")
    .replace(/^data\./, "")
    .split(".")
    .filter(Boolean)
    .pop() || "";

  if (!clean) return "";
  if (FIELD_LABELS[clean]) return FIELD_LABELS[clean];

  return clean
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, char => char.toUpperCase());
};

const getValidationItems = (errors: unknown): Array<{ field?: string; message?: string }> => {
  if (Array.isArray(errors)) {
    return errors.map((err: any) => ({
      field: err?.field || err?.path || err?.param || err?.property || err?.key,
      message: typeof err?.message === "string" ? err.message : undefined,
    }));
  }

  if (errors && typeof errors === "object") {
    return Object.entries(errors as Record<string, unknown>).map(([field, value]) => ({
      field,
      message: Array.isArray(value) ? String(value[0] || "") : String(value || ""),
    }));
  }

  return [];
};

export const toFriendlyApiError = (error: any, fallback = "Something went wrong. Please try again.") => {
  const data = error?.response?.data || error?.data || error;
  const rawMessage = data?.message || error?.message || "";
  const validationItems = getValidationItems(data?.errors || error?.errors);

  if (validationItems.length > 0) {
    const missingFields = validationItems
      .filter(item => /required|missing|empty|provide|fill/i.test(item.message || ""))
      .map(item => humanizeField(item.field || ""))
      .filter(Boolean);

    if (missingFields.length > 0) {
      return `Please fill: ${Array.from(new Set(missingFields)).join(", ")}.`;
    }

    const details = validationItems
      .map(item => {
        const label = humanizeField(item.field || "");
        const message = item.message || "is invalid";
        return label ? `${label}: ${message}` : message;
      })
      .filter(Boolean);

    if (details.length > 0) return details.join(" ");
  }

  if (/validation failed/i.test(rawMessage)) {
    return "Please check the required fields and try again.";
  }

  return rawMessage || fallback;
};
