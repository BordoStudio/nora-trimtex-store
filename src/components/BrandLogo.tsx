export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return <>
    <span className={`brand-mark${footer ? " is-footer" : ""}`} aria-hidden="true"><img src="/brand/logo-mark-v3.png" alt="" /></span>
    <span className="brand-wordmark"><strong>NORA</strong><small>TRIMTEX</small></span>
  </>;
}
