import { SafetyReport } from '../types';

export const mockReports: SafetyReport[] = [
  {
    id: '1',
    category: 'danger',
    description: 'Poor street lighting',
    timestamp: '2024-03-10T20:00:00Z',
    location: [28.6139, 77.2090]
  },
  {
    id: '2',
    category: 'caution',
    description: 'Construction work ongoing',
    timestamp: '2024-03-10T18:30:00Z',
    location: [28.6219, 77.2189]
  },
  {
    id: '3',
    category: 'safe',
    description: 'Well-lit area with regular police patrol',
    timestamp: '2024-03-10T19:15:00Z',
    location: [28.6129, 77.2295]
  }
];