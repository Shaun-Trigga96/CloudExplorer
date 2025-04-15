import React, { FC, useEffect, useState, useRef } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import iconMap from '../utils/iconMap';
import { REACT_APP_BASE_URL } from '@env';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import HeaderCard from '../components/moduleDetail/HeaderCard';
import SectionCard from '../components/moduleDetail/SectionCard';
import CompleteButton from '../components/moduleDetail/CompleteButton';
import { ErrorView, LoadingView } from '../components/common';
import { useIsContentRead } from '../utils/useIsContentRead';
import { Module, Section } from '../types/moduleDetail';
import { useCustomTheme } from '../context/ThemeContext';
import { handleError } from '../utils/handleError';
import { createMarkdownStyles } from '../utils/createMarkdownStyles';
import { lightColors, darkColors } from '../styles/colors';

const BASE_URL = REACT_APP_BASE_URL;

type ModuleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;
type ModuleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ModuleDetail'>;

interface ModuleDetailScreenProps {
  route: ModuleDetailScreenRouteProp;
  navigation: ModuleDetailScreenNavigationProp;
}

const preprocessMarkdownWithIcons = (
  content: string,
  colors: typeof lightColors | typeof darkColors
): JSX.Element[] => {
  if (!content) {
    return [
      <Text
        key="no-content"
        style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'System' }}
      >
        No content available
      </Text>,
    ];
  }

  const iconRegex = /!\[icon:([a-zA-Z0-9-_]+)\]/g;
  let modifiedContent = content;
  const replacements: { placeholder: string; component: JSX.Element }[] = [];
  const themedMarkdownStyles = createMarkdownStyles(colors);

  let match;
  let index = 0;
  while ((match = iconRegex.exec(content)) !== null) {
    const iconName = match[1];
    const placeholder = `__ICON_${index}__`;
    const IconComponent = iconMap[iconName] as React.FC<{ width: number; height: number; fill: string }> | undefined;

    replacements.push({
      placeholder,
      component: IconComponent ? (
        <View key={`icon-${iconName}-${index}`} style={themedMarkdownStyles.iconContainer}>
          <IconComponent width={80} height={80} fill={colors.primary} />
        </View>
      ) : (
        <Text key={`icon-fallback-${iconName}-${index}`} style={themedMarkdownStyles.iconFallback}>
          [Icon not found: {iconName}]
        </Text>
      ),
    });

    modifiedContent = modifiedContent.replace(match[0], placeholder);
    index++;
  }

  const segments = modifiedContent.split(/(__ICON_\d+__)/g);
  const renderedContent: JSX.Element[] = [];
  let replacementIndex = 0;

  segments.forEach((segment, i) => {
    if (segment.match(/__ICON_\d+__/)) {
      if (replacementIndex < replacements.length && replacements[replacementIndex].placeholder === segment) {
        renderedContent.push(replacements[replacementIndex].component);
        replacementIndex++;
      }
    } else if (segment.trim()) {
      renderedContent.push(
        <Markdown key={`markdown-${i}`} style={themedMarkdownStyles}>
          {segment}
        </Markdown>
      );
    }
  });

  return renderedContent.length > 0
    ? renderedContent
    : [
        <Text
          key="no-content"
          style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'System' }}
        >
          No content available
        </Text>,
      ];
};

