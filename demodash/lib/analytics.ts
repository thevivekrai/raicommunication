import { Prisma } from "@prisma/client";
import { db } from "./db";
import { dateRange, startOfToday } from "./time";

export interface ProductAnalyticsRow {
  product_id: string;
  product_name: string;
  brand: string;
  model: string;
  color: string;
  ram_storage: string;
  price: number;
  image: string | null;
  is_active: boolean;
  total_demo_bookings: number;
  completed_demos: number;
  purchases: number;
  not_purchased: number;
  unavailable: number;
  cancelled: number;
  /** Not finished yet (booked, assigned, on the way, arrived or demo in progress). */
  pending: number;
  /** purchases / completed_demos × 100 (completed = demo actually happened) */
  conversion_rate: number;
  revenue: number;
}

/** Per-product funnel computed in SQL. `from`/`to` are yyyy-mm-dd in the shop timezone. */
export async function productAnalytics(from?: string, to?: string): Promise<ProductAnalyticsRow[]> {
  const range = dateRange(from, to);
  const dateCond = Prisma.sql`${range.gte ? Prisma.sql`AND b.created_at >= ${range.gte}` : Prisma.empty} ${range.lt ? Prisma.sql`AND b.created_at < ${range.lt}` : Prisma.empty}`;

  const rows = await db.$queryRaw<
    {
      id: string; brand: string; model: string; color: string; ram_storage: string; price: number; images: string[]; is_active: boolean;
      total: bigint; completed: bigint; purchases: bigint; not_purchased: bigint; unavailable: bigint; cancelled: bigint; pending: bigint; revenue: bigint;
    }[]
  >(Prisma.sql`
    SELECT p.id, p.brand, p.model, p.color, p.ram_storage, p.price, p.images, p.is_active,
      COUNT(b.id) AS total,
      COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED' AND b.outcome IN ('PURCHASED_OFFLINE','NOT_PURCHASED')) AS completed,
      COUNT(b.id) FILTER (WHERE b.outcome = 'PURCHASED_OFFLINE') AS purchases,
      COUNT(b.id) FILTER (WHERE b.outcome = 'NOT_PURCHASED') AS not_purchased,
      COUNT(b.id) FILTER (WHERE b.outcome = 'CUSTOMER_UNAVAILABLE') AS unavailable,
      COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED') AS cancelled,
      COUNT(b.id) FILTER (WHERE b.status NOT IN ('COMPLETED','CANCELLED')) AS pending,
      COALESCE(SUM(b.sale_amount) FILTER (WHERE b.outcome = 'PURCHASED_OFFLINE'), 0) AS revenue
    FROM mobile_products p
    LEFT JOIN demo_bookings b ON b.product_id = p.id ${dateCond}
    GROUP BY p.id
    ORDER BY total DESC, p.brand, p.model
  `);

  return rows.map((r) => {
    const completed = Number(r.completed);
    const purchases = Number(r.purchases);
    return {
      product_id: r.id,
      product_name: `${r.brand} ${r.model}`,
      brand: r.brand,
      model: r.model,
      color: r.color,
      ram_storage: r.ram_storage,
      price: r.price,
      image: r.images[0] ?? null,
      is_active: r.is_active,
      total_demo_bookings: Number(r.total),
      completed_demos: completed,
      purchases,
      not_purchased: Number(r.not_purchased),
      unavailable: Number(r.unavailable),
      cancelled: Number(r.cancelled),
      pending: Number(r.pending),
      conversion_rate: completed ? Math.round((purchases / completed) * 1000) / 10 : 0,
      revenue: Number(r.revenue),
    };
  });
}

export async function analyticsSummary() {
  const today = startOfToday();
  const [bookingsToday, purchasesToday, revenueToday, openNow, pendingAssign, totals, top] = await Promise.all([
    db.demoBooking.count({ where: { createdAt: { gte: today } } }),
    db.demoBooking.count({ where: { outcome: "PURCHASED_OFFLINE", completedAt: { gte: today } } }),
    db.demoBooking.aggregate({ _sum: { saleAmount: true }, where: { outcome: "PURCHASED_OFFLINE", completedAt: { gte: today } } }),
    db.demoBooking.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.demoBooking.count({ where: { status: "PENDING" } }),
    db.demoBooking.groupBy({ by: ["outcome"], where: { status: "COMPLETED" }, _count: true }),
    productAnalytics(),
  ]);

  const count = (o: string) => totals.find((t) => t.outcome === o)?._count ?? 0;
  const purchased = count("PURCHASED_OFFLINE");
  const completedDemos = purchased + count("NOT_PURCHASED");
  const allTime = await db.demoBooking.count();

  return {
    today: { bookings: bookingsToday, purchases: purchasesToday, revenue: revenueToday._sum.saleAmount ?? 0 },
    allTime: {
      total_demos: allTime,
      completed_demos: completedDemos,
      purchases: purchased,
      conversion_rate: completedDemos ? Math.round((purchased / completedDemos) * 1000) / 10 : 0,
    },
    pending_demos: openNow,
    awaiting_assignment: pendingAssign,
    top_products: top.filter((p) => p.total_demo_bookings > 0).slice(0, 5),
  };
}
