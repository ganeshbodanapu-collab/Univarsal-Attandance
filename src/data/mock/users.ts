import type { AppUser } from '../../types';

export const mockAppUsers: AppUser[] = [
  {
    id: 'U001',
    username: 'admin',
    password: 'Admin@2026',
    name: 'System Admin',
    role: 'admin',
    mobile: '+91 98000 11111',
    email: 'admin@universalattendance.com',
    status: 'active',
    createdDate: new Date().toISOString().split('T')[0],
  },
];
