// src/styles/homeStyles.ts
import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 30,
    paddingVertical: 8,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    marginTop: 20,
    borderRadius: 30,
    paddingVertical: 8,
  },
  buttonContent: {},
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pathCard: {
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pathCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallLogo: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  pathInfo: {
    flex: 1,
  },
  pathName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
  },
  activeBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
  },
});