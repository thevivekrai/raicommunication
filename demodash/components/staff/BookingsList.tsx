"use client";
import { useEffect, useState } from "react";
import { qs, useApi, useDebounced } from "@/lib/client";
import { EmptyState, ErrorState, Pagination } from "@/components/ui";
import { BookingsTable, TableSkeleton, type BookingRow } from "./common";
import { EMPTY_FILTERS, FilterBar, type BookingFilters } from "./Filters";

const PAGE_SIZE = 20;

export function BookingsList({ productId, showProduct = true, endpoint = "/api/admin/bookings" }: { productId?: string; showProduct?: boolean; endpoint?: string }) {
  const [filters, setFilters] = useState<BookingFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const q = useDebounced(filters.q, 300);
  const products = useApi<{ products: { id: string; brand: string; model: string }[] }>(showProduct ? "/api/admin/products" : null);

  useEffect(() => setPage(1), [filters.status, filters.outcome, filters.product_id, filters.from, filters.to, q]);

  const url = `${endpoint}${qs({ ...filters, q, product_id: productId ?? filters.product_id, page, page_size: PAGE_SIZE })}`;
  const { data, error, loading, reload } = useApi<{ bookings: BookingRow[]; total: number }>(url, 20000);

  return (
    <div className="card overflow-hidden">
      <FilterBar value={filters} onChange={setFilters} showProduct={showProduct} products={products.data?.products.map((p) => ({ id: p.id, name: `${p.brand} ${p.model}` }))} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <TableSkeleton /> : !data || data.bookings.length === 0 ? (
        <EmptyState title="No bookings found" hint="Try widening the date range or clearing filters." />
      ) : (
        <>
          <BookingsTable rows={data.bookings} showProduct={showProduct} showAddress />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
