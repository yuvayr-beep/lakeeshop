import React from 'react';
import DynamicBackground from '@/components/background/DynamicBackground';
import ForgotPasswordClient from './components/ForgotPasswordClient';

export default function ForgotPasswordPage() {
  return (
    <DynamicBackground>
      <ForgotPasswordClient />
    </DynamicBackground>
  );
}