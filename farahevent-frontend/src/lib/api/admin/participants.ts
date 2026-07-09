import { adminApi } from '@/lib/admin-api';
import type { ParticipantRow, ParticipantsQuery, ParticipantsResult } from '@/types/participant';
import { MOCK_PARTICIPANTS } from '@/mocks/participants.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

/**
 * Liste paginée + filtrée des participants (CONCEPTION_FRONTEND.md §10.5).
 * Mock : filtre/tri/pagination côté client sur la fixture.
 */
export async function getParticipants(q: ParticipantsQuery): Promise<ParticipantsResult> {
  if (IS_MOCK) return mockQuery(q);
  const res = await adminApi.get<ParticipantsResult>('/admin/participants', { params: q });
  return res.data;
}

function mockQuery(q: ParticipantsQuery): ParticipantsResult {
  let rows = [...MOCK_PARTICIPANTS];

  const search = (q.search ?? '').trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.order_ref.toLowerCase().includes(search),
    );
  }
  if (q.formula) rows = rows.filter((r) => r.formula === q.formula);
  if (q.country) rows = rows.filter((r) => r.country === q.country);
  if (q.status) rows = rows.filter((r) => r.status === q.status);

  const total = rows.length;

  const sort = (q.sort ?? 'created_at') as keyof ParticipantRow;
  const dir = q.dir ?? 'desc';
  rows.sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'fr');
    return dir === 'asc' ? cmp : -cmp;
  });

  const pageSize = q.pageSize ?? 20;
  const page = q.page ?? 1;
  rows = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return {
    rows,
    total,
    facets: {
      formulas: [...new Set(MOCK_PARTICIPANTS.map((r) => r.formula))],
      countries: [...new Set(MOCK_PARTICIPANTS.map((r) => r.country))].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
    },
  };
}
