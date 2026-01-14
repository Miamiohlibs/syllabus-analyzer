// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to combine class names with Tailwind merge.
 * Usage: cn("class1", condition && "class2")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
