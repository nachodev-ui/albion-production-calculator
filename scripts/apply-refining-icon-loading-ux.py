from pathlib import Path

component = Path('src/features/refining-calculator/components/RefiningCalculatorPage.tsx')
source = component.read_text(encoding='utf-8')


def replace_exact(old: str, new: str, *, expected: int = 1) -> None:
    global source
    count = source.count(old)
    if count != expected:
        raise SystemExit(
            f'Expected {expected} occurrence(s), found {count}: {old[:120]!r}'
        )
    source = source.replace(old, new)


replace_exact(
    "import { buildItemIconUrl, type BaseItemId } from '@core/domain/entities/Item'\n",
    "import type { BaseItemId } from '@core/domain/entities/Item'\n"
    "import { ItemIcon } from '@shared/components/ItemIcon'\n",
)
replace_exact('  readonly hint?: string\n', '  readonly hint?: ReactNode\n')

replace_exact(
    """function PriceField({
  label,
  manualValue,
  automaticDetail,
  onChange,
}: {
  readonly label: string
  readonly manualValue: number | null
  readonly automaticDetail: AutomaticMarketPriceDetail | undefined
  readonly onChange: (value: number | null) => void
}) {
  return (
    <Field
      label={label}
      hint={
        manualValue === null
          ? automaticPriceLabel(automaticDetail)
          : `Manual · automático: ${automaticPriceLabel(automaticDetail)}`
      }
    >
      <input
        type="number"
        min="0"
        step="1"
        value={manualValue ?? ''}
        placeholder={automaticDetail?.value?.toString() ?? 'Sin dato'}
        onChange={(event) => onChange(parseManualPrice(event.target.value))}
        className={INPUT_CLASS}
      />
    </Field>
  )
}
""",
    """function PriceField({
  label,
  manualValue,
  automaticDetail,
  loading,
  onChange,
}: {
  readonly label: string
  readonly manualValue: number | null
  readonly automaticDetail: AutomaticMarketPriceDetail | undefined
  readonly loading: boolean
  readonly onChange: (value: number | null) => void
}) {
  const waitingForAutomaticPrice =
    loading && manualValue === null && automaticDetail?.value == null
  const automaticHint = waitingForAutomaticPrice ? (
    <span className="inline-flex items-center gap-2" aria-live="polite">
      <span className="h-2.5 w-24 animate-pulse rounded-full bg-border" />
      Consultando precio…
    </span>
  ) : (
    automaticPriceLabel(automaticDetail)
  )

  return (
    <Field
      label={label}
      hint={
        manualValue === null ? (
          automaticHint
        ) : (
          <>Manual · automático: {automaticHint}</>
        )
      }
    >
      <input
        type="number"
        min="0"
        step="1"
        value={manualValue ?? ''}
        placeholder={
          waitingForAutomaticPrice
            ? 'Consultando…'
            : (automaticDetail?.value?.toString() ?? 'Sin dato')
        }
        aria-busy={waitingForAutomaticPrice}
        onChange={(event) => onChange(parseManualPrice(event.target.value))}
        className={INPUT_CLASS}
      />
    </Field>
  )
}
""",
)

replace_exact(
    """        <img
          src={buildItemIconUrl(rawItemId, rawEnchantment, dense ? 64 : 80)}
          alt=""
          className={`${dense ? 'h-10 w-10' : 'h-14 w-14'} rounded-lg bg-bg/45 object-contain transition-transform group-hover:scale-105`}
        />
""",
    """        <ItemIcon
          itemId={rawItemId}
          enchantment={rawEnchantment}
          name={`${label} · recurso`}
          size={dense ? 40 : 56}
          priority={selected ? 'high' : 'low'}
          className="rounded-lg bg-bg/45 transition-transform group-hover:scale-105"
        />
""",
)
replace_exact(
    """        <img
          src={buildItemIconUrl(
            outputItemId,
            outputEnchantment,
            dense ? 64 : 80,
          )}
          alt=""
          className={`${dense ? 'h-10 w-10' : 'h-14 w-14'} rounded-lg bg-bg/45 object-contain transition-transform group-hover:scale-105`}
        />
""",
    """        <ItemIcon
          itemId={outputItemId}
          enchantment={outputEnchantment}
          name={`${label} · resultado`}
          size={dense ? 40 : 56}
          priority={selected ? 'high' : 'low'}
          className="rounded-lg bg-bg/45 transition-transform group-hover:scale-105"
        />
""",
)

