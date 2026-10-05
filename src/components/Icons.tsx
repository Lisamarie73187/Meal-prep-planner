import type { ReactNode, SVGProps } from 'react'

/** Small stroke icons that follow the surrounding text colour. Decorative: buttons label themselves. */
function Icon({ size = 20, children, ...rest }: { size?: number; children: ReactNode } & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}
    >
      {children}
    </svg>
  )
}
type P = { size?: number }

export const IconSun = (p: P) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
)
export const IconBowl = (p: P) => (
  <Icon {...p}><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3" /></Icon>
)
export const IconMoon = (p: P) => (<Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon>)
export const IconLeaf = (p: P) => (<Icon {...p}><path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 16-9 0 10-3 16-9 16z" /><path d="M4 21c2-6 5-9 9-11" /></Icon>)
export const IconPlus = (p: P) => (<Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>)
export const IconMinus = (p: P) => (<Icon {...p}><path d="M5 12h14" /></Icon>)
export const IconCheck = (p: P) => (<Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>)
export const IconX = (p: P) => (<Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>)
export const IconInfo = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>)
export const IconArrowRight = (p: P) => (<Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>)
export const IconArrowLeft = (p: P) => (<Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>)
export const IconFlame = (p: P) => (<Icon {...p}><path d="M12 22c4 0 7-2.7 7-7 0-3.5-2.2-5.6-3.7-7.5-.7-.9-1.1-2-1.3-3.5-2.7 1.6-4.4 4-4.7 6.2-.9-.6-1.4-1.5-1.5-2.7C5.7 9.700 5 12 5 15c0 4.300 3 7 7 7z" /></Icon>)
export const IconDumbbell = (p: P) => (<Icon {...p}><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></Icon>)
export const IconWheat = (p: P) => (<Icon {...p}><path d="M12 22V9M12 9c0-2 1.500-3.500 3-4 0 2-1 3.500-3 4zM12 9c0-2-1.500-3.500-3-4 0 2 1 3.500 3 4zM12 14c0-2 1.500-3.500 3-4 0 2-1 3.500-3 4zM12 14c0-2-1.500-3.500-3-4 0 2 1 3.500 3 4zM12 19c0-2 1.500-3.500 3-4 0 2-1 3.500-3 4zM12 19c0-2-1.500-3.500-3-4 0 2 1 3.500 3 4zM12 5V2" /></Icon>)
export const IconDrop = (p: P) => (<Icon {...p}><path d="M12 3s6 6.200 6 10.500a6 6 0 0 1-12 0C6 9.200 12 3 12 3z" /></Icon>)
export const IconCalendar = (p: P) => (<Icon {...p}><rect x="3.500" y="5" width="17" height="15.500" rx="3" /><path d="M8 3v4M16 3v4M3.500 10h17" /></Icon>)
export const IconTarget = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.200" /></Icon>)
export const IconPencil = (p: P) => (<Icon {...p}><path d="M4 20l1-4L16.500 4.500a2.100 2.100 0 0 1 3 3L8 19l-4 1z" /><path d="M14.500 6.500l3 3" /></Icon>)
export const IconChevronDown = (p: P) => (<Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>)
export const IconPie = (p: P) => (<Icon {...p}><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.500A9 9 0 0 1 20.500 9H15z" /></Icon>)
export const IconBars = (p: P) => (<Icon {...p}><path d="M5 20V12M12 20V5M19 20v-5" /></Icon>)
