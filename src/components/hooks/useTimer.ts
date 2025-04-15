// src/hooks/useTimer.ts
import { useState, useEffect } from 'react';
import { ExamTimingData } from '../../types/exam';

interface UseTimerReturn {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  timerColor: string;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
}

export const useTimer = (
  examStarted: boolean,
  examCompleted: boolean,
  examTiming: ExamTimingData | null,
  submitExam: () => void,
  colors: any,
): UseTimerReturn => {
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (examTiming) {
      const startDate = new Date(examTiming.startTime);
      const currentDate = new Date();
      const elapsedSeconds = Math.floor((currentDate.getTime() - startDate.getTime()) / 1000);
      const remainingTime = Math.max(7200 - examTiming.timeSpent - elapsedSeconds, 0);
      setTimeLeft(remainingTime);
    }
  }, [examTiming]);

  useEffect(() => {
    if (!examStarted || examCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          submitExam();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, examCompleted, submitExam]);

  const timerColor = timeLeft < 60 ? colors.critical : timeLeft < 300 ? colors.warning : colors.primary;

  return { timeLeft, formatTime, timerColor, setTimeLeft };
};