// Admin phone number configuration
// Change this to your admin's phone number
export const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE || "9123456789";

// Check if a phone number belongs to admin
export const isAdminPhone = (phone) => {
  // Remove +91 prefix if present for comparison
  const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
  const cleanAdminPhone = ADMIN_PHONE.replace(/^\+91/, '').replace(/\D/g, '');
  return cleanPhone === cleanAdminPhone;
};

// Format phone for display
export const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};