const ModuleDetailScreen: FC<ModuleDetailScreenProps> = ({ route, navigation }) => {
  const { moduleId } = route.params;
  const { isDarkMode } = useCustomTheme();
  const { colors } = useCustomTheme().theme;
  const [module, setModule] = useState<Module | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fadeAnim = useSharedValue(0);

  const sectionRefs = useRef<React.RefObject<View>[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [, setVisibleSections] = useState<Set<number>>(new Set());

  const { sectionsRead, markSectionAsRead, allContentRead } = useIsContentRead(sectionRefs.current);

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const moduleResponse = await axios.get<Module>(`${BASE_URL}/api/v1/modules/${moduleId}`, { timeout: 10000 });
        setModule(moduleResponse.data);
      } catch (err) {
        handleError(err, setError);
      }
    };

    const fetchSections = async () => {
      try {
        const sectionsResponse = await axios.get<Section[]>(`${BASE_URL}/api/v1/modules/${moduleId}/sections`, {
          timeout: 10000,
        });
        setSections(sectionsResponse.data);
        sectionRefs.current = sectionsResponse.data.map(() => React.createRef<View>());
      } catch (err) {
        handleError(err, setError);
      }
    };

    Promise.all([fetchModuleData(), fetchSections()])
      .then(() => {
        fadeAnim.value = withTiming(1, { duration: 600 });
        setTimeout(() => setIsFetching(false), 600);
      })
      .catch(err => {
        handleError(err, setError);
        setIsFetching(false);
      });
  }, [moduleId, fadeAnim]);

  const handleScroll = ({ nativeEvent }: { nativeEvent: any }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;

    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      sectionRefs.current.forEach((_, index) => markSectionAsRead(index));
    }

    const visibleStart = contentOffset.y;
    const visibleEnd = visibleStart + layoutMeasurement.height;
    const newVisibleSections = new Set<number>();

    sections.forEach((_, index) => {
      const approximateSectionHeight = contentSize.height / sections.length;
      const sectionStart = index * approximateSectionHeight;
      const sectionEnd = sectionStart + approximateSectionHeight;

      if (
        (sectionStart >= visibleStart && sectionStart <= visibleEnd) ||
        (sectionEnd >= visibleStart && sectionEnd <= visibleEnd)
      ) {
        newVisibleSections.add(index);
        markSectionAsRead(index);
      }
    });

    setVisibleSections(newVisibleSections);
  };

  const handleModuleCompletion = async () => {
    if (!userId) {
      setError('User not logged in');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
        resourceType: 'module',
        resourceId: moduleId,
        action: 'complete',
        timestamp: new Date().toISOString(),
      });
      navigation.navigate('QuizzesDetail', { moduleId });
    } catch (err) {
      handleError(err, setError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsFetching(true);
    setSections([]);
    setModule(null);
    fadeAnim.value = 0;

    const fetchModuleData = async () => {
      try {
        const moduleResponse = await axios.get<Module>(`${BASE_URL}/api/v1/modules/${moduleId}`, { timeout: 10000 });
        setModule(moduleResponse.data);
      } catch (err) {
        handleError(err, setError);
      }
    };

    const fetchSections = async () => {
      try {
        const sectionsResponse = await axios.get<Section[]>(`${BASE_URL}/api/v1/modules/${moduleId}/sections`, {
          timeout: 10000,
        });
        setSections(sectionsResponse.data);
        sectionRefs.current = sectionsResponse.data.map(() => React.createRef<View>());
      } catch (err) {
        handleError(err, setError);
      }
    };

    Promise.all([fetchModuleData(), fetchSections()])
      .then(() => {
        fadeAnim.value = withTiming(1, { duration: 600 });
        setTimeout(() => setIsFetching(false), 600);
      })
      .catch(err => {
        handleError(err, setError);
        setIsFetching(false);
      });
  };

  if (isFetching) {
    return <LoadingView />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={handleRetry} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <HeaderCard
          title={module?.title || 'No title'}
          description={module?.description || 'No description'}
          fadeAnim={fadeAnim}
        />
        {sections.length > 0 ? (
          sections.map((section, index) => {
            const content = preprocessMarkdownWithIcons(section.content || 'No content available', colors);
            return (
              <SectionCard
                key={section.id}
                content={content}
                isRead={sectionsRead[index] || false}
                fadeAnim={fadeAnim}
                innerRef={sectionRefs.current[index]}
              />
            );
          })
        ) : (
          <SectionCard
            content={[
              <Text
                key="no-content"
                style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16, fontFamily: 'System' }}
              >
                No content available
              </Text>,
            ]}
            isRead={false}
            fadeAnim={fadeAnim}
            innerRef={React.createRef()}
          />
        )}
      </ScrollView>
      <CompleteButton isLoading={isLoading} allContentRead={allContentRead} onPress={handleModuleCompletion} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
});

export default ModuleDetailScreen;