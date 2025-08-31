/**
 * Date utilities for consistent date handling across the application
 * All dates are handled as UTC to avoid timezone issues
 */

/**
 * Parse a YYYY-MM-DD string from the database as a UTC Date object at midnight
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight UTC of the given date
 */
export function parseDbDateToUtc(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get a UTC Date object representing midnight of the given date
 * @param date - Any Date object
 * @returns New Date object representing midnight UTC of the given date
 */
export function getUtcMidnight(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Format a Date object for display in London timezone
 * @param date - Date object to format
 * @param options - Additional formatting options
 * @returns Formatted date string in London timezone
 */
export function formatDateForDisplay(
  date: Date, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/London',
    ...options
  };
  
  return date.toLocaleDateString('en-GB', defaultOptions);
}

/**
 * Convert a Date object to YYYY-MM-DD string for database storage
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForDb(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if two dates represent the same day (ignoring time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates represent the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  const utc1 = getUtcMidnight(date1);
  const utc2 = getUtcMidnight(date2);
  return utc1.getTime() === utc2.getTime();
}