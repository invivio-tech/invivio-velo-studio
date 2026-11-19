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

/** Duração para exibir ("30 min", "1h", "1h30"), aceitando o texto livre do cadastro ("30min.", "2h."). */
export function formatDuration(duration: string | number | null | undefined): string {
  if (duration === null || duration === undefined || String(duration).trim() === '') return '';
  const total = parseDuration(duration as string | number);
  if (!total || total <= 0) return String(duration);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
