"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deletePartnerTypeAction } from "../actions";

export function DeletePartnerTypeButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      recordLabel={id}
      onConfirm={() => {
        deletePartnerTypeAction(id).then(() => router.push("/admin/partner-types"));
      }}
    />
  );
}
