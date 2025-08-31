import { StudyItem, Question } from '../types';
import { getAccessibleQuestions, filterQuestionsByStudyItems } from './quizUtils';

/**
 * Calculate total questions for study items based on user's subscription tier
 * @param studyItems - Array of study items to calculate questions for
 * @param questions - Array of all available questions
 * @param userPlan - User's subscription plan
 * @param developerLog - Optional logging function for developer mode
 * @returns Total number of accessible questions for the study items
 */
export function calculateTotalQuestionsForStudyItems(
  studyItems: StudyItem[],
  questions: Question[],
  userPlan: 'free' | 'pro' | 'enterprise' = 'free',
  developerLog?: (...args: any[]) => void
): number {
  developerLog?.('*** Entering calculateTotalQuestionsForStudyItems ***');
  developerLog?.('*** Input studyItems:', studyItems);
  developerLog?.('*** Total questions available:', questions.length);
  
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: Input studyItems:', studyItems);
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: Total questions in database:', questions.length);
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: User subscription plan:', userPlan);
  
  // Use the utility function to filter questions by study items (handles books, chapters, and verses)
  const filteredQuestions = filterQuestionsByStudyItems(questions, studyItems);
  
  // Filter by user's accessible tiers
  const accessibleQuestions = getAccessibleQuestions(
    filteredQuestions, 
    userPlan
  );
  
  developerLog?.('*** Final count:', accessibleQuestions.length);
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: Total count:', accessibleQuestions.length);
  return accessibleQuestions.length;
}

/**
 * Calculate study streak based on completed assignments
 * @param assignments - Array of study assignments
 * @returns Number of consecutive days with completed assignments
 */
export function calculateStudyStreak(assignments: any[]): number {
  if (!assignments || assignments.length === 0) return 0;
  
  const completedAssignments = assignments
    .filter(a => a.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (completedAssignments.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < completedAssignments.length; i++) {
    const assignmentDate = new Date(completedAssignments[i].date);
    assignmentDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    
    if (assignmentDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Format total time spent in a readable format
 * @param minutes - Total minutes spent
 * @returns Formatted time string
 */
export function formatTotalTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format study items for display in assignment tables
 * @param studyItems - Array of study items
 * @returns Formatted string representation
 */
export function formatStudyItemsForAssignment(studyItems: StudyItem[]): string {
  if (!studyItems || studyItems.length === 0) return '';
  
  // Group by book
  const bookGroups = studyItems.reduce((acc, item) => {
    if (!acc[item.book]) {
      acc[item.book] = [];
    }
    acc[item.book].push(item);
    return acc;
  }, {} as Record<string, StudyItem[]>);
  
  return Object.entries(bookGroups)
    .map(([book, items]) => {
      // Group by chapter within each book
      const chapterGroups = items.reduce((acc, item) => {
        const key = item.chapter || 'General';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {} as Record<string, StudyItem[]>);
      
      const chapterRanges = Object.keys(chapterGroups)
        .filter(chapter => chapter !== 'General')
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(chapter => {
          const verses = chapterGroups[chapter]
            .filter(item => item.verse)
            .map(item => item.verse!)
            .sort((a, b) => a - b);
          
          if (verses.length > 0) {
            const verseRanges = [];
            let start = verses[0];
            let end = verses[0];
            
            for (let i = 1; i < verses.length; i++) {
              if (verses[i] === end + 1) {
                end = verses[i];
              } else {
                verseRanges.push(start === end ? `${start}` : `${start}-${end}`);
                start = end = verses[i];
              }
            }
            verseRanges.push(start === end ? `${start}` : `${start}-${end}`);
            
            return `${chapter}:${verseRanges.join(',')}`;
          } else {
            return chapter;
          }
        });
      
      if (chapterGroups['General']) {
        chapterRanges.unshift('General');
      }
      
      return `${book} ${chapterRanges.join(', ')}`;
    })
    .join('; ');
}