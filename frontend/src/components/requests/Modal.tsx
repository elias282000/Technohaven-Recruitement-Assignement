import {
  useEffect,
  useRef,
  type ReactNode,
} from 'react'

interface ModalProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'medium' | 'large'
  onClose: () => void
}

export function Modal({
  title,
  description,
  children,
  footer,
  size = 'medium',
  onClose,
}: ModalProps) {
  const modalRef =
    useRef<HTMLElement | null>(null)

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow

    const previouslyFocusedElement =
      document.activeElement instanceof
      HTMLElement
        ? document.activeElement
        : null

    document.body.style.overflow = 'hidden'

    window.requestAnimationFrame(() => {
      modalRef.current?.focus()
    })

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )

      previouslyFocusedElement?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <section
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={
          description
            ? 'modal-description'
            : undefined
        }
        className={[
          'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl outline-none',
          size === 'large'
            ? 'max-w-4xl'
            : 'max-w-xl',
        ].join(' ')}
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="pr-5">
            <h2
              id="modal-title"
              className="text-xl font-bold tracking-tight text-slate-950"
            >
              {title}
            </h2>

            {description && (
              <p
                id="modal-description"
                className="mt-1 text-sm leading-6 text-slate-500"
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
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
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}