replace_exact(
    """            <img
              src={buildItemIconUrl(recipe.rawItemId, recipe.rawEnchantment, 80)}
              alt=""
              className="h-14 w-14 rounded-lg bg-bg/45 object-contain"
            />
""",
    """            <ItemIcon
              itemId={recipe.rawItemId}
              enchantment={recipe.rawEnchantment}
              name={rawName}
              size={56}
              priority="high"
              className="rounded-lg bg-bg/45"
            />
""",
)
replace_exact(
    """            <img
              src={buildItemIconUrl(
                recipe.outputItemId,
                recipe.outputEnchantment,
                80,
              )}
              alt=""
              className="h-14 w-14 rounded-lg bg-bg/45 object-contain"
            />
""",
    """            <ItemIcon
              itemId={recipe.outputItemId}
              enchantment={recipe.outputEnchantment}
              name={outputName}
              size={56}
              priority="high"
              className="rounded-lg bg-bg/45"
            />
""",
)

replace_exact(
    """                  <img
                    src={buildItemIconUrl(recipe.rawItemId, recipe.rawEnchantment, 96)}
                    alt=""
                    className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                  />
""",
    """                  <ItemIcon
                    itemId={recipe.rawItemId}
                    enchantment={recipe.rawEnchantment}
                    name={rawName}
                    size={64}
                    priority="high"
                    className="rounded-lg bg-bg/45"
                  />
""",
)
replace_exact(
    """                      <img
                        src={buildItemIconUrl(
                          recipe.previousRefinedItemId,
                          recipe.previousRefinedEnchantment,
                          96,
                        )}
                        alt=""
                        className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                      />
""",
    """                      <ItemIcon
                        itemId={recipe.previousRefinedItemId}
                        enchantment={recipe.previousRefinedEnchantment}
                        name={previousName}
                        size={64}
                        priority="high"
                        className="rounded-lg bg-bg/45"
                      />
""",
)
replace_exact(
    """                  <img
                    src={buildItemIconUrl(
                      recipe.outputItemId,
                      recipe.outputEnchantment,
                      96,
                    )}
                    alt=""
                    className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                  />
""",
    """                  <ItemIcon
                    itemId={recipe.outputItemId}
                    enchantment={recipe.outputEnchantment}
                    name={outputName}
                    size={64}
                    priority="high"
                    className="rounded-lg bg-bg/45"
                  />
""",
    expected=2,
)

replace_exact(
    """                    <img
                      src={buildItemIconUrl(recipe.rawItemId, recipe.rawEnchantment, 80)}
                      alt=""
                      className="h-14 w-14 rounded-lg border border-border bg-bg/70 object-contain"
                    />
""",
    """                    <ItemIcon
                      itemId={recipe.rawItemId}
                      enchantment={recipe.rawEnchantment}
                      name={rawName}
                      size={56}
                      priority="high"
                      className="rounded-lg border-border bg-bg/70"
                    />
""",
)
replace_exact(
    """                      <img
                        src={buildItemIconUrl(
                          recipe.previousRefinedItemId,
                          recipe.previousRefinedEnchantment,
                          80,
                        )}
                        alt=""
                        className="h-14 w-14 rounded-lg border border-border bg-bg/70 object-contain"
                      />
""",
    """                      <ItemIcon
                        itemId={recipe.previousRefinedItemId}
                        enchantment={recipe.previousRefinedEnchantment}
                        name={previousName}
                        size={56}
                        priority="high"
                        className="rounded-lg border-border bg-bg/70"
                      />
""",
)

replace_exact(
    """                    automaticDetail={automaticRawDetail}
                    onChange={setManualRawPrice}
""",
    """                    automaticDetail={automaticRawDetail}
                    loading={market.status === 'loading'}
                    onChange={setManualRawPrice}
""",
)
replace_exact(
    """                      automaticDetail={automaticPreviousDetail}
                      onChange={setManualPreviousPrice}
""",
    """                      automaticDetail={automaticPreviousDetail}
                      loading={market.status === 'loading'}
                      onChange={setManualPreviousPrice}
""",
)
replace_exact(
    """                    automaticDetail={market.automaticSalePriceDetail}
                    onChange={setManualOutputPrice}
""",
    """                    automaticDetail={market.automaticSalePriceDetail}
                    loading={market.status === 'loading'}
                    onChange={setManualOutputPrice}
""",
)
replace_exact(
    """              <p className="text-xs leading-relaxed text-text-faint">
                {market.status === 'loading'
""",
    """              <p
                className="text-xs leading-relaxed text-text-faint"
                aria-live="polite"
              >
                {market.status === 'loading'
""",
)

if 'buildItemIconUrl' in source:
    raise SystemExit('Refining calculator still references buildItemIconUrl')

component.write_text(source, encoding='utf-8')
Path('.github/workflows/one-time-refining-icon-ux.yml').unlink()
Path('scripts/apply-refining-icon-loading-ux.py').unlink()
