import { useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import type { UserRole } from '../../api/types'
import { Button } from '../../components/Button'
import { AdminFilterInput, AdminFilterSelect, AdminListPanel } from '../../components/admin/AdminListPanel'
import { PageHeader } from '../../components/PageHeader'
import { Pill } from '../../components/Pill'
import { formatDateTime } from '../../lib/format'
import { formatEtb } from '../../lib/money'

const PAGE_SIZE = 20

export function AdminUsers() {
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [page, setPage] = useState(1)

  const users = useQuery({
    queryKey: ['admin', 'users', search, role, page],
    queryFn: () => adminApi.users({
      search,
      role: role || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchDraft.trim())
    setPage(1)
  }

  return (
    <>
      <PageHeader title="Users" />
      <form onSubmit={submit} className="mb-5 flex flex-wrap items-end gap-3">
        <AdminFilterInput label="Search email" value={searchDraft} onChange={setSearchDraft} placeholder="name@example.com" />
        <AdminFilterSelect
          label="Role"
          value={role}
          onChange={(value) => {
            setRole(value === 'User' || value === 'Admin' ? value : '')
            setPage(1)
          }}
          options={[
            { value: '', label: 'All roles' },
            { value: 'User', label: 'User' },
            { value: 'Admin', label: 'Admin' },
          ]}
        />
        <Button type="submit">
          Search
        </Button>
      </form>

      <AdminListPanel
        title="Registered users"
        total={users.data?.total}
        page={page}
        pageSize={PAGE_SIZE}
        isLoading={users.isLoading}
        error={users.error}
        onRetry={() => void users.refetch()}
        onPageChange={setPage}
        emptyMessage="No users match these filters."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Wallet balance</th>
                <th className="px-3 py-2 font-semibold">Registered</th>
                <th className="px-3 py-2 font-semibold">User ID</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.items.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-semibold">{user.email}</td>
                  <td className="px-3 py-3">
                    <Pill tone={user.role === 'Admin' ? 'warn' : 'neutral'}>{user.role}</Pill>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {user.walletBalance === null ? '—' : formatEtb(user.walletBalance)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminListPanel>
    </>
  )
}
