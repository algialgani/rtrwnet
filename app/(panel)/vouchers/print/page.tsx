"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Cetak voucher: kartu siap print (10 kolom grid), auto window.print()
export default function PrintVouchersPage() {
  const search = useSearchParams();
  const ids = search.get("ids") ?? "";
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/vouchers");
      const data = await res.json();
      const all: any[] = data.vouchers ?? [];
      const filtered = ids ? all.filter((v) => ids.split(",").includes(v.id)) : all;
      setVouchers(filtered);
      setTimeout(() => window.print(), 800);
    })();
  }, [ids]);

  return (
    <div className="bg-white text-black print:p-0">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-5">
        {vouchers.map((v) => (
          <div key={v.id} className="break-inside-avoid rounded-lg border border-black p-3 text-center text-xs">
            <p className="font-bold">{v.router?.name}</p>
            <p className="mt-1">{v.profile?.name}</p>
            <p className="my-2 text-lg font-extrabold tracking-widest">{v.code}</p>
            <p>Harga: Rp{v.price?.toLocaleString("id-ID")}</p>
            <p>Masa aktif: {v.profile?.durationValue} {v.profile?.durationUnit?.toLowerCase()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
