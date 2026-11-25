"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded border border-slate-700 px-3 py-1 hover:border-red-500 hover:text-red-400"
    >
      Logout
    </button>
  );
}
