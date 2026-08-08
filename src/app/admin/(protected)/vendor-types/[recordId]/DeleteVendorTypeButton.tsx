"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deleteVendorTypeAction } from "../actions";

export function DeleteVendorTypeButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      recordLabel={id}
      onConfirm={() => {
        deleteVendorTypeAction(id).then(() => router.push("/admin/vendor-types"));
      }}
    />
  );
}
