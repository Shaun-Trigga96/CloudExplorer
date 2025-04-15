// src/utils/iconHelper.ts
import { ImageSourcePropType } from 'react-native';

// Define the icon map for the modules/quizzes
export const iconMap: { [key: string]: ImageSourcePropType } = {
  'digital-transformation': require('../assets/images/digital_transformation.jpeg'),
  'artificial-intelligence': require('../assets/images/artificial_intelligence.jpeg'),
  'infrastructure-application': require('../assets/images/infrastructure_application.jpeg'),
  'scailing-operations': require('../assets/images/scailing_operations.jpeg'),
  'trust-security': require('../assets/images/trust_security.jpeg'),
  'data-transformation': require('../assets/images/data_transformation.jpeg'),
  'default': require('../assets/images/cloud_generic.png'),
};

/**
 * Returns the appropriate icon for a quiz/module based on its ID
 */
export const getQuizIcon = (moduleId: string): ImageSourcePropType => {
  return iconMap[moduleId] || iconMap['default'];
};