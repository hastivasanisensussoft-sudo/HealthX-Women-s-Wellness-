import { useSearchParams } from 'react-router-dom';
import { ExternalLink, Smartphone, Wand2 } from 'lucide-react';
import { buttonClasses, Notice } from '@/components/ui';
import { AccountLayout } from './AccountLayout';

/** The mobile app's web preview (Expo), for opening links during development. */
const MOBILE_PREVIEW = (import.meta.env.VITE_MOBILE_PREVIEW_URL ?? 'http://localhost:8081').replace(/\/+$/, '');

/**
 * Magic sign-in links (/login?magic=…) sign you in to the HealthX MOBILE app. The token is single-use, so this
 * page never redeems it: it hands the link to the app (healthx:// deep link) instead.
 */
export default function MagicLink() {
  const [params] = useSearchParams();
  const token = params.get('magic') ?? '';
  const q = `login?magic=${encodeURIComponent(token)}`;

  return (
    <AccountLayout eyebrow="Magic link" title="Continue in the HealthX app" subtitle="Magic links sign you in to the HealthX app on your phone." image="woman-tea" position="50% 30%" message="One tap and you’re back in — no password needed.">
      {!token ? (
        <Notice tone="warning" title="This link is incomplete">
          Open the link from your email again, or request a new one from the HealthX app’s sign-in screen.
        </Notice>
      ) : (
        <div className="space-y-4">
          <p className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-950 ring-1 ring-inset ring-green-100">
            <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
            Open this email on the phone where HealthX is installed and tap the link there, or use the button below on that phone. Links work once and expire after 15 minutes.
          </p>
          <a href={`healthx://${q}`} className={`${buttonClasses('primary', 'lg')} w-full`}>
            <Smartphone className="h-4 w-4" /> Open in the HealthX app
          </a>
          {import.meta.env.DEV && (
            <a href={`${MOBILE_PREVIEW}/${q}`} className={`${buttonClasses('outline')} w-full`}>
              <ExternalLink className="h-4 w-4" /> Open in the mobile app’s web preview (development)
            </a>
          )}
          <p className="text-xs leading-relaxed text-ink-400">The “Open in the HealthX app” button needs the installed app (a development or store build). Expo Go uses a different link format.</p>
        </div>
      )}
    </AccountLayout>
  );
}
