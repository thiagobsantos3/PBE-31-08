import React from 'react';
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react';

interface QuizStats {
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  averageTime: number;
}

interface QuizCompletionProps {
  title: string;
  stats: QuizStats;
  isFullScreen: boolean;
  themeClasses: any;
  onRestart: () => void;
  onBack: () => void;
  formatTime: (seconds: number) => string;
}

export function QuizCompletion({
  title,
  stats,
  isFullScreen,
  themeClasses,
  onRestart,
  onBack,
  formatTime
}: QuizCompletionProps) {
  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className={`${themeClasses.card} rounded-xl shadow-sm p-8 text-center border ${themeClasses.border}`}>
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            
            <h1 className={`text-2xl font-bold ${themeClasses.text} mb-4`}>Quiz Completed!</h1>
            <p className={`${themeClasses.textSecondary} mb-8`}>
              Great job! Here's how you performed on your {title.toLowerCase()}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stats.accuracy}%
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Accuracy</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                  {stats.correctAnswers} of {stats.totalQuestions} correct
                </div>
              </div>
              
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stats.totalPointsEarned}
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Points Earned</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                  of {stats.totalPossiblePoints} possible
                </div>
              </div>
              
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {formatTime(stats.averageTime)}
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Avg Time</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>per question</div>
              </div>
              
              <div className={`bg-gray-50 ${isFullScreen ? 'bg-white/10' : ''} p-6 rounded-lg`}>
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {Math.round((stats.totalPointsEarned / stats.totalPossiblePoints) * 100)}%
                </div>
                <div className={`text-sm ${themeClasses.textSecondary}`}>Score</div>
                <div className={`text-xs ${themeClasses.textSecondary} mt-1`}>overall performance</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onRestart}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Take Another Quiz</span>
              </button>
              <button
                onClick={onBack}
                className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Quiz Center</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}