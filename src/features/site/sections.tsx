// The six site section components (SPEC.md SITE agent). Each receives its
// SectionColors and renders inside the Section wrapper, which exposes them as
// --section-* CSS vars per the section rendering contract.

import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import type { SectionType } from '../../content/types'
import { useProducts } from '../../content/store'
import type { SectionColors } from '../../lib/color'
import { Section } from './Section'
import { ProductCard } from './ProductCard'

export interface SectionComponentProps {
  colors: SectionColors
}

// ------------------------------------------------------------------- hero

export function HeroSection({ colors }: SectionComponentProps) {
  return (
    <Section colors={colors} kind="hero" innerClassName="hero__inner">
      <h1 className="hero__title">Ali3nCak3</h1>
      <p className="hero__subtitle">
        Small-batch bakes from another galaxy. Dropped weekly, gone at
        lightspeed.
      </p>
      <Link to="/store" className="cta hero__cta">
        Shop the drop
      </Link>
    </Section>
  )
}

// ------------------------------------------------------------------ about

export function AboutSection({ colors }: SectionComponentProps) {
  return (
    <Section colors={colors} kind="about" innerClassName="split__inner split__inner--img-left">
      <div className="img-placeholder" aria-hidden="true" />
      <div>
        <h2 className="split__heading">Baked beyond the atmosphere</h2>
        <p className="split__body">
          Ali3nCak3 started with one question: what would dessert taste like if
          it never had to obey gravity? Every recipe is tested in tiny batches,
          frosted by hand, and boxed the same morning it leaves the oven.
        </p>
        <p className="split__body">
          No preservatives, no shortcuts, nothing mass-produced — just strange,
          delicious bakes you will not find anywhere else on this planet.
        </p>
      </div>
    </Section>
  )
}

// --------------------------------------------------------------- promoted

export function PromotedSection({ colors }: SectionComponentProps) {
  const promoted = useProducts().filter((p) => p.published && p.promoted)
  return (
    <Section colors={colors} kind="promoted">
      <h2 className="section__heading">This week&apos;s drop</h2>
      <p className="section__lede">
        Crew favorites, promoted straight from the flight deck. When they are
        gone, they are gone.
      </p>
      {promoted.length === 0 ? (
        <p className="section__empty">New drops landing soon — check back shortly.</p>
      ) : (
        <div className="product-grid">
          {promoted.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------- misc

export function MiscSection({ colors }: SectionComponentProps) {
  return (
    <Section colors={colors} kind="misc" innerClassName="split__inner split__inner--img-right">
      <div>
        <h2 className="split__heading">How the drops work</h2>
        <p className="split__body">
          New bakes land in the store every Friday at 12:00. Stock is counted
          to the slice, so once a bake sells out it stays out until the next
          transmission.
        </p>
        <p className="split__body">
          Follow along for launch announcements, secret flavors, and the
          occasional unidentified frosted object.
        </p>
      </div>
      <div className="img-placeholder" aria-hidden="true" />
    </Section>
  )
}

// ------------------------------------------------------------ storeBanner

export function StoreBannerSection({ colors }: SectionComponentProps) {
  return (
    <Section colors={colors} kind="storeBanner" innerClassName="store-banner__inner">
      <h1 className="store-banner__title">The Store</h1>
      <p className="store-banner__subtitle">
        Every current bake, fresh from the mothership.
      </p>
    </Section>
  )
}

// ------------------------------------------------------------ productGrid

export function ProductGridSection({ colors }: SectionComponentProps) {
  const published = useProducts().filter((p) => p.published)
  return (
    <Section colors={colors} kind="productGrid">
      <h2 className="section__heading">All bakes</h2>
      <p className="section__lede">
        The full current lineup. Stock updates live as orders come in.
      </p>
      {published.length === 0 ? (
        <p className="section__empty">The shelves are empty — restock incoming.</p>
      ) : (
        <div className="product-grid">
          {published.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------- map

export const SECTION_COMPONENTS: Record<
  SectionType,
  ComponentType<SectionComponentProps>
> = {
  hero: HeroSection,
  about: AboutSection,
  promoted: PromotedSection,
  misc: MiscSection,
  storeBanner: StoreBannerSection,
  productGrid: ProductGridSection,
}
