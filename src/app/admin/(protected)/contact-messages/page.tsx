import { requirePermission } from '@/lib/auth/require-admin';
import { listContactMessages } from '@/server/services/contact-message-service';
import { ContactMessageList } from '@/components/admin/contact-message-list';
import { parsePageParams } from '@/lib/pagination';

export default async function AdminContactMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('contactMessages:manage');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const { items: messages, page, totalPages, total } = await listContactMessages(pageParams);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Contact Messages</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total</p>
      <p className="mt-2 text-sm text-neutral-600">Messages submitted through the public contact form.</p>
      <div className="mt-8">
        <ContactMessageList
          messages={messages.map((message) => ({
            id: message.id,
            name: message.name,
            email: message.email,
            phone: message.phone,
            message: message.message,
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
          }))}
          pagination={{ page, totalPages, total, basePath: '/admin/contact-messages' }}
        />
      </div>
    </div>
  );
}
