"use client";

import React from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { OptimizationDashboard } from '@/components/optimization/OptimizationDashboard';

export default function OptimizationPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <OptimizationDashboard />
      </div>
    </MainLayout>
  );
}
