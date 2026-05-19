import React from 'react';
import DynamicBackground from '@/components/background/DynamicBackground';
import PasswordStepClient from './components/PasswordStepClient';

export default function SignInPasswordPage() {
  return (
    <DynamicBackground>
      <PasswordStepClient />
    </DynamicBackground>
  );
}