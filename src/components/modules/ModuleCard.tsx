import React, { FC, Component } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ModuleCardProps {
  moduleId: string;
  title: string;
  description: string;
  imageSource: ImageSourcePropType;
  progress: number;
  onStartLearning: (moduleId: string) => void;
  navigation: NavigationProp;
  providerId: string;
  pathId: string;
}

class ModuleCardErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    console.error('ModuleCardErrorBoundary caught error:', error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Text style={{ color: 'red', padding: 16 }}>Error rendering ModuleCard. Check console.</Text>;
    }
    return this.props.children;
  }
}

const ModuleCard: FC<ModuleCardProps> = ({ 
  moduleId, 
  title, 
  description, 
  imageSource, 
  progress, 
  onStartLearning, 
  navigation, 
  providerId, 
  pathId 
}) => {
  const { theme } = useCustomTheme();
  const { colors, cardStyle } = theme;

  const progressColor = progress === 1 
    ? colors.success 
    : progress > 0 
      ? colors.warning 
      : colors.progressBarBackground;
      
  const buttonLabel = progress === 1 
    ? 'Review Module' 
    : progress > 0 
      ? 'Continue Learning' 
      : 'Start Learning';
      
  const buttonBackgroundColor = progress === 1 
    ? colors.buttonCompletedBackground 
    : colors.buttonPrimaryBackground;

  const handlePress = () => {
    console.log('ModuleCard handlePress:', moduleId, 'providerId:', providerId, 'pathId:', pathId);
    navigation.navigate('ModuleDetail', {
      moduleId: moduleId,
    });
    console.log(`[ModuleCard] Navigation call complete for ${moduleId}`);
  };

  return (
    <ModuleCardErrorBoundary>
      <Card 
        style={[styles.card, cardStyle, { backgroundColor: colors.surface }]} 
        onPress={handlePress}
      >
        <Card.Content style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Image 
              source={imageSource} 
              style={styles.image} 
              resizeMode="contain" 
            />
            <View style={styles.headerTextContainer}>
              <Title style={[styles.title, { color: colors.text }]}>
                {title}
              </Title>
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={progress}
                  color={progressColor}
                  style={[styles.progressBar, { backgroundColor: colors.progressBarBackground }]}
                />
                <Text style={[styles.percentage, { color: colors.textSecondary }]}>
                  {`${(progress * 100).toFixed(0)}%`}
                </Text>
              </View>
            </View>
          </View>
          
          <Paragraph style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Paragraph>
          
          <Button
            mode="contained"
            onPress={handlePress}
            style={[styles.button, { backgroundColor: buttonBackgroundColor }]}
            labelStyle={{ color: colors.buttonText }}
          >
            {buttonLabel}
          </Button>
        </Card.Content>
      </Card>
    </ModuleCardErrorBoundary>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    marginTop: 4,
  },
});

export default ModuleCard;