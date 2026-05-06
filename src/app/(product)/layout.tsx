import { AuthGuard } from "@/components/shell/auth-guard";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
