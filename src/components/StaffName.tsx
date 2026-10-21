"use client";
import {useStaffIdentity} from "./StaffIdentity";
export default function StaffName({first=false}:{first?:boolean}){const name=useStaffIdentity()?.staff.name??"Staff";return <>{first?name.split(" ")[0]:name}</>;}
