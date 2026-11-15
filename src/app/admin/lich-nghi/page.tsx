import Link from "next/link";
import AdminTabs from "@/components/admin/AdminTabs";
import BlockForm from "@/components/admin/BlockForm";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase-server";
import { vnDateStr, vnInstant } from "@/data/booking";
import { fmtDayLong, fmtTime } from "@/lib/format";
import {
  blockLabel,
  findAffected,
  parseBlockInput,
  type AffectedBooking,
} from "@/lib/blocks";
import { createBlock, deleteBlock } from "../actions";

export const dynamic = "force-dynamic";

type Block = { id: string; day: string; start_min: number; end_min: number; reason: string | null };

function Affected({ list }: { list: AffectedBooking[] }) {
  return (
    <ul className="block-affected">
      {list.map((b) => (
        <li key={b.id}>
          <div>
            <strong>{b.customer_name}</strong>
            <span className="muted">
              {" "}· {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)} · {b.combo_name}
            </span>
          </div>
          <div className="block-affected__btns">
            <a className="btn btn--white interactive" href={`tel:${b.customer_phone}`}>📞 Gọi</a>
            <a
              className="btn btn--blue interactive"
              href={`https://zalo.me/${b.customer_phone}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 Zalo
            </a>
            <Link className="btn btn--white interactive" href={`/admin/lich/${b.id}`}>Xem</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminBlocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const today = vnDateStr(Date.now());
  const db = getSupabase();

  // Chế độ hỏi lại: khung đang định chặn đã có khách đặt
  const pending = sp.confirm === "1" ? parseBlockInput(sp) : null;
  const pendingAffected =
    pending && db ? await findAffected(db, pending.day, pending.startMin, pending.endMin) : [];

  let blocks: Block[] = [];
  let affectedByBlock = new Map<string, AffectedBooking[]>();
  let loadError = "";
  if (!db) {
    loadError = "Chưa kết nối database.";
  } else {
    const { data, error } = await db
      .from("blocked_slots")
      .select("id, day, start_min, end_min, reason")
      .gte("day", today)
      .order("day", { ascending: true })
      .order("start_min", { ascending: true })
      .limit(200);
    if (error) loadError = "Không tải được lịch nghỉ. Vui lòng thử lại.";
    blocks = (data ?? []) as Block[];

    // Lịch đã đặt nằm trong từng khung nghỉ (nhắc chủ shop báo khách)
    if (blocks.length > 0) {
      const from = vnInstant(blocks[0].day);
      const to = vnInstant(blocks[blocks.length - 1].day) + 24 * 3600 * 1000;
      const { data: bk } = await db
        .from("bookings")
        .select("id, customer_name, customer_phone, combo_name, starts_at, ends_at")
        .in("status", ["confirmed", "arrived"])
        .gte("starts_at", new Date(from).toISOString())
        .lt("starts_at", new Date(to).toISOString());
      const list = (bk ?? []) as AffectedBooking[];
      affectedByBlock = new Map(
        blocks.map((b) => {
          const s = vnInstant(b.day) + b.start_min * 60000;
          const e = vnInstant(b.day) + b.end_min * 60000;
          return [
            b.id,
            list.filter((x) => Date.parse(x.starts_at) < e && Date.parse(x.ends_at) > s),
          ];
        })
      );
    }
  }

  return (
    <main className="container section admin-main">
      <h1 className="admin-title">Lịch nghỉ</h1>
      <AdminTabs current="blocks" />
      <p className="muted" style={{ textAlign: "center", marginTop: 12 }}>
        Mặc định ngày nào cũng mở. Bận thì chặn, khách sẽ không thấy giờ đó nữa.
      </p>

      {sp.msg === "saved" && <div className="callout" style={{ marginTop: 16 }} role="status">✅ Đã chặn lịch.</div>}
      {sp.msg === "removed" && <div className="callout" style={{ marginTop: 16 }} role="status">✅ Đã bỏ lịch nghỉ, giờ đó mở lại cho khách.</div>}
      {sp.msg === "invalid" && (
        <div className="callout callout--error" style={{ marginTop: 16 }} role="alert">
          ⚠️ Chưa chọn đúng ngày hoặc khung giờ. Ngày nghỉ không được ở quá khứ.
        </div>
      )}
      {sp.msg === "error" && (
        <div className="callout callout--error" style={{ marginTop: 16 }} role="alert">
          ⚠️ Không thực hiện được. Vui lòng thử lại.
        </div>
      )}
      {loadError && <div className="callout callout--error" style={{ marginTop: 16 }}>⚠️ {loadError}</div>}

      {pending && (
        <section className="card block-warn" role="alert">
          <h2>⚠️ Đã có khách đặt trong khung này</h2>
          <p>
            {fmtDayLong(pending.day)} · <strong>{blockLabel(pending.startMin, pending.endMin)}</strong>
            {pendingAffected.length > 0
              ? ` đang có ${pendingAffected.length} lịch. Hệ thống KHÔNG tự hủy lịch của khách, bạn báo khách rồi tự hủy hoặc dời qua nút “Hủy lịch”.`
              : " hiện không còn lịch nào."}
          </p>
          {pendingAffected.length > 0 && <Affected list={pendingAffected} />}
          <div className="block-warn__actions">
            <Link className="btn btn--white interactive" href="/admin/lich-nghi">Không chặn nữa</Link>
            <form action={createBlock}>
              <input type="hidden" name="force" value="1" />
              <input type="hidden" name="day" value={pending.day} />
              <input type="hidden" name="type" value={pending.type} />
              <input type="hidden" name="from" value={pending.startMin} />
              <input type="hidden" name="to" value={pending.endMin} />
              <input type="hidden" name="reason" value={pending.reason} />
              <button type="submit" className="btn btn--pink interactive">⛔ Vẫn chặn</button>
            </form>
          </div>
        </section>
      )}

      <BlockForm action={createBlock} minDay={today} />

      <h2 className="block-list-title">Các lịch nghỉ sắp tới</h2>
      {!loadError && blocks.length === 0 && (
        <div className="callout" style={{ marginTop: 12 }}>😌 Chưa có lịch nghỉ nào.</div>
      )}
      <ul className="admin-list">
        {blocks.map((b) => {
          const aff = affectedByBlock.get(b.id) ?? [];
          return (
            <li key={b.id} className="card admin-hist">
              <div className="block-item">
                <div>
                  <h3>{fmtDayLong(b.day)}</h3>
                  <p>
                    <span className="pill pill--pink">{blockLabel(b.start_min, b.end_min)}</span>
                  </p>
                  {b.reason && <p className="muted" style={{ marginTop: 6 }}>📝 {b.reason}</p>}
                </div>
                <form action={deleteBlock}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="btn btn--white interactive">Bỏ nghỉ</button>
                </form>
              </div>
              {aff.length > 0 && (
                <div className="block-item__warn">
                  <p>⚠️ Còn {aff.length} lịch khách đã đặt trong khung này, nhớ báo khách:</p>
                  <Affected list={aff} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
