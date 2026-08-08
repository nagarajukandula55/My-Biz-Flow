"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deleteRoleAction } from "../actions";

export function DeleteRoleButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      recordLabel={id}
      onConfirm={() => {
        deleteRoleAction(id).then(() => router.push("/admin/roles"));
      }}
    />
  );
}
