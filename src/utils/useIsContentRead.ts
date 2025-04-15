import { useState, useEffect } from 'react';

export const useIsContentRead = (sectionRefs: React.RefObject<any>[]) => {
  const [sectionsRead, setSectionsRead] = useState<boolean[]>([]);
  const [allContentRead, setAllContentRead] = useState(false);

  useEffect(() => {
    if (sectionRefs.length > 0 && sectionsRead.length === 0) {
      setSectionsRead(new Array(sectionRefs.length).fill(false));
    }
  }, [sectionRefs.length, sectionsRead.length]);

  const markSectionAsRead = (index: number) => {
    setSectionsRead(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  useEffect(() => {
    if (sectionsRead.length > 0 && sectionsRead.every(read => read)) {
      setAllContentRead(true);
    }
  }, [sectionsRead]);

  return { sectionsRead, markSectionAsRead, allContentRead };
};