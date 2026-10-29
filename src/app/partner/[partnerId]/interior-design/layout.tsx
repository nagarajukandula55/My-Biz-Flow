import type { ReactNode } from "react";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
export default async function InteriorDesignLayout({ children, params }: { children: ReactNode; params: { partnerId: string } }) { await requireSessionPartnerId(params.partnerId); return children; }
