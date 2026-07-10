import { adminApi } from '@/lib/admin-api';
import { MOCK_PARTICIPANTS } from '@/mocks/participants.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

export interface Audience {
  channel?: '' | 'presentiel' | 'online';
  status?: '' | 'paid' | 'pending';
}

export type CommChannel = 'email' | 'whatsapp' | 'both';

function matches(a: Audience) {
  return MOCK_PARTICIPANTS.filter(
    (p) => (!a.channel || p.channel === a.channel) && (!a.status || p.status === a.status),
  );
}

/** Nombre de destinataires du segment (compteur live). */
export async function countRecipients(a: Audience): Promise<number> {
  if (IS_MOCK) return matches(a).length;
  const res = await adminApi.get<{ count: number }>('/admin/communications/recipients', { params: a });
  return res.data.count;
}

export async function sendCampaign(input: {
  channel: CommChannel;
  subject: string;
  message: string;
  audience: Audience;
}): Promise<{ sent: number }> {
  if (IS_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { sent: matches(input.audience).length };
  }
  return (await adminApi.post<{ sent: number }>('/admin/communications/send', input)).data;
}
