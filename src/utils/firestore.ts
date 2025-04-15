export const extractFirestoreIndexUrl = (errorMessage: string): string | undefined => {
    if (!errorMessage) return undefined;
    const urlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/[^\s"]+)/);
    return urlMatch ? urlMatch[1] : undefined;
  };