import { useState, useEffect, useCallback, RefObject } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useIsContentRead = (sectionRefs: RefObject<View>[]) => {
  const [sectionsRead, setSectionsRead] = useState<boolean[]>([]);
  const [allContentRead, setAllContentRead] = useState(false);
  
  // Initialize sections read state when refs change
  useEffect(() => {
    setSectionsRead(Array(sectionRefs.length).fill(false));
  }, [sectionRefs.length]);
  
  // Check if all sections are read
  useEffect(() => {
    if (sectionsRead.length > 0) {
      const allRead = sectionsRead.every(isRead => isRead);
      setAllContentRead(allRead);
    } else {
      setAllContentRead(false);
    }
  }, [sectionsRead]);
  
  // Mark a section as read
  const markSectionAsRead = useCallback((index: number) => {
    if (index >= 0 && index < sectionsRead.length && !sectionsRead[index]) {
      setSectionsRead(prev => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });
    }
  }, [sectionsRead]);
  
  // Force all sections to be marked as read
  const markAllSectionsAsRead = useCallback(() => {
    if (sectionRefs.length > 0) {
      setSectionsRead(Array(sectionRefs.length).fill(true));
    }
  }, [sectionRefs.length]);
  
  return {
    sectionsRead,
    markSectionAsRead,
    markAllSectionsAsRead,
    allContentRead
  };
};