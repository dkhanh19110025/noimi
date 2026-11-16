import FavoritesView from "@/components/shop/FavoritesView";

export default function FavoritesPage() {
  return (
    <main className="container section">
      <span className="badge-tilt">Yêu thích</span>
      <h1 style={{ marginTop: 24 }}>Món bạn thích</h1>
      <p className="subtitle">— lưu lại để mua sau</p>
      <FavoritesView />
    </main>
  );
}
