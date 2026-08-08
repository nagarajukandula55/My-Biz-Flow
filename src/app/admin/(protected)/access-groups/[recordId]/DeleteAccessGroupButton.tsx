"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deleteAccessGroupAction } from "../actions";

export function DeleteAccessGroupButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      recordLabel={id}
      onConfirm={() => {
        deleteAccessGroupAction(id).then(() => router.push("/admin/access-groups"));
      }}
    />
  );
}
