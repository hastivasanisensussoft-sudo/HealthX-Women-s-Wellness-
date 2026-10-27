import { ArrowLeft, Compass, LifeBuoy, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '@/components/ui';
import { Leaf, LeafPair, Logo } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';

export default function NotFound({ inApp }: { inApp?: boolean }) {
  const body = (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 lg:grid-cols-[1fr_auto]">
      <div className="text-center lg:text-left">
        <p className="eyebrow justify-center lg:justify-start">
          <Compass className="h-3.5 w-3.5" /> Error 404
        </p>
        <p aria-hidden className="mt-3 font-display text-[88px] font-semibold leading-none tracking-[-0.04em] text-green-100 sm:text-[120px]">
          4<span className="text-green-300">0</span>4
        </p>
        <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-green-950 sm:text-[40px]">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-ink-500 lg:mx-0">The page you’re looking for doesn’t exist or has moved. Let’s get you back somewhere familiar.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
          <ButtonLink to={inApp ? '/app' : '/'} size="lg" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            {inApp ? 'Back to dashboard' : 'Back to home'}
          </ButtonLink>
          <ButtonLink to={inApp ? '/app/learn/faq' : '/faq'} size="lg" variant="outline" leftIcon={inApp ? <Search className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}>
            {inApp ? 'Most asked questions' : 'Help centre'}
          </ButtonLink>
        </div>
      </div>
      <div className="relative mx-auto hidden w-[260px] sm:block">
        <LeafPair className="-left-12 -top-8 h-36 w-36" />
        <Photo photo="walking-outdoors" alt="" shape="arch" position="40% 50%" className="relative aspect-[4/5] w-full shadow-lift ring-[6px] ring-white" />
        <span className="glass absolute -bottom-4 -right-6 rounded-2xl px-4 py-3 font-script text-[22px] font-bold text-green-700 shadow-lift">this way →</span>
      </div>
    </div>
  );
  if (inApp) return <div className="py-12">{body}</div>;
  return (
    <div className="bg-wash relative isolate flex min-h-screen flex-col overflow-hidden">
      <Leaf className="pointer-events-none absolute -bottom-20 -left-16 -z-10 h-72 w-72 -rotate-12 text-green-200/60" color="currentColor" vein={false} />
      <div className="flex items-center justify-between px-6 py-5">
        <Logo />
        <Link to="/contact" className="inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-semibold text-green-700 hover:bg-white">
          Contact us
        </Link>
      </div>
      <main className="flex flex-1 items-center py-12">{body}</main>
    </div>
  );
}
