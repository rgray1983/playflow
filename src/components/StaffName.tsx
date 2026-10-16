"use client";
import { useEffect, useState } from "react";
export default function StaffName({ first = false }: { first?: boolean }) {
  const [name, setName] = useState("Staff");
  useEffect(() => {
    let active = true;
    fetch("/api/staff/me", { cache: "no-store" }).then(async r => r.ok ? r.json() : null).then(data => { if (active && data?.staff?.name) setName(data.staff.name); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <>{first ? name.split(" ")[0] : name}</>;
}
