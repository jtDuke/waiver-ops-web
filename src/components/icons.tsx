import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20" {...props}>
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeWidth="1.7" /></IconBase>;
}

export function LeagueIcon(props: IconProps) {
  return <IconBase {...props}><path d="M16.5 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.8a3.3 3.3 0 0 0-3.3 3.3V20M10 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM17 11l2 2 3-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconBase>;
}

export function IntelligenceIcon(props: IconProps) {
  return <IconBase {...props}><path d="M9.2 18.5h5.6M10 21h4M8.5 15.2a7 7 0 1 1 7 0c-.8.6-1.2 1.1-1.2 1.8H9.7c0-.7-.4-1.2-1.2-1.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M19 13.6v-3.2l-2-.7-.5-1.1.9-1.9-2.2-2.2-1.9.9-1.2-.5-.6-2H8.4l-.7 2-1.1.5-1.9-.9-2.2 2.2.9 1.9-.5 1.2-2 .6v3.2l2 .7.5 1.1-.9 1.9 2.2 2.2 1.9-.9 1.2.5.6 2h3.2l.7-2 1.1-.5 1.9.9 2.2-2.2-.9-1.9.5-1.2 1.9-.6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></IconBase>;
}

export function ArrowIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconBase>;
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></IconBase>;
}

export function PulseIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconBase>;
}
