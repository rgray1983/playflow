"use client";
import {useState} from "react";
import SigningDialog from "@/components/forms/SigningDialog";
import Register from "./Register";
export default function CheckoutDialog({familyId,saleId,onClose,onChanged}:{familyId:string;saleId?:string;onClose:()=>void;onChanged:()=>void}){
  const [busy,setBusy]=useState(false);
  return <SigningDialog title="Checkout" wide busy={busy} onClose={onClose}><Register initialFamilyId={familyId} initialSaleId={saleId} onChanged={onChanged} onBusyChange={setBusy}/></SigningDialog>;
}
