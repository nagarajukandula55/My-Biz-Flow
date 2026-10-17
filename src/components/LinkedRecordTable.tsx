"use client";
import Link from "next/link";
import { DataTable, type Column, type Row } from "./DataTable";
export function LinkedRecordTable({columns,rows}:{columns:Column[];rows:Row[]}) {
  return <DataTable columns={[...columns,{key:"open",label:"Open",type:"actions",render:row=><Link className="inline-flex min-h-11 items-center text-teal underline" href={String(row.href)}>View / manage</Link>}]} rows={rows}/>;
}
