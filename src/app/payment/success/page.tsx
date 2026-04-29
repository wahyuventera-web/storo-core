"use client";

export const dynamic = "force-dynamic";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function SuccessContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-muted-foreground" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
