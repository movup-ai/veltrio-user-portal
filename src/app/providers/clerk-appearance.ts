import type { ClerkProvider } from '@clerk/clerk-react'
import type { ComponentProps } from 'react'

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>['appearance']>

// The portal's own Input and Button classes. Clerk draws borders and focus as faint box-shadows
// that read as half-drawn boxes, so a set shadow replaces them in every state.
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
const input = [
  'h-10 rounded-md border border-input bg-background px-3 text-body text-foreground shadow-xs transition-colors',
  'placeholder:text-muted-foreground hover:border-border-strong',
  'focus:outline-2 focus:outline-offset-2 focus:outline-ring',
  'aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error',
].join(' ')
const outlineButton = `h-10 rounded-md border border-input bg-background text-foreground shadow-xs transition-colors hover:bg-muted ${focusRing}`
const link = 'text-primary hover:text-primary-hover font-semibold no-underline hover:underline'

/**
 * Clerk's screens dressed in the portal's tokens. Colours are CSS variables, so they follow the
 * `.dark` class without a second theme; Clerk derives its remaining shades from them.
 */
export const clerkAppearance: Appearance = {
  // Below the utilities layer (see globals.css), so the classes in `elements` win over Clerk's.
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: 'var(--veltrio-primary-solid)',
    colorPrimaryForeground: 'var(--veltrio-solid-foreground)',
    colorBackground: 'var(--veltrio-surface)',
    colorForeground: 'var(--veltrio-fg)',
    colorMutedForeground: 'var(--veltrio-fg-3)',
    colorMuted: 'var(--veltrio-surface-3)',
    colorNeutral: 'var(--veltrio-fg)',
    colorInput: 'var(--veltrio-bg)',
    colorInputForeground: 'var(--veltrio-fg)',
    // Clerk draws borders at a low alpha of this, so it takes the text colour, not a border token.
    colorBorder: 'var(--veltrio-fg)',
    colorRing: 'var(--veltrio-ring)',
    colorDanger: 'var(--veltrio-error)',
    colorSuccess: 'var(--veltrio-success)',
    colorWarning: 'var(--veltrio-warning)',
    colorModalBackdrop: 'var(--veltrio-scrim)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-md)',
  },
  elements: {
    formFieldLabel: 'text-label text-foreground',
    formFieldInput: input,
    formFieldInputShowPasswordButton: 'text-fg-4 hover:text-foreground hover:bg-transparent',
    formFieldErrorText: 'text-caption text-error',
    formFieldAction: link,
    otpCodeFieldInput: `${input} size-11 px-0 text-center text-[18px] font-semibold`,
    formButtonPrimary: `h-10 rounded-md bg-primary-solid text-solid-foreground text-label font-semibold normal-case shadow-xs transition-colors hover:bg-primary-solid/90 after:hidden before:hidden ${focusRing}`,
    buttonArrowIcon: 'hidden',
    socialButtonsBlockButton: outlineButton,
    socialButtonsBlockButtonText: 'text-label font-semibold',
    alternativeMethodsBlockButton: outlineButton,
    dividerLine: 'bg-border',
    dividerText: 'text-caption text-fg-4',
    identityPreview: 'rounded-md border border-border bg-surface-2 shadow-none',
    identityPreviewEditButton: link,
    formResendCodeLink: link,
    backLink: link,
    footerActionLink: link,
    alert: 'rounded-md border border-error/30 bg-error-tint shadow-none',
    alertText: 'text-error',
    // Deleting the Clerk account would strand the company it owns.
    profileSection__danger: 'hidden',
  },
}

/** Sign-in and sign-up sit straight on the auth page, so Clerk's own card frame is dropped. */
export const authPageAppearance: Appearance = {
  layout: { socialButtonsPlacement: 'top', socialButtonsVariant: 'blockButton' },
  elements: {
    rootBox: 'w-full max-w-[400px]',
    // Clerk widens the card 1px past each side of a clipping box to hide its own border; with the
    // borders gone that 1px was the inputs' edges, and the focus ring sits outside them too.
    cardBox: 'w-full max-w-none overflow-visible shadow-none border-0 rounded-none bg-transparent',
    card: 'm-0 w-full bg-transparent shadow-none border-0 rounded-none p-0 gap-7',
    header: 'items-center text-center gap-1.5',
    headerTitle: 'font-[family-name:var(--font-display)] text-[26px] leading-tight font-bold tracking-tight',
    headerSubtitle: 'text-description text-center',
    main: 'gap-6',
    form: 'gap-5',
    footer: 'bg-none bg-transparent px-0 [&>*]:border-0',
    footerAction: 'w-full justify-center px-0 pt-4 pb-2',
    footerActionText: 'text-fg-3',
  },
}
