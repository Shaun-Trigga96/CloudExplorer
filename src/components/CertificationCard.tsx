import React, { FC } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import Clipboard from '@react-native-clipboard/clipboard';

interface Certification {
  id?: string;
  title: string;
  issuedDate: string;
  expiryDate?: string | null;
  issuingOrganization: string;
  url?: string;
  badgeUrl?: string;
  cloudProvider?: string;
  credentialId?: string;
}

interface CloudProvider {
  label: string;
  value: string;
  icon: string;
}

const cloudProviders: CloudProvider[] = [
  { label: 'Google Cloud', value: 'gcp', icon: 'google-cloud' },
  { label: 'Microsoft Azure', value: 'azure', icon: 'microsoft-azure' },
  { label: 'Amazon Web Services', value: 'aws', icon: 'aws' },
  { label: 'IBM Cloud', value: 'ibm', icon: 'ibm' },
  { label: 'Oracle Cloud', value: 'oracle', icon: 'database' },
  { label: 'Alibaba Cloud', value: 'alibaba', icon: 'alpha-a-circle' },
  { label: 'DigitalOcean', value: 'digitalocean', icon: 'digital-ocean' },
  { label: 'Salesforce', value: 'salesforce', icon: 'salesforce' },
  { label: 'Red Hat', value: 'redhat', icon: 'redhat' },
  { label: 'VMware', value: 'vmware', icon: 'vmware' },
  { label: 'Other', value: 'other', icon: 'cloud' },
];

const getCertificateStatusColor = (cert: Certification) => {
    if (!cert.expiryDate) return '#4CAF50'; // Green for no expiry
  
    const expiryDate = new Date(cert.expiryDate);
    const now = new Date();
    const diffMonths = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
    if (diffMonths < 0) return '#F44336'; // Red for expired
    if (diffMonths < 3) return '#FF9800'; // Orange for expiring soon
    return '#4CAF50'; // Green for valid
  };
  
  const getCloudProviderIcon = (providerId?: string) => {
    if (!providerId) return 'cloud';
    const provider = cloudProviders.find(p => p.value === providerId);
    return provider ? provider.icon : 'cloud';
  };

const openCertificationUrl = (url?: string) => {
  if (url) {
    Linking.openURL(url).catch((err) =>
      Alert.alert('Error', 'Could not open the URL'),
    );
  }
};

const copyCredentialId = (id?: string) => {
  if (id) {
    Clipboard.setString(id);
    Alert.alert('Copied', 'Credential ID copied to clipboard');
  }
};

interface CertificationCardProps {
  certification: Certification;
}

const CertificationCard: FC<CertificationCardProps> = ({ certification }) => {
  const { isDarkMode } = useTheme();
  const statusColor = getCertificateStatusColor(certification);
  const providerIcon = getCloudProviderIcon(certification.cloudProvider);

  return (
    <Animated.View
      style={[
        styles.certificationCard,
        { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' },
      ]}
      entering={FadeInUp.duration(400)}
    >
      <View style={styles.certCardHeader}>
        <View style={styles.certHeaderLeft}>
          {certification.badgeUrl ? (
            <Image
              source={{ uri: certification.badgeUrl }}
              style={styles.badgeImage}
            />
          ) : (
            <View
              style={[
                styles.providerIconContainer,
                { backgroundColor: statusColor },
              ]}
            >
              <MaterialIcon name={providerIcon} size={24} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.certHeaderRight}>
          <TouchableOpacity
            style={styles.openUrlButton}
            onPress={() => openCertificationUrl(certification.url)}
          >
            <MaterialIcon name="open-in-new" size={22} color="#007BFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.certContent}>
        <Text
          style={[
            styles.certificationTitle,
            { color: isDarkMode ? '#FFF' : '#1A1A1A' },
          ]}
        >
          {certification.title}
        </Text>

        <View style={styles.certMetaContainer}>
          <MaterialIcon
            name="office-building"
            size={16}
            color={isDarkMode ? '#A0A0A0' : '#666'}
          />
          <Text
            style={[
              styles.certMeta,
              { color: isDarkMode ? '#A0A0A0' : '#666' },
            ]}
          >
            {certification.issuingOrganization}
          </Text>
        </View>

        <View style={styles.certMetaContainer}>
          <MaterialIcon
            name="calendar"
            size={16}
            color={isDarkMode ? '#A0A0A0' : '#666'}
          />
          <Text
            style={[
              styles.certMeta,
              { color: isDarkMode ? '#A0A0A0' : '#666' },
            ]}
          >
            Issued: {certification.issuedDate}
          </Text>
        </View>

        {certification.expiryDate && (
          <View style={styles.certMetaContainer}>
            <MaterialIcon name="calendar-clock" size={16} color={statusColor} />
            <Text style={[styles.certMeta, { color: statusColor }]}>
              Expires: {certification.expiryDate}
            </Text>
          </View>
        )}

        {certification.credentialId && (
          <TouchableOpacity
            style={styles.credentialIdContainer}
            onPress={() => copyCredentialId(certification.credentialId)}
          >
            <MaterialIcon
              name="content-copy"
              size={16}
              color={isDarkMode ? '#A0A0A0' : '#666'}
            />
            <Text
              style={[
                styles.certMeta,
                { color: isDarkMode ? '#A0A0A0' : '#666' },
              ]}
              numberOfLines={1}
            >
              ID: {certification.credentialId}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
    certificationCard: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        // backgroundColor handled dynamically based on isDarkMode
      },
      certCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
      },
      certHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      badgeImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
      },
      providerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        // backgroundColor handled dynamically based on statusColor
      },
      certHeaderRight: {
        // Positioned by parent's justifyContent
      },
      openUrlButton: {
        padding: 5, // Increases touchable area around the icon
      },
      certContent: {
        // Structuring view, no specific styles applied directly
      },
      certificationTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        // color handled dynamically based on isDarkMode
      },
      certMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
      },
      certMeta: {
        marginLeft: 8,
        fontSize: 14,
        flexShrink: 1, // Important: allows text to wrap/shrink if too long
        // color handled dynamically based on isDarkMode or statusColor
      },
      credentialIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        // TouchableOpacity itself provides the touch area
      },
});

export default CertificationCard;
