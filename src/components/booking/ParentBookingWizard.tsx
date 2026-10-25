"use client";
import BookingWizard,{type BookingChild} from "./BookingWizard";
export default function ParentBookingWizard({slug,...props}:{slug:string;parent:{firstName:string;lastName:string;phone:string|null};email:string;familyChildren:BookingChild[];onClose:()=>void;onSaved:()=>Promise<void>}){
 return <BookingWizard audience={{kind:"parent",slug}} {...props}/>;
}
