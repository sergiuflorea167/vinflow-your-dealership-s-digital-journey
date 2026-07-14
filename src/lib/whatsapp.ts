export const normalizeWhatsAppPhone = (phone?: string | null): string => {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";

  const hasInternationalPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return "";
  if (hasInternationalPrefix) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `49${digits.slice(1)}`;
  return digits;
};

export const buildWhatsAppUrl = ({
  phone,
  message,
}: {
  phone?: string | null;
  message: string;
}): string => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const params = new URLSearchParams({ text: message });
  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?${params.toString()}`
    : `https://wa.me/?${params.toString()}`;
};
