import {
  useState,
  type ReactNode,
} from 'react'
import {
  NavLink,
  Outlet,
} from 'react-router'

import {
  RealtimeStatusBadge,
} from '../realtime/RealtimeStatusBadge'

import { useAuth } from '../../hooks/useAuth'
import { BrandMark } from './BrandMark'

interface NavigationItem {
  label: string
  path: string
  icon: ReactNode
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
        />
      </svg>
    ),
  },
  {
    label: 'Requests',
    path: '/requests',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 7.5h10M7 12h6m-6 4.5h4M5.5 3.75h13A2.25 2.25 0 0 1 20.75 6v12A2.25 2.25 0 0 1 18.5 20.25h-13A2.25 2.25 0 0 1 3.25 18V6A2.25 2.25 0 0 1 5.5 3.75Z"
        />
      </svg>
    ),
  },
]

function roleLabel(
  role: 'operator' | 'supervisor',
): string {
  return role === 'supervisor'
    ? 'Supervisor'
    : 'Operator'
}

export function AppLayout() {
  const { user, logout } = useAuth()

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false)

  if (!user) {
    return null
  }

  const userInitial =
    user.email.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-100 px-7 py-6">
          <BrandMark />
        </div>

        <nav
          className="flex-1 space-y-2 px-4 py-6"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition duration-150',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {userInitial}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.email}
                </p>

                <p className="text-xs font-medium text-slate-500">
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setIsMobileMenuOpen(false)
          }
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden',
          isMobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <BrandMark />

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(false)
            }
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close navigation"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                d="m6 6 12 12M18 6 6 18"
              />
            </svg>
          </button>
        </div>

        <nav
          className="flex-1 space-y-2 px-4 py-6"
          aria-label="Mobile navigation"
        >
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() =>
                setIsMobileMenuOpen(false)
              }
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600',
                ].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user.email}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {roleLabel(user.role)}
          </p>
          <div className="mt-3">
            <RealtimeStatusBadge />
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-18 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
                onClick={() =>
                  setIsMobileMenuOpen(true)
                }
                aria-label="Open navigation"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                </svg>
              </button>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  Operations workspace
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  Real-Time Service Requests
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-4 sm:flex">
              <RealtimeStatusBadge />

              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {user.email}
                </p>

                <p className="text-xs font-medium text-slate-500">
                  {roleLabel(user.role)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}