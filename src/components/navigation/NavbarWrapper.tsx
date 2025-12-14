"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

const HIDDEN_PATHS = ["/login", "/admin"];

export function NavbarWrapper() {
  const pathname = usePathname() ?? "";
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }
  return <Navbar />;
}

