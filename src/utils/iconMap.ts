// src/utils/iconMap.ts
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import GoogleKubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import { SvgProps } from 'react-native-svg';
import { FC } from 'react';


const iconMap: { [key: string]: FC<SvgProps> } = {
  compute_engine: ComputeEngineIcon,
  cloud_storage: CloudStorageIcon,
  cloud_functions: CloudFunctionsIcon,
  google_kubernetes_engine: GoogleKubernetesEngineIcon,
};

export default iconMap;
