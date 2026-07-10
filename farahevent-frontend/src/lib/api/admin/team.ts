import { adminApi } from '@/lib/admin-api';
import type { AdminOut, AdminRole } from '@/types/admin';
import { MOCK_ADMINS } from '@/mocks/admins.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

let store: AdminOut[] | null = null;
const ensure = () => (store ??= MOCK_ADMINS.map((a) => ({ ...a })));

export interface NewAdmin {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: AdminRole;
}

export async function getAdmins(): Promise<AdminOut[]> {
  if (IS_MOCK) return ensure();
  return (await adminApi.get<AdminOut[]>('/admin/admins/')).data;
}

export async function createAdmin(form: NewAdmin): Promise<void> {
  if (IS_MOCK) {
    ensure().push({
      id: `adm_${Math.random().toString(36).slice(2, 8)}`,
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
      is_active: true,
      two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
    });
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  await adminApi.post('/admin/admins/', form);
}

export async function deactivateAdmin(id: string): Promise<void> {
  if (IS_MOCK) {
    const a = ensure().find((x) => x.id === id);
    if (a) a.is_active = false;
    await new Promise((r) => setTimeout(r, 200));
    return;
  }
  await adminApi.delete(`/admin/admins/${id}`);
}
