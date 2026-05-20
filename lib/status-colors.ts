/**
 * Status badge colour classes — dark-mode-aware.
 * Use these instead of hardcoded Tailwind colour strings.
 */
export const STATUS_BG: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300",
  completed: "bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300",
  cancelled: "bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400",
  no_show:   "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

export const STATUS_LABEL: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show:   "No Show",
};

export const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-green-500",
  pending:   "bg-amber-400",
  completed: "bg-blue-400",
  cancelled: "bg-gray-400",
  no_show:   "bg-red-500",
};
