"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  size?: number;
  priority?: boolean;
};

const DARK_SRC = "/brand/review-logo-dark.svg";
const LIGHT_SRC = "/brand/review-logo-light.svg";

export function BrandLogo({
  className,
  showWordmark = true,
  wordmarkClassName,
  size = 40,
  priority,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc =
    !mounted || resolvedTheme === "dark" ? DARK_SRC : LIGHT_SRC;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        <Image
          src={logoSrc}
          alt="ReView Dashboard logo"
          fill
          priority={priority}
          className="object-contain"
          sizes={`${size}px`}
        />
      </div>
      {showWordmark && (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight text-white",
            wordmarkClassName
          )}
        >
          ReView Dashboard
        </span>
      )}
    </div>
  );
}

