import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getInviteByToken, InvalidInviteError } from '@/server/services/admin-user-service';
import { AcceptInviteForm } from '@/components/admin/accept-invite-form';

export const metadata: Metadata = {
  title: 'Accept invitation',
  robots: { index: false, follow: false },
};

const ROLE_LABELS = { ADMIN: 'Admin', CONTENT_EDITOR: 'Content editor' } as const;

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let invite: Awaited<ReturnType<typeof getInviteByToken>> | null = null;
  if (token) {
    try {
      invite = await getInviteByToken(token);
    } catch (error) {
      if (!(error instanceof InvalidInviteError)) throw error;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950">
      <Image src="/images/hero-mortar-pestle.png" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-10">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          {invite && token ? (
            <>
              <h1 className="text-primary-950 font-serif text-xl sm:text-2xl">Accept your invitation</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Choose a password for {invite.email}. You&apos;ll join as {ROLE_LABELS[invite.role]}.
              </p>
              <AcceptInviteForm token={token} email={invite.email} />
            </>
          ) : (
            <>
              <h1 className="text-primary-950 font-serif text-xl sm:text-2xl">Invitation unavailable</h1>
              <p className="mt-2 text-sm text-neutral-600">
                This invitation link is invalid, has expired, or was already used. Ask an admin to
                send you a new one.
              </p>
              <Link
                href="/admin/login"
                className="text-primary-950 mt-6 inline-block text-sm font-medium underline-offset-2 hover:underline"
              >
                Go to sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
