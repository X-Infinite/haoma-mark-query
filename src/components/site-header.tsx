"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type MeResponse = {
  user: { email: string } | null;
  subscription?: { remaining: number; limit: number; planName: string };
};

const links = [
  { href: "/", label: "首页" },
  { href: "/query", label: "号码查询" },
  { href: "/history", label: "查询历史" },
  { href: "/pricing", label: "套餐价格" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ user: null });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          号码标记查
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                pathname === l.href && "bg-muted text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {me?.user ? (
            <>
              {me.subscription && (
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {me.subscription.planName} · 剩余 {me.subscription.remaining}/
                  {me.subscription.limit}
                </span>
              )}
              <span className="max-w-[120px] truncate text-xs text-muted-foreground sm:max-w-none">
                {me.user.email}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                退出
              </Button>
            </>
          ) : (
            <>
              <ButtonLink variant="ghost" size="sm" href="/login">
                登录
              </ButtonLink>
              <ButtonLink size="sm" href="/register">
                注册
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
