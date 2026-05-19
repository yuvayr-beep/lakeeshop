import React from 'react';
import DynamicBackground from '@/components/background/DynamicBackground';
import MobileStepClient from './components/MobileStepClient';

export default function SignInMobilePage() {
  return (
    <DynamicBackground>
      <MobileStepClient />
    </DynamicBackground>
  );
}