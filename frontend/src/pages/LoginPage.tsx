import {
  useState,
  type FormEvent,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import { BrandMark } from '../components/layout/BrandMark'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/api'

interface LocationState {
  from?: {
    pathname?: string
  }
}

interface LoginFormState {
  email: string
  password: string
}

interface LoginFormErrors {
  email?: string
  password?: string
}

const initialFormState: LoginFormState = {
  email: '',
  password: '',
}

function validateLoginForm(
  form: LoginFormState,
): LoginFormErrors {
  const errors: LoginFormErrors = {}

  const normalizedEmail = form.email.trim()

  if (!normalizedEmail) {
    errors.email = 'Email address is required.'
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail,
    )
  ) {
    errors.email =
      'Enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function LoginPage() {
  const { login } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] =
    useState<LoginFormState>(initialFormState)

  const [errors, setErrors] =
    useState<LoginFormErrors>({})

  const [serverError, setServerError] =
    useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const locationState =
    location.state as LocationState | null

  const destination =
    locationState?.from?.pathname ?? '/dashboard'

  function updateField(
    field: keyof LoginFormState,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))

    setServerError(null)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    const validationErrors =
      validateLoginForm(form)

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setServerError(null)

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })

      navigate(destination, {
        replace: true,
      })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setServerError(
            'The email or password is incorrect.',
          )
        } else {
          setServerError(error.message)
        }
      } else {
        setServerError(
          'An unexpected error occurred.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(5,150,105,0.18),_transparent_38%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
        <section className="hidden max-w-xl lg:block">
          <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Internal operations platform
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white">
            Manage service work with clarity and control.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Create, monitor, and coordinate service
            requests from one reliable workspace built
            for Operators and Supervisors.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-2xl font-bold text-emerald-300">
                Live
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Request activity will stay synchronized
                across connected clients.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-2xl font-bold text-emerald-300">
                Secure
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Role and ownership rules remain enforced
                by the backend.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-black/30 sm:p-9">
            <BrandMark />

            <div className="mt-9">
              <p className="text-sm font-semibold text-emerald-600">
                Welcome back
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Sign in to continue
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use your Operator or Supervisor account.
              </p>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={handleSubmit}
              noValidate
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      'email',
                      event.target.value,
                    )
                  }
                  autoComplete="email"
                  autoFocus
                  aria-invalid={
                    errors.email ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.email
                      ? 'email-error'
                      : undefined
                  }
                  className={[
                    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition duration-150 placeholder:text-slate-400 focus:ring-4',
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
                  ].join(' ')}
                  placeholder="operator@example.com"
                />

                {errors.email && (
                  <p
                    id="email-error"
                    className="mt-2 text-sm font-medium text-red-600"
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField(
                      'password',
                      event.target.value,
                    )
                  }
                  autoComplete="current-password"
                  aria-invalid={
                    errors.password
                      ? 'true'
                      : 'false'
                  }
                  aria-describedby={
                    errors.password
                      ? 'password-error'
                      : undefined
                  }
                  className={[
                    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition duration-150 placeholder:text-slate-400 focus:ring-4',
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
                  ].join(' ')}
                  placeholder="Enter your password"
                />

                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-2 text-sm font-medium text-red-600"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition duration-150 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Signing in…'
                  : 'Sign in'}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              Access is limited to authorized internal
              users.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}