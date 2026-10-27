import { useNavigate } from 'react-router-dom';
import { ArrowRight, HeartHandshake, LogOut } from 'lucide-react';
import { LeafPair, Logo } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { Button, ButtonLink } from '@/components/ui';
import { useAdmin } from '../adminState';
import { SecurityNote } from '../components';

/** Shown to End Users (SRS §6.1) who reach the admin area. */
export default function NoAccess({ name, onBack }: { name?: string; onBack?: () => void }) {
  const { state, signOut } = useAdmin();
  const nav = useNavigate();
  const who = name ?? state.session?.name;
  const leave = async () => {
    if (onBack) return onBack();
    await signOut();
    nav('/admin/login');
  };
  return (
    <div className="flex min-h-screen flex-col bg-wash">
      <div className="px-5 py-5 sm:px-8">
        <Logo to="/" />
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 pb-16">
        <div className="card grid w-full overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="p-7 sm:p-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 text-green-700 ring-8 ring-green-50/60">
              <HeartHandshake className="h-7 w-7" />
            </span>
            <p className="eyebrow mt-6">Web Admin · Staff only</p>
            <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">No admin access</h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">
              This area is for HealthX staff. {who ? `${who.split(' ')[0]}, your` : 'Your'} wellness dashboard, cycle tracking and privacy settings are all in the HealthX app.
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <ButtonLink to="/get-the-app" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Go to the HealthX app
              </ButtonLink>
              <Button variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => void leave()}>
                {onBack ? 'Use a staff account' : 'Sign out of admin'}
              </Button>
            </div>
            <SecurityNote className="mt-8 max-w-md" />
          </div>
          <div className="relative hidden min-h-[360px] items-end justify-center bg-gradient-to-br from-green-50 to-mint px-8 pt-10 md:flex">
            <LeafPair className="left-6 top-6 h-40 w-40" />
            <Photo photo="woman-reading" alt="" shape="arch" position="40% 40%" className="relative h-[300px] w-[230px]" />
          </div>
        </div>
      </main>
    </div>
  );
}
