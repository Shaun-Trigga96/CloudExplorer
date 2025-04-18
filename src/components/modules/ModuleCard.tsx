import React, { FC, Component } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ModuleCardProps {
  id: string;
  title: string;
  description: string;
  imageSource: ImageSourcePropType;
  progress: number;
  onStartLearning: (moduleId: string) => void;
  navigation: NavigationProp;
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

const ModuleCard: FC<ModuleCardProps> = ({ id, title, description, imageSource, progress, onStartLearning, navigation }) => {
  const { theme } = useCustomTheme();
  const { colors, cardStyle } = theme;

  console.log('Rendering ModuleCard:', { id, title, progress, imageSource });

  const progressColor = progress === 1 ? colors.success : progress > 0 ? colors.warning : colors.progressBarBackground;
  const buttonLabel = progress === 1 ? 'Review Module' : progress > 0 ? 'Continue Learning' : 'Start Learning';
  const buttonBackgroundColor = progress === 1 ? colors.buttonCompletedBackground : colors.buttonPrimaryBackground;

  const handlePress = () => {
    console.log('ModuleCard handlePress:', id);
    onStartLearning(id);
    navigation.navigate('ModuleDetail', { moduleId: id });
  };

  return (
    <ModuleCardErrorBoundary>
      <View style={{ marginVertical: 8 }}>
        <Card style={[styles.card, cardStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Image source={imageSource} style={styles.image} resizeMode="contain" />
            <Title style={[styles.title, { color: colors.text }]}>{title}</Title>
            <Paragraph style={[styles.description, { color: colors.textSecondary }]}>{description}</Paragraph>
            <ProgressBar
              progress={progress}
              color={progressColor}
              style={[styles.progressBar, { backgroundColor: colors.progressBarBackground }]}
            />
            <Paragraph style={[styles.percentage, { color: colors.textSecondary }]}>{`${(progress * 100).toFixed(0)}%`}</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={handlePress}
              style={[styles.button, { backgroundColor: buttonBackgroundColor }]}
              labelStyle={{ color: colors.buttonText }}
            >
              {buttonLabel}
            </Button>
          </Card.Actions>
        </Card>
      </View>
    </ModuleCardErrorBoundary>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  image: {
    width: 30,
    height: 30,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  percentage: {
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  button: {
    borderRadius: 8,
  },
});

export default ModuleCard;