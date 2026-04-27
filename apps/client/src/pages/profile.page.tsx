import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, User, Trash2, AlertTriangle } from 'lucide-react';
import {
  clearCredentials,
  selectCurrentUser,
  selectIsAuthenticated,
  setCredentials,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import {
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from '@libs/client-server-communication';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { clearPersistedToken } from '../lib/token';

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);

  const { data: user, isLoading: userLoading } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [updateProfile, { isLoading: updatingProfile }] =
    useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPassword }] =
    useChangePasswordMutation();
  const [deleteAccount, { isLoading: deletingAccount }] =
    useDeleteAccountMutation();
  const [uploadAvatar, { isLoading: uploadingAvatar }] =
    useUploadAvatarMutation();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const onSubmitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage('');
    try {
      const updated = await updateProfile({
        name: name || undefined,
        email: email || undefined,
        avatarUrl: avatarUrl || undefined,
      }).unwrap();
      setProfileMessage('Profile updated successfully');
      if (currentUser) {
        dispatch(
          setCredentials({ user: updated, token: currentUser.id.toString() }),
        );
      }
      setName(updated.name || '');
      setEmail(updated.email || '');
      setAvatarUrl(updated.avatarUrl || '');
    } catch {
      setProfileMessage('Failed to update profile');
    }
  };

  const onSubmitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('Password must be at least 8 characters');
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setPasswordMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMessage('Current password is incorrect');
    }
  };

  const onDeleteAccount = async () => {
    if (deleteConfirmation !== 'delete') {
      return;
    }
    try {
      await deleteAccount().unwrap();
      clearPersistedToken();
      dispatch(clearCredentials(undefined));
      navigate('/login', { replace: true });
    } catch {
      // Error handling - account deletion may fail if already deleted
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Profile Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account information and preferences
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Profile Information
          </h2>
          <form onSubmit={onSubmitProfile} className="space-y-4" noValidate>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatarFile">Profile Picture</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="avatarFile"
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const updated = await uploadAvatar(file).unwrap();
                        setAvatarUrl(updated.avatarUrl || '');
                        setProfileMessage('Avatar updated successfully');
                      } catch {
                        setProfileMessage('Failed to upload avatar');
                      }
                    }}
                  />
                  {uploadingAvatar && (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={50}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={updatingProfile}>
                {updatingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              {profileMessage && (
                <span
                  className={`text-sm ${
                    profileMessage.includes('success')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {profileMessage}
                </span>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Change Password
          </h2>
          <form onSubmit={onSubmitPassword} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                minLength={8}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                maxLength={100}
                placeholder="Enter new password (min 8 characters)"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                maxLength={100}
                placeholder="Confirm new password"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
              {passwordMessage && (
                <span
                  className={`text-sm ${
                    passwordMessage.includes('success')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordMessage}
                </span>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Delete Account
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Once you delete your account, there is no going back. All your data
            will be permanently removed.
          </p>

          {!showDeleteModal ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Are you sure?</span>
              </div>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                Type <strong>delete</strong> to confirm account deletion. This
                action cannot be undone.
              </p>
              <div className="mt-3 space-y-3">
                <Input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type "delete" to confirm'
                  className="border-red-300 dark:border-red-700"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={onDeleteAccount}
                    disabled={
                      deleteConfirmation !== 'delete' || deletingAccount
                    }
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmation('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
    </div>
  );
}
