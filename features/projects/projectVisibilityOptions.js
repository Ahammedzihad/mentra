import { Lock, Users, Building2, Globe } from 'lucide-react';

export const VISIBILITY_OPTIONS = [
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can see this project.',
    icon: Lock,
  },
  {
    id: 'selected',
    label: 'Selected',
    description: 'Only you and people you explicitly select can see this project.',
    icon: Users,
  },
  {
    id: 'college',
    label: 'College',
    description: 'Authenticated Mentra users can see this project.',
    icon: Building2,
  },
  {
    id: 'public',
    label: 'Public',
    description:
      'Project is marked public for future public access; anonymous public project-page access is NOT implemented in this milestone.',
    icon: Globe,
  },
];
