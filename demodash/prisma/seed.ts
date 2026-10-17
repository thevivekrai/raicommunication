import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Demo credentials — change these (or create real users from Admin → Team) before going live.
const ADMIN = { email: "admin@demodash.local", password: "Admin@12345", phone: "9000000000" };
const EMPLOYEE = { email: "employee@demodash.local", password: "Employee@12345", phone: "9000000002" };
const DELIVERY = { email: "rider@demodash.local", password: "Rider@12345", phone: "9000000001" };

// Sample catalog — names and prices are illustrative; edit them from the admin panel.
const products = [
  { id: "seed-redmi-13c", brand: "Redmi", model: "13C", price: 9499, ramStorage: "4GB / 128GB", color: "Starshine Green", img: "redmi-13c", desc: "Big 90Hz display and 5000mAh battery — a great first smartphone.", specs: { Display: '6.74" HD+ 90Hz', Camera: "50MP dual", Battery: "5000 mAh", Chipset: "Helio G85" } },
  { id: "seed-narzo-70", brand: "Realme", model: "Narzo 70x 5G", price: 11999, ramStorage: "6GB / 128GB", color: "Forest Green", img: "narzo-70", desc: "Smooth 120Hz screen with 5G at an easy price.", specs: { Display: '6.72" FHD+ 120Hz', Camera: "50MP", Battery: "5000 mAh", Chipset: "Dimensity 6100+" } },
  { id: "seed-vivo-t3", brand: "Vivo", model: "T3 5G", price: 17999, ramStorage: "8GB / 128GB", color: "Cosmic Blue", img: "vivo-t3", desc: "AMOLED display and a sharp 50MP Sony camera.", specs: { Display: '6.67" AMOLED 120Hz', Camera: "50MP Sony", Battery: "5000 mAh", Chipset: "Dimensity 7200" } },
  { id: "seed-galaxy-m35", brand: "Samsung", model: "Galaxy M35 5G", price: 19999, ramStorage: "8GB / 128GB", color: "Moonlight Blue", img: "galaxy-m35", desc: "Super AMOLED screen and a 6000mAh battery that lasts two days.", specs: { Display: '6.6" Super AMOLED 120Hz', Camera: "50MP triple", Battery: "6000 mAh", Chipset: "Exynos 1380" } },
  { id: "seed-nord-ce4", brand: "OnePlus", model: "Nord CE4", price: 24999, ramStorage: "8GB / 128GB", color: "Dark Chrome", img: "nord-ce4", desc: "Fast 100W charging with a clean, quick OS.", specs: { Display: '6.7" AMOLED 120Hz', Camera: "50MP OIS", Battery: "5500 mAh · 100W", Chipset: "Snapdragon 7 Gen 3" } },
  { id: "seed-pixel-8a", brand: "Google", model: "Pixel 8a", price: 52999, ramStorage: "8GB / 128GB", color: "Bay", img: "pixel-8a", desc: "Clean Android, great camera and 7 years of updates.", specs: { Display: '6.1" OLED 120Hz', Camera: "64MP", Battery: "4492 mAh", Chipset: "Tensor G3" } },
  { id: "seed-iphone-15", brand: "Apple", model: "iPhone 15", price: 69900, ramStorage: "6GB / 128GB", color: "Pink", img: "iphone-15", desc: "Dynamic Island, USB-C and a 48MP main camera.", specs: { Display: '6.1" Super Retina XDR', Camera: "48MP dual", Battery: "All-day", Chipset: "A16 Bionic" } },
  { id: "seed-galaxy-s24", brand: "Samsung", model: "Galaxy S24", price: 74999, ramStorage: "8GB / 256GB", color: "Amber Yellow", img: "galaxy-s24", desc: "Compact flagship with Galaxy AI features.", specs: { Display: '6.2" Dynamic AMOLED 120Hz', Camera: "50MP triple", Battery: "4000 mAh", Chipset: "Exynos 2400" } },
  { id: "seed-oneplus-12", brand: "OnePlus", model: "12", price: 64999, ramStorage: "12GB / 256GB", color: "Flowy Emerald", img: "oneplus-12", desc: "Flagship speed, Hasselblad camera and 100W charging.", specs: { Display: '6.82" LTPO AMOLED 120Hz', Camera: "50MP Hasselblad triple", Battery: "5400 mAh · 100W", Chipset: "Snapdragon 8 Gen 3" } },
  { id: "seed-iphone-15-pro", brand: "Apple", model: "iPhone 15 Pro", price: 134900, ramStorage: "8GB / 256GB", color: "Natural Titanium", img: "iphone-15-pro", desc: "Titanium design, A17 Pro chip and pro camera system.", specs: { Display: '6.1" ProMotion 120Hz', Camera: "48MP triple", Battery: "All-day", Chipset: "A17 Pro" } },
];

async function upsertUser(role: "ADMIN" | "EMPLOYEE" | "DELIVERY", name: string, creds: { email: string; password: string; phone: string }) {
  const passwordHash = await bcrypt.hash(creds.password, 10);
  return db.user.upsert({
    where: { email: creds.email },
    update: { name, role, phone: creds.phone, passwordHash, isActive: true },
    create: { name, role, email: creds.email, phone: creds.phone, passwordHash },
  });
}

async function main() {
  const admin = await upsertUser("ADMIN", "Shop Owner", ADMIN);
  await upsertUser("EMPLOYEE", "Priya (Employee)", EMPLOYEE);
  const rider = await upsertUser("DELIVERY", "Ravi Kumar", DELIVERY);

  await db.deliveryPersonProfile.upsert({
    where: { userId: rider.id },
    update: {},
    create: { userId: rider.id, name: rider.name, phone: DELIVERY.phone, vehicle: "Bike · KA 01 AB 1234", photo: null },
  });

  for (const p of products) {
    const data = {
      brand: p.brand, model: p.model, price: p.price, ramStorage: p.ramStorage, color: p.color,
      shortDescription: p.desc, specs: p.specs, images: [`/phones/${p.img}.svg`], demoAvailable: true, isActive: true, createdByUserId: admin.id,
    };
    await db.mobileProduct.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
  }

  console.log("\nSeed complete.\n");
  console.log("  Admin     :", ADMIN.email, "/", ADMIN.password);
  console.log("  Employee  :", EMPLOYEE.email, "/", EMPLOYEE.password);
  console.log("  Delivery  :", DELIVERY.phone, "(or", DELIVERY.email + ") /", DELIVERY.password);
  console.log(`  Products  : ${products.length}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
