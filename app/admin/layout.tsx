import "./admin.css";

export const metadata = { title: "admin · magazine web", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
