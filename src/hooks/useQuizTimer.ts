import { useState, useEffect, useCallback } from 'react';

interface UseQuizTimerProps {
  initialTime: number;
  onTimeExpired: () => void;
  onTimeUpdate: (timeLeft: number) => void;
}

export function useQuizTimer({ initialTime, onTimeExpired, onTimeUpdate }: UseQuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [timerActive, setTimerActive] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [hasTimeExpired, setHasTimeExpired] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        const newTimeLeft = timeLeft - 1;
        setTimeLeft(newTimeLeft);
        onTimeUpdate(newTimeLeft);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setHasTimeExpired(true);
      onTimeExpired();
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerActive, timeLeft, onTimeExpired, onTimeUpdate]);

  const startTimer = useCallback(() => {
    if (!timerStarted && !hasTimeExpired) {
      setTimerActive(true);
      setTimerStarted(true);
    }
  }, [timerStarted, hasTimeExpired]);

  const resetTimer = useCallback((newTime: number) => {
    setTimeLeft(newTime);
    setTimerActive(false);
    setTimerStarted(false);
    setHasTimeExpired(false);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
  }, []);

  const setTimerActiveState = useCallback((active: boolean) => {
    setTimerActive(active);
  }, []);

  const setTimerStartedState = useCallback((started: boolean) => {
    setTimerStarted(started);
  }, []);

  return {
    timeLeft,
    timerActive,
    timerStarted,
    hasTimeExpired,
    startTimer,
    resetTimer,
    stopTimer,
    setHasTimeExpired,
    setTimerActiveState,
    setTimerStartedState
  };
}