import React, { createContext, useState, useContext, useMemo, ReactNode, FC } from 'react';

// Define the shape of the context state and actions
interface ActiveLearningPathContextProps {
  activeProviderId: string | null;
  activePathId: string | null;
  setActivePath: (providerId: string | null, pathId: string | null) => void;
}

// Create the context with default values
const ActiveLearningPathContext = createContext<ActiveLearningPathContextProps>({
  activeProviderId: null,
  activePathId: null,
  setActivePath: () => {
    console.warn('[ActiveLearningPathContext] setActivePath called before Provider was ready.');
  },
});

// Custom hook for easy consumption
export const useActiveLearningPath = () => useContext(ActiveLearningPathContext);

// Define the props for the provider component
interface ActiveLearningPathProviderProps {
  children: ReactNode;
}

// Create the Provider component
export const ActiveLearningPathProvider: FC<ActiveLearningPathProviderProps> = ({ children }) => {
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [activePathId, setActivePathId] = useState<string | null>(null);

  // Function to update the active path
  const setActivePath = (providerId: string | null, pathId: string | null) => {
    console.log(`[ActiveLearningPathContext] Setting active path: Provider=${providerId}, Path=${pathId}`);
    setActiveProviderId(providerId);
    setActivePathId(pathId);
    // Optionally persist to AsyncStorage here if needed for offline/relaunch scenarios
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    activeProviderId,
    activePathId,
    setActivePath,
  }), [activeProviderId, activePathId]);

  return (
    <ActiveLearningPathContext.Provider value={contextValue}>
      {children}
    </ActiveLearningPathContext.Provider>
  );
};
