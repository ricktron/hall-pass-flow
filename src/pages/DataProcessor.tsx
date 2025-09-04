import React from 'react';
import StudentDataProcessor from '@/components/StudentDataProcessor';
import { sourceData } from '@/data/sourceData';

const DataProcessor = () => {
  return <StudentDataProcessor sourceData={sourceData} />;
};

export default DataProcessor;