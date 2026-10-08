import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration;
  if (!duration) return 30;
  
  const lower = duration.toString().toLowerCase().trim();
  
  // If it's a simple number (e.g. "45")
  if (/^\d+$/.test(lower)) {
    return parseInt(lower, 10);
  }

  const nums = lower.match(/\d+/g);

  // Time format like "01:30"
  if (lower.includes(':')) {
    if (nums && nums.length > 1) {
       return parseInt(nums[0], 10) * 60 + parseInt(nums[1], 10);
    }
  }
  
  // Hours format like "1 hora", "1h30"
  if (lower.includes('h')) {
    let total = 0;
    if (nums && nums.length > 0) {
      total += parseInt(nums[0], 10) * 60;
      if (nums.length > 1) {
         total += parseInt(nums[1], 10);
      }
    }
    return total > 0 ? total : 30;
  }
  
  // Minutes format like "45 min", "30m"
  if (lower.includes('m')) {
    if (nums && nums.length > 0) {
      return parseInt(nums[0], 10);
    }
  }
  
  return parseInt(lower, 10) || 30;
}
