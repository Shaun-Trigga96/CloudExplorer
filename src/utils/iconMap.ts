// src/utils/iconMap.ts
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import GoogleKubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg';
import GoogleAnalyticsLogoIcon from '../assets/icons/google_analytics_logo.svg';
import CloudSQLIcon from '../assets/icons/cloud_sql.svg';
import CloudSpannerIcon from '../assets/icons/cloud_spanner.svg';
import BigQueryIcon from '../assets/icons/big_query.svg';
import FirestoreIcon from '../assets/icons/firestore.svg';
import BigtableIcon from '../assets/icons/bigtable.svg';
import LookerIcon from '../assets/icons/looker.svg';
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import PubSubIcon from '../assets/icons/pub_sub.svg';
import DataflowIcon from '../assets/icons/dataflow.svg';
import ApacheBeamIcon from '../assets/icons/apache_beam.svg';
import { SvgProps } from 'react-native-svg';
import { FC } from 'react';


const iconMap: { [key: string]: FC<SvgProps> } = {
  compute_engine: ComputeEngineIcon,
  cloud_storage: CloudStorageIcon,
  cloud_functions: CloudFunctionsIcon,
  google_kubernetes_engine: GoogleKubernetesEngineIcon,
  cloud_generic: CloudGenericIcon,
  google_analytics_logo: GoogleAnalyticsLogoIcon,
  cloud_sql: CloudSQLIcon,
  big_query: BigQueryIcon,
  firestore: FirestoreIcon,
  bigtable: BigtableIcon,
  looker: LookerIcon,
  streaming_analytics: StreamingAnalyticsIcon,
  pub_sub: PubSubIcon,
  dataflow: DataflowIcon,
  apache_beam: ApacheBeamIcon,
  cloud_spanner: CloudSpannerIcon
};

export default iconMap;
