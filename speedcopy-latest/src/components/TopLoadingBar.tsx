import React, { useEffect, useState } from 'react';
import { useLoading } from '../context/LoadingContext';

const TopLoadingBar: React.FC = () => {
  const { isLoading } = useLoading();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;
    let rampTimeout: ReturnType<typeof setTimeout>;

    if (isLoading) {
      // Defer initial state updates to avoid synchronous setState in effect
      timeout = setTimeout(() => {
        setFadeOut(false);
        setVisible(true);
        setProgress(0);
      }, 0);

      // Quickly jump to 20%, then slowly crawl to 85%
      rampTimeout = setTimeout(() => setProgress(20), 50);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(interval);
            return 85;
          }
          // Slow down as it approaches 85
          const increment = prev < 50 ? 8 : prev < 70 ? 4 : 1;
          return Math.min(prev + increment, 85);
        });
      }, 300);
    } else {
      // Complete the bar
      setProgress(100);
      timeout = setTimeout(() => {
        setFadeOut(true);
        timeout = setTimeout(() => {
          setVisible(false);
          setProgress(0);
          setFadeOut(false);
        }, 400);
      }, 200);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      clearTimeout(rampTimeout);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: '3px',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #111111 0%, #444444 50%, #111111 100%)',
          backgroundSize: '200% 100%',
          transition: progress === 100
            ? 'width 0.2s ease-out'
            : 'width 0.3s ease',
          opacity: fadeOut ? 0 : 1,
          transitionProperty: progress === 100 ? 'width, opacity' : 'width',
          transitionDuration: fadeOut ? '0.4s' : '0.3s',
          boxShadow: '0 0 8px rgba(0,0,0,0.4), 0 0 2px rgba(0,0,0,0.3)',
          borderRadius: '0 2px 2px 0',
          animation: isLoading ? 'shimmer 1.5s infinite' : 'none',
        }}
      />
    </div>
  );
};

export default TopLoadingBar;
