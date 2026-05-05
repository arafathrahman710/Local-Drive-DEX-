import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getContrastColor(hexColor: string | undefined): 'white' | 'dark' {
  if (!hexColor) return 'dark';
  
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
  
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 200 ? 'white' : 'dark';
}
