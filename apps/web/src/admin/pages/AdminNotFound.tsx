import { ArrowLeft, Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui';

export default function AdminNotFound() {
  return (
    <div className="card relative mx-auto mt-6 max-w-xl overflow-hidden p-8 text-center sm:p-10">
      <span aria-hidden className="leaf absolute -right-8 -top-8 h-28 w-28 bg-rose-50" />
      <span aria-hidden className="leaf-alt absolute -bottom-10 -left-10 h-28 w-28 bg-green-50" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 text-green-700 ring-8 ring-green-50/60">
        <Compass className="h-7 w-7" />
      </div>
      <p className="eyebrow relative mt-5">Web Admin · 404</p>
      <h2 className="relative mt-1.5 font-display text-[24px] font-semibold tracking-[-0.015em] text-ink-900">Admin page not found</h2>
      <p className="relative mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-500">This admin page doesn’t exist or has moved.</p>
      <ButtonLink to="/admin" size="sm" className="relative mt-6" leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Back to overview
      </ButtonLink>
    </div>
  );
}
