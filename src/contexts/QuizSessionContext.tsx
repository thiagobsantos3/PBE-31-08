import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { QuizSession, QuizSessionContextType } from '../types';
import { useAuth } from './AuthContext';
// Import for streak calculation
import { calculateStudyStreak } from '../utils/quizHelpers'; // Import for streak calculation
import { useNotification } from './NotificationContext';

// Assume these types exist based on the new tables the user needs to create
interface UserStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  last_quiz_date?: string; // To help with streak calculation if not using all sessions
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria_type: string; // e.g., 'total_quizzes_completed', 'total_points_earned', 'longest_streak'
  criteria_value: number;
  badge_icon_url: string;
}

interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}
import { checkAndMarkAssignmentCompleted } from '../utils/assignmentUpdates';
import { XP_PER_LEVEL, calculateLevel } from '../constants/gamification';

const QuizSessionContext = createContext<QuizSessionContextType | undefined>(undefined);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const { user, developerLog } = useAuth();
  const { showNotification } = useNotification();

  // Load sessions from Supabase when user changes
  useEffect(() => {
    if (user) {
      loadUserSessions();
    } else {
      setSessions([]);
    }
  }, [user]);

  const loadUserSessions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading quiz sessions:', error);
    }
  }, [user]);

  const createQuizSession = useCallback(async (sessionData: Omit<QuizSession, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      developerLog('🚀 Creating quiz session...', sessionData);
      
      const { data, error } = await supabase
        .from('quiz_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        developerLog('❌ Error creating quiz session:', error);
        throw error;
      }

      developerLog('✅ Quiz session created successfully:', data);

      // Add to local state
      setSessions(prev => [data, ...prev]);
      
      return data.id;
    } catch (error) {
      developerLog('💥 Error creating quiz session:', error);
      throw error;
    }
  }, [user]);

  const loadQuizSession = useCallback((sessionId: string): QuizSession | null => {
    return sessions.find(session => session.id === sessionId) || null;
  }, [sessions]);

  const updateQuizSession = useCallback(async (sessionId: string, updates: Partial<QuizSession>): Promise<void> => {
    try {
      developerLog('🔄 Updating quiz session:', sessionId, 'with updates:', updates);
      
      const { error } = await supabase
        .from('quiz_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      // Check if the quiz session is being marked as completed and has an assignment
      if (updates.status === 'completed') {
        developerLog('🎯 Quiz session completed, checking for assignment...');
        
        // Find the session to get its assignment_id
        const session = sessions.find(s => s.id === sessionId);
        if (session?.assignment_id) {
          developerLog('📚 Found assignment ID, marking as completed:', session.assignment_id);
          try {
            developerLog('🔍 Found session for completion check:', session ? { id: session.id, assignment_id: session.assignment_id, type: session.type } : 'not found');
            await checkAndMarkAssignmentCompleted(session.assignment_id);
            developerLog('✅ Assignment completion check completed');
          } catch (error) {
            developerLog('❌ Failed to check/mark assignment as completed:', error);
            // Don't throw here to avoid disrupting the quiz completion flow
          }
        } else {
          developerLog('ℹ️ No assignment associated with this quiz session');
          developerLog('ℹ️ Session data:', session ? { id: session.id, type: session.type, assignment_id: session.assignment_id } : 'session not found');
        }

        // --- Gamification Logic Starts Here ---
        if (user && session) {
          developerLog('🎮 Starting gamification updates for user:', user.id);

          // 1. Update User Stats (XP, Level, Longest Streak)
          try {
            const { data: currentUserStats, error: statsError } = await supabase
              .from('user_stats') // User needs to create this table
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();

            if (statsError) throw statsError;

            let newTotalXp = (currentUserStats?.total_xp || 0) + session.total_points; // XP from quiz points
            let newCurrentLevel = currentUserStats?.current_level || 0;

            // Calculate new level using shared constant
            newCurrentLevel = calculateLevel(newTotalXp);

            // Recalculate study streak
            const { data: allCompletedSessions, error: allSessionsError } = await supabase
              .from('quiz_sessions')
              .select('completed_at')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .order('completed_at', { ascending: false });

            if (allSessionsError) throw allSessionsError;

            const currentStudyStreak = calculateStudyStreak(allCompletedSessions || []);
            let newLongestStreak = Math.max(currentUserStats?.longest_streak || 0, currentStudyStreak);

            const { error: upsertStatsError } = await supabase
              .from('user_stats') // User needs to create this table
              .upsert({
                user_id: user.id,
                total_xp: newTotalXp,
                current_level: newCurrentLevel,
                longest_streak: newLongestStreak,
                last_quiz_date: new Date().toISOString().split('T')[0], // Store date for streak calculation
              }, { onConflict: 'user_id' });

            if (upsertStatsError) throw upsertStatsError;
            developerLog('✅ User stats updated:', { newTotalXp, newCurrentLevel, newLongestStreak });

            // 2. Check for Achievements
            const { data: allAchievements, error: achievementsError } = await supabase
              .from('achievements') // User needs to create this table
              .select('*');

            if (achievementsError) throw achievementsError;

            const { data: userUnlockedAchievements, error: userAchievementsError } = await supabase
              .from('user_achievements') // User needs to create this table
              .select('achievement_id')
              .eq('user_id', user.id);

            if (userAchievementsError) throw userAchievementsError;

            const unlockedAchievementIds = new Set(userUnlockedAchievements?.map(ua => ua.achievement_id));

            for (const achievement of allAchievements || []) {
              if (!unlockedAchievementIds.has(achievement.id)) {
                let criteriaMet = false;

                // --- User needs to define achievement criteria checking logic here ---
                switch (achievement.criteria_type) {
                  case 'total_quizzes_completed':
                    const { count: totalQuizzesCount, error: countError } = await supabase
                      .from('quiz_sessions')
                      .select('*', { count: 'exact', head: true })
                      .eq('user_id', user.id)
                      .eq('status', 'completed');
                    if (!countError && totalQuizzesCount >= achievement.criteria_value) {
                      criteriaMet = true;
                    }
                    break;
                  case 'total_points_earned':
                    if (newTotalXp >= achievement.criteria_value) { // Using XP as total points earned
                      criteriaMet = true;
                    }
                    break;
                  case 'longest_streak':
                    if (newLongestStreak >= achievement.criteria_value) {
                      criteriaMet = true;
                    }
                    break;
                  case 'total_questions_answered':
                    const { count: totalAnsweredCount, error: answeredCountError } = await supabase
                        .from('quiz_question_logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    if (!answeredCountError && totalAnsweredCount >= achievement.criteria_value) {
                        criteriaMet = true;
                    }
                    break;
                  case 'perfect_quiz':
                    if (session.total_points === session.max_points && session.max_points > 0) {
                        criteriaMet = true;
                    }
                    break;
                  case 'speed_demon':
                    // Assuming criteria_value is in minutes for speed_demon
                    if (session.estimated_minutes <= achievement.criteria_value) {
                        criteriaMet = true;
                    }
                    break;
                  case 'accuracy_book_ruth':
                  case 'accuracy_book_esther':
                  case 'accuracy_book_daniel':
                  case 'accuracy_chapter':
                  case 'accuracy_tier_free':
                  case 'accuracy_tier_pro':
                  case 'accuracy_tier_enterprise':
                      // These require more complex queries or pre-calculated stats.
                      // The user will need to implement the specific logic for these.
                      developerLog(`⚠️ Achievement criteria_type '${achievement.criteria_type}' not yet fully implemented in logic.`);
                      break;
                }
                // -------------------------------------------------------------------

                if (criteriaMet) {
                  const { error: unlockError } = await supabase
                    .from('user_achievements') // User needs to create this table
                    .insert({
                      user_id: user.id,
                      achievement_id: achievement.id,
                      unlocked_at: new Date().toISOString(),
                    });

                  if (unlockError) throw unlockError;
                  showNotification('achievement', achievement); // Trigger notification
                  developerLog('🎉 Achievement unlocked:', achievement.name);
                  // Optionally, trigger a notification in the UI
                }
              }
            }
          } catch (gamificationError) {
            console.error('💥 Gamification update failed:', gamificationError);
            // Do not re-throw, as it shouldn't block quiz session update
          }
        }
        // --- Gamification Logic Ends Here ---
      }

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, ...updates, updated_at: new Date().toISOString() }
          : session
      ));
    } catch (error) {
      console.error('Error updating quiz session:', error);
      throw error;
    }
  }, [sessions, user, developerLog]);

  const deleteQuizSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('quiz_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      // Remove from local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Error deleting quiz session:', error);
      throw error;
    }
  }, []);

  const getActiveSessionsForUser = useCallback((userId: string): QuizSession[] => {
    return sessions.filter(session => 
      session.user_id === userId && 
      (session.status === 'active' || session.status === 'paused')
    );
  }, [sessions]);

  const getSessionForAssignment = useCallback((assignmentId: string, userId: string): QuizSession | null => {
    return sessions.find(session => 
      session.assignment_id === assignmentId && 
      session.user_id === userId &&
      (session.status === 'active' || session.status === 'paused')
    ) || null;
  }, [sessions]);

  const value: QuizSessionContextType = {
    sessions,
    createQuizSession,
    loadQuizSession,
    updateQuizSession,
    deleteQuizSession,
    getActiveSessionsForUser,
    getSessionForAssignment,
  };
 
  return (
    <QuizSessionContext.Provider value={value}>
      {children}
    </QuizSessionContext.Provider>
  );
}

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (context === undefined) {
    throw new Error('useQuizSession must be used within a QuizSessionProvider');
  }
  return context;
}