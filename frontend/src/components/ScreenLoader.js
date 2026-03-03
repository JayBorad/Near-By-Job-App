import React from 'react';
import { LottieLoader } from './LottieLoader';

export function ScreenLoader({ visible, text = 'Please wait...' }) {
  return <LottieLoader visible={visible} text={text} size={90} />;
}
