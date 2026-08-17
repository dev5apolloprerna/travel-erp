import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Tabs } from '../../components/ui';
import ProfilePicUpload from '../../components/ui/ProfilePicUpload';
import ChangePassword from './ChangePassword';

export default function MyProfile() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Account" title="My Profile" />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'profile', label: 'Profile' },
        { key: 'password', label: 'Change Password' },
      ]} />

      {tab === 'profile' && (
        <Card title="Profile picture">
          <ProfilePicUpload
            value={user?.profilePic}
            name={user?.name}
            onChange={(profilePic) => setUser?.((u) => ({ ...u, profilePic }))}
          />
          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">Name</dt><dd className="font-medium text-ink">{user?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Email</dt><dd className="font-medium text-ink">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Role</dt><dd className="font-medium text-ink">{user?.role}</dd></div>
            {user?.employeeTypes?.length > 0 && (
              <div className="flex justify-between"><dt className="text-ink-muted">Type</dt><dd className="font-medium text-ink">{user.employeeTypes.join(' + ')}</dd></div>
            )}
          </dl>
        </Card>
      )}

      {tab === 'password' && <ChangePassword bare />}
    </div>
  );
}
