import React from 'react';
import { useSEO, SEOProps } from '@/shared/hooks/useSEO';

export const SEOHead: React.FC<SEOProps> = (props) => {
  useSEO(props);
  return null;
};

