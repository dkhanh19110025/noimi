import "server-only";
import type { getSupabase } from "@/lib/supabase-server";
import type { History } from "@/lib/discount";

/** Lịch sử của một số điện thoại, chỉ đếm (không tải dữ liệu khách). */
export async function getHistory(db: NonNullable<ReturnType<typeof getSupabase>>, phone: string): Promise<History> {
  const count = async (table: "bookings" | "shop_orders", statuses: string[]) => {
    const { count, error } = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .in("status", statuses);
    if (error) throw error;
    return count ?? 0;
  };
  const [doneBookings, pendingBookings, orders, doneOrders] = await Promise.all([
    count("bookings", ["done"]),
    count("bookings", ["confirmed", "arrived"]),
    count("shop_orders", ["placed", "done"]),
    count("shop_orders", ["done"]),
  ]);
  return { doneBookings, pendingBookings, orders, doneOrders };
}
