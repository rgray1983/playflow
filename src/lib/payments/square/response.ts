import {NextResponse} from "next/server";
import {PaymentError} from "../rules";
import {FormError} from "@/lib/waivers/signing";
export function checkoutFailure(e:unknown){return NextResponse.json({error:e instanceof PaymentError||e instanceof FormError?e.message:"Payment status is uncertain. Retry the same payment to check its status before paying again."},{status:e instanceof PaymentError||e instanceof FormError?e.status:502});}
