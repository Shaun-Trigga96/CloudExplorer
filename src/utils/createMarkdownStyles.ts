// c:\Users\thabi\Desktop\CloudExplorer\src\utils\createMarkdownStyles.ts
import { StyleSheet } from 'react-native';
import { lightColors, darkColors } from '../styles/colors'; // Adjust path if needed

export const createMarkdownStyles = (colors: typeof lightColors | typeof darkColors) => StyleSheet.create({
  // Basic text styling
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
  },
  // Headings
  heading1: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 5,
  },
  heading2: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 8,
  },
  // Add other heading levels (h3, h4, etc.) as needed
  // Lists
  bullet_list: {
    marginLeft: 10,
    marginBottom: 10,
  },
  ordered_list: {
    marginLeft: 10,
    marginBottom: 10,
  },
  list_item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  // Code blocks, blockquotes, links, etc. can be added here
  // Icon specific styles (if needed globally, otherwise keep in component)
  iconContainer: {
    alignItems: 'center', // Center the icon horizontally
    marginVertical: 15, // Add some vertical spacing around icons
  },
  iconFallback: {
    color: colors.error,
    fontStyle: 'italic',
  },
  image: { // Styles for <Image> component or its container
    width: '95%', // Overrides default in renderer
    aspectRatio: 1.5, // Custom aspect ratio
    // For icons, if you want to style them via the image rule:
    // icon: { width: 60, height: 60, fill: themeColors.primary }
  },
});