import Image from "next/image";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return <>
    <span className={`brand-mark${footer ? " is-footer" : ""}`} aria-hidden="true"><Image src="/brand/logo-mark-v3.png" alt="" width={64} height={64} /></span>
    <span className="brand-wordmark"><strong>NORA</strong><small>TRIMTEX</small></span>
  </>;
}
