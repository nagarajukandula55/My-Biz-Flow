"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deletePlanAction } from "../actions";

export function DeletePlanButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      recordLabel={id}
      onConfirm={() => {
        deletePlanAction(id).then(() => router.push("/admin/plans"));
      }}
    />
  );
}
