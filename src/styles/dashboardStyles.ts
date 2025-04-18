import { StyleSheet } from 'react-native';

export const  dashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridWrapper: {
    marginBottom: 24, // Increased spacing
  },
  gridTitle: {
    fontSize: 24, // Slightly larger
    fontWeight: '700',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4, // Counteract padding in GridItem
  },
  card: {
    padding: 20,
    // cardStyle from theme provides borderRadius, shadow etc.
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 24, // Increased spacing
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8, // Increased spacing
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 12, // Slightly thicker bar
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressSubText: {
    fontSize: 13,
    marginTop: 8, // Add margin top
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24, // Increased spacing
    marginBottom: 12,
    borderBottomWidth: 1, // Add subtle separator
    paddingBottom: 6,
    // borderBottomColor will be set by theme or dynamically
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16, // Increased spacing
    fontStyle: 'italic',
  },
});
