import { StyleSheet } from 'react-native';
import { lightColors, darkColors } from '../styles/colors';

export const createMarkdownStyles = (colors: typeof lightColors | typeof darkColors) =>
  StyleSheet.create({
    body: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      fontFamily: 'System',
    },
    heading1: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 20,
      marginBottom: 10,
      fontFamily: 'System',
    },
    heading2: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 15,
      marginBottom: 8,
      fontFamily: 'System',
    },
    heading3: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 6,
      fontFamily: 'System',
    },
    paragraph: {
      marginBottom: 16,
      lineHeight: 24,
      color: colors.text,
    },
    list_item: {
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      color: colors.text,
    },
    bullet_list: {
      marginBottom: 16,
      paddingLeft: 10,
    },
    code_block: {
      backgroundColor: colors.markdownCodeBackground,
      padding: 12,
      borderRadius: 8,
      fontFamily: 'monospace',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    iconContainer: {
      marginRight: 12,
      marginVertical: 8,
      alignItems: 'center',
    },
    iconFallback: {
      fontSize: 14,
      color: colors.error,
      marginVertical: 8,
      fontFamily: 'System',
    },
    text: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      fontFamily: 'System',
    },
  });