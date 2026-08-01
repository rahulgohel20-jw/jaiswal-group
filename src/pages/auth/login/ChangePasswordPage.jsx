import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/context/auth-context';
import { getOrgIdFromToken } from '@/utils/auth'; // adjust path
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowLeft,
  CircleAlert,
  CircleCheck,
} from 'lucide-react';
import { changePassword } from '@/services/apiServices';

const REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'One number', test: (v) => /[0-9]/.test(v) },
  { id: 'special', label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function getStrength(password) {
  const passed = REQUIREMENTS.filter((r) => r.test(password)).length;
  if (!password) return { label: '', pct: 0, color: 'bg-muted' };
  if (passed <= 1) return { label: 'Weak', pct: 25, color: 'bg-destructive' };
  if (passed === 2) return { label: 'Fair', pct: 50, color: 'bg-orange-500' };
  if (passed === 3) return { label: 'Good', pct: 75, color: 'bg-yellow-500' };
  return { label: 'Strong', pct: 100, color: 'bg-green-500' };
}

function PasswordField({ id, label, value, onChange, autoComplete, show, onToggle }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);
  const requirementsMet = useMemo(
    () => REQUIREMENTS.every((r) => r.test(newPassword)),
    [newPassword],
  );
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (!requirementsMet) {
      setError('New password does not meet the requirements below.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === oldPassword) {
      setError('New password must be different from old password.');
      return;
    }

    const payload = {
      organizationId: getOrgIdFromToken(),
      email: user?.email,
      oldPassword,
      newPassword,
    };

    try {
      setLoading(true);

      await changePassword(payload);

      setSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(
        err?.response?.data?.errorMessage ||
          err?.response?.data?.msg ||
          'Failed to change password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start pt-10 px-4 pb-10">
      <div className="w-full max-w-md">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back  
        </button>

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b bg-muted/30">
            <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary shrink-0">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-none">Change Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a strong password to keep your account secure.
              </p>
            </div>
          </div>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <PasswordField
                id="oldPassword"
                label="Current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
                show={showOld}
                onToggle={() => setShowOld((v) => !v)}
              />

              <div className="h-px bg-border" />

              <PasswordField
                id="newPassword"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <div className="-mt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                      {strength.label}
                    </span>
                  </div>

                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {REQUIREMENTS.map((req) => {
                      const met = req.test(newPassword);
                      return (
                        <li
                          key={req.id}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${
                            met ? 'text-green-600' : 'text-muted-foreground'
                          }`}
                        >
                          {met ? (
                            <Check className="size-3.5 shrink-0" />
                          ) : (
                            <X className="size-3.5 shrink-0 opacity-40" />
                          )}
                          {req.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <PasswordField
                id="confirmPassword"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
              {confirmPassword.length > 0 && (
                <p
                  className={`-mt-3 text-xs flex items-center gap-1.5 ${
                    passwordsMatch ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {passwordsMatch ? (
                    <>
                      <Check className="size-3.5" /> Passwords match
                    </>
                  ) : (
                    <>
                      <X className="size-3.5" /> Passwords don't match yet
                    </>
                  )}
                </p>
              )}

              {/* Alerts */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <CircleAlert className="size-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-sm text-green-700">
                  <CircleCheck className="size-4 mt-0.5 shrink-0" />
                  {success}
                </div>
              )}

              <Button type="submit" disabled={loading} className="mt-1 w-full">
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-4">
          <ShieldCheck className="size-3.5" />
          Your password is encrypted and never stored in plain text.
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordPage;