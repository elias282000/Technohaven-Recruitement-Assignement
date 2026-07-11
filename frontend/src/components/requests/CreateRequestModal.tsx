import {
  useState,
  type FormEvent,
} from 'react'

import { ApiError } from '../../lib/api'
import { createRequest } from '../../services/requestService'

import type {
  CreateRequestPayload,
  RequestPriority,
  ServiceRequest,
} from '../../types/request'

import { Modal } from './Modal'

interface CreateRequestModalProps {
  onCreated: (
    serviceRequest: ServiceRequest,
  ) => void
  onClose: () => void
}

interface RequestFormErrors {
  title?: string
  description?: string
  requester_name?: string
  priority?: string
}

const initialForm: CreateRequestPayload = {
  title: '',
  description: '',
  requester_name: '',
  priority: 'medium',
}

function validateRequest(
  form: CreateRequestPayload,
): RequestFormErrors {
  const errors: RequestFormErrors = {}

  const title = form.title.trim()
  const description =
    form.description.trim()
  const requesterName =
    form.requester_name.trim()

  if (!title) {
    errors.title = 'Title is required.'
  } else if (title.length < 3) {
    errors.title =
      'Title must contain at least 3 characters.'
  } else if (title.length > 200) {
    errors.title =
      'Title must not exceed 200 characters.'
  }

  if (!description) {
    errors.description =
      'Description is required.'
  } else if (description.length < 10) {
    errors.description =
      'Description must contain at least 10 characters.'
  } else if (description.length > 5000) {
    errors.description =
      'Description must not exceed 5,000 characters.'
  }

  if (!requesterName) {
    errors.requester_name =
      'Requester name is required.'
  } else if (requesterName.length < 2) {
    errors.requester_name =
      'Requester name must contain at least 2 characters.'
  } else if (requesterName.length > 150) {
    errors.requester_name =
      'Requester name must not exceed 150 characters.'
  }

  if (
    !['low', 'medium', 'high'].includes(
      form.priority,
    )
  ) {
    errors.priority =
      'Select a valid priority.'
  }

  return errors
}

export function CreateRequestModal({
  onCreated,
  onClose,
}: CreateRequestModalProps) {
  const [form, setForm] =
    useState<CreateRequestPayload>(
      initialForm,
    )

  const [errors, setErrors] =
    useState<RequestFormErrors>({})

  const [serverError, setServerError] =
    useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  function updateField<
    Field extends keyof CreateRequestPayload,
  >(
    field: Field,
    value: CreateRequestPayload[Field],
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
      validateRequest(form)

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setServerError(null)

    try {
      const createdRequest =
        await createRequest({
          title: form.title.trim(),
          description:
            form.description.trim(),
          requester_name:
            form.requester_name.trim(),
          priority: form.priority,
        })

      onCreated(createdRequest)
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message)
      } else {
        setServerError(
          'An unexpected error occurred while creating the request.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Create service request"
      description="Provide the service recipient and request details."
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="create-request-form"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Creating…'
              : 'Create request'}
          </button>
        </div>
      }
    >
      <form
        id="create-request-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {serverError}
          </div>
        )}

        <div>
          <label
            htmlFor="request-title"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Request title
          </label>

          <input
            id="request-title"
            type="text"
            value={form.title}
            onChange={(event) =>
              updateField(
                'title',
                event.target.value,
              )
            }
            maxLength={200}
            autoFocus
            aria-invalid={
              errors.title ? 'true' : 'false'
            }
            className={[
              'w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-4',
              errors.title
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
            ].join(' ')}
            placeholder="Example: Printer not working"
          />

          <div className="mt-2 flex justify-between gap-4">
            {errors.title ? (
              <p className="text-sm font-medium text-red-600">
                {errors.title}
              </p>
            ) : (
              <span />
            )}

            <span className="text-xs text-slate-400">
              {form.title.length}/200
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="requester-name"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Requester name
          </label>

          <input
            id="requester-name"
            type="text"
            value={form.requester_name}
            onChange={(event) =>
              updateField(
                'requester_name',
                event.target.value,
              )
            }
            maxLength={150}
            aria-invalid={
              errors.requester_name
                ? 'true'
                : 'false'
            }
            className={[
              'w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-4',
              errors.requester_name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
            ].join(' ')}
            placeholder="Name of the service recipient"
          />

          {errors.requester_name && (
            <p className="mt-2 text-sm font-medium text-red-600">
              {errors.requester_name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="request-priority"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Priority
          </label>

          <select
            id="request-priority"
            value={form.priority}
            onChange={(event) =>
              updateField(
                'priority',
                event.target
                  .value as RequestPriority,
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="low">
              Low
            </option>
            <option value="medium">
              Medium
            </option>
            <option value="high">
              High
            </option>
          </select>

          {errors.priority && (
            <p className="mt-2 text-sm font-medium text-red-600">
              {errors.priority}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="request-description"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="request-description"
            value={form.description}
            onChange={(event) =>
              updateField(
                'description',
                event.target.value,
              )
            }
            rows={6}
            maxLength={5000}
            aria-invalid={
              errors.description
                ? 'true'
                : 'false'
            }
            className={[
              'w-full resize-y rounded-xl border px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:ring-4',
              errors.description
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100',
            ].join(' ')}
            placeholder="Describe the issue or service requirement."
          />

          <div className="mt-2 flex justify-between gap-4">
            {errors.description ? (
              <p className="text-sm font-medium text-red-600">
                {errors.description}
              </p>
            ) : (
              <span />
            )}

            <span className="text-xs text-slate-400">
              {form.description.length}/5000
            </span>
          </div>
        </div>
      </form>
    </Modal>
  )
}