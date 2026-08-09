"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deleteOfferAction } from "../actions";

export function DeleteOfferButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      recordLabel={name}
      onConfirm={() => {
        deleteOfferAction(id).then(() => router.push("/admin/offers"));
      }}
    />
  );
}
