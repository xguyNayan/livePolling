// Session storage keys
const STUDENT_NAME_KEY = 'polling_system_student_name';

/**
 * Save student name to session storage
 */
export const saveStudentName = (name: string): void => {
  sessionStorage.setItem(STUDENT_NAME_KEY, name);
};

/**
 * Get student name from session storage
 */
export const getStudentName = (): string | null => {
  return sessionStorage.getItem(STUDENT_NAME_KEY);
};

/**
 * Clear student name from session storage
 */
export const clearStudentName = (): void => {
  sessionStorage.removeItem(STUDENT_NAME_KEY);
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Calculate percentage for poll results
 */
export const calculatePercentage = (votes: number, totalVotes: number): number => {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
};
