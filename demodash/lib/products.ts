import type { MobileProduct } from "@prisma/client";

export function publicProduct(p: MobileProduct) {
  return {
    id: p.id,
    category: p.category,
    brand: p.brand,
    model: p.model,
    name: `${p.brand} ${p.model}`,
    shortDescription: p.shortDescription,
    price: p.price,
    ramStorage: p.ramStorage,
    color: p.color,
    specs: (p.specs ?? {}) as Record<string, string>,
    images: p.images,
    demoAvailable: p.demoAvailable,
  };
}

export type PublicProduct = ReturnType<typeof publicProduct>;
