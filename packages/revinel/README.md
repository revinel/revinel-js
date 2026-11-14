# revinel

The official JavaScript SDK for [Revinel](https://revinel.com), the self-serve ad platform
that lets publishers sell ad space directly to advertisers as monthly subscriptions.

One package covers both integration jobs:

1. **Render ads** on your site with the headless client (`revinel`) or React hooks (`revinel/react`).
2. **Acquire advertisers** with the "Subscribe to advertise" tier selector (`revinel/react` or `revinel/browser`).

## Install

```sh
npm install revinel
```

The package has no dependencies. `react` (18 or newer) is an optional peer dependency, needed
only for `revinel/react`.

| Import | What it does |
| --- | --- |
| `revinel` | Headless client: fetch ads and tiers, record impressions and clicks, start checkout. Runs in any runtime with `fetch` (browser, Node, edge, workers). |
| `revinel/react` | `RevinelProvider`, hooks, and the tier selector components. |
| `revinel/browser` | Vanilla tier selector: inline (`mountTierSelector`) or as a modal (`openTierSelector`). |
| `revinel/embeds` | The `postMessage` protocol between the `/embed` iframe and its host. Only needed for a custom host integration. |

## Render ads (headless)

```ts
import { createRevinelClient } from "revinel"

const revinel = createRevinelClient({
  workspaceId: "your-workspace-id",
  // apiUrl is optional and defaults to the Revinel production API.
})

// The single ad currently serving for a placement. `weight` is a range filter
// ({ gte, gt, lte, lt }), for example { gte: 2.5 } for premium placements.
const ad = await revinel.getAd({ weight: { gte: 2.5 } })

// Several distinct ads for a grid. Pass excludeIds to skip ads you already show.
const ads = await revinel.getAds({ count: 5, excludeIds: ad ? [ad.id] : [] })

if (ad) {
  await revinel.recordImpression(ad.id)
  await revinel.recordClick(ad.id)
}
```

`getAd` resolves to `RevinelAd | null` and `getAds` to `RevinelAd[]`. An empty result means no
ad is eligible. The SDK never throws for "no ads". `ad.faviconUrl` is `string | null`.

> **Multiple slots on one page? Use one `getAds({ count: n })`, not `n` calls to `getAd()`.**
> Every `getAd()` sends the same request, so the shared edge cache returns the same ad to each
> call. You would render duplicates and record duplicate impressions.

> **Fetch on the server.** Fetch ads in server or edge code (a React Server Component, a
> loader, a route handler) so the ad is server-rendered, with no layout shift. Use the React
> hooks only in client-only apps.

### Typed creative (`meta`)

`ad.meta` is keyed by each custom field's stable key, set when the publisher creates the field
(for example `bannerImage` for a "Banner image" field). Register your creative shape once and
every call is typed:

```ts
// revinel.d.ts (or anywhere in your app)
declare module "revinel" {
  interface RevinelMetaRegistry {
    tagline?: string
    bannerImage?: string
    ctaLabel?: string
  }
}
```

```ts
const ad = await revinel.getAd({ weight: { gte: 2.5 } })
ad?.meta.bannerImage // string | undefined
```

The key never changes, so renaming a field's label never breaks your code. For a one-off shape,
pass a generic instead: `revinel.getAd<{ bannerImage?: string }>()`.

### Next.js and caching

Ad fetches default to `next: { revalidate: 60 }`. Next.js App Router pages that call `getAd`
or `getAds` stay statically renderable, and the ad still refreshes every minute. Other
runtimes ignore the `next` key. The Revinel API edge-caches responses for about 5 seconds, so
rotation per request was always approximate. Opt out for true per-request rotation:

```ts
const ad = await revinel.getAd({ request: { cache: "no-store" } })
```

An explicit `cache` or `next.revalidate` replaces the default entirely.

### Timeouts and errors

Requests abort after 10 seconds by default and reject with a `TimeoutError` `DOMException`.
Set `timeoutMs` on the client to change the limit, or `false` to disable it.

Responses outside the 2xx range throw `RevinelApiError` (`{ status, body }`). The body is the
Revinel API error envelope:

```jsonc
{ "defined": false, "code": "NOT_FOUND", "status": 404, "message": "Workspace not found." }
```

Validation failures answer HTTP 422 with `code: "INPUT_VALIDATION_FAILED"` and a
`data.fieldErrors` / `data.formErrors` map.

## Render ads (React)

Wrap your app once, then read ads with the hooks:

```tsx
import { RevinelProvider, useAd, useTracking } from "revinel/react"

const AdSlot = () => {
  const { data: ad } = useAd({ weight: { gte: 2.5 } })
  const { impressionRef, getClickProps } = useTracking(ad?.id)

  if (!ad) return null

  return (
    <a ref={impressionRef} href={ad.websiteUrl} {...getClickProps()}>
      {ad.name}
    </a>
  )
}

export const Ads = () => (
  <RevinelProvider workspaceId="your-workspace-id">
    <AdSlot />
  </RevinelProvider>
)
```

`useTracking` takes the ad id, or anything that carries one. It records a viewable impression
with `IntersectionObserver` and tracks clicks through `getClickProps()`, including middle-click
and open-in-new-tab.

In an SSR framework (Next.js, Remix, TanStack Start), fetch the ad on the server with
`revinel` and use only `useTracking` on the client.

- **Multiple slots:** use one `useAds({ count: n })`, for the same reason as `getAds`.
- **Ads that never remount** (a banner above the router outlet): impressions fire once per ad
  id. Pass `useTracking(ad, { resetKey: pathname })` to record one impression per page view.
- **Your own ref:** pass it as `useTracking(ad?.id, { ref })` and `impressionRef` composes it
  in, so the element still takes a single ref. Object and callback refs both work.

## Tier selector

The tier selector is the "Subscribe to advertise" widget. Visitors pick a plan and pay through
Stripe. It renders as an iframe that sizes itself, inline or as a modal.

### React

Inside a `RevinelProvider`, the widget needs no configuration:

```tsx
import { TierSelector, TierSelectorDialog } from "revinel/react"

<TierSelector onCheckout={({ tierPriceId }) => {}} />

const [open, setOpen] = useState(false)
<TierSelectorDialog open={open} onClose={() => setOpen(false)} />
```

Outside a provider, pass `workspaceId` directly. To build your own pricing UI, use `useTiers()`
and `useCheckout()`. `redirectToCheckout({ tierPriceId })` creates the session and sends the
visitor to Stripe.

### Vanilla JavaScript

```ts
import { mountTierSelector, openTierSelector } from "revinel/browser"

const widget = mountTierSelector({
  workspaceId: "your-workspace-id",
  container: "#revinel-tiers", // a CSS selector or an Element
  theme: "auto", // "auto" | "light" | "dark"
  onCheckout: ({ tierPriceId }) => {},
})

widget.updateConfig({ theme: "dark" })
widget.destroy()

// A native <dialog> with focus trap, Escape and backdrop handled for you.
openTierSelector({ workspaceId: "your-workspace-id", onClose: () => {} })
```

Both take `onReady`, `onCheckout({ tierPriceId })` and `onError({ message })`, and the modal also
takes `onClose`. `onCheckout` fires just before the redirect to Stripe. There is no "completed"
event, because the checkout redirect replaces the page. Revinel delivers subscription state to
your account by webhook.

### Script tag

No bundler needed. Add the hosted script and mark any element to open the modal:

```html
<button data-revinel-tier-selector data-revinel-workspace-id="your-workspace-id">
  Advertise with us
</button>
<script async src="https://app.revinel.com/embed.js"></script>
```

The script also exposes `window.Revinel.init({ workspaceId, container })` and
`window.Revinel.open({ workspaceId })`. The **Embed** page in the Revinel dashboard has a
ready-to-paste snippet with your workspace id.

## Checkout

Start a Stripe Checkout session for a tier price and send the visitor to its `url`:

```ts
const { url } = await revinel.createCheckout({
  tierPriceId: tier.prices[0].id,
  email: "sponsor@example.com", // optional pre-fill
  cancelUrl: "https://your-site.com/advertise",
  metadata: { attribution_id: "attr_123" }, // optional, your own keys
})
```

Revinel writes `metadata` to the Checkout session and to the subscription on your connected
Stripe account, so every renewal invoice carries it. Values must be strings. You can send up to
47 keys, each key up to 40 characters and each value up to 500 characters. The keys
`workspaceId`, `tierId` and `tierPriceId` are reserved. A request that breaks a limit answers
422 and creates no session.

## Documentation

Guides and the full API reference: **[revinel.com/docs](https://revinel.com/docs)**.
