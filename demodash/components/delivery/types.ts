export interface Assignment {
  id: string; code: string; status: string; createdAt: string; preferredTime: string | null; address: string; lat: number | null; lng: number | null;
  notes: string | null; otpVerified: boolean; outcome: string | null; saleAmount: number | null;
  customer: { name: string; phone: string };
  product: { brand: string; model: string; color: string; ramStorage: string; price: number; image: string | null };
}
