from pathlib import Path

path = Path('src/features/refining-calculator/components/RefiningCalculatorPage.tsx')
text = path.read_text(encoding='utf-8')
panel_marker = '          <Panel eyebrow="3 · Mercado" title="Dónde comprar y dónde vender">'
controls_marker = '            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">'
status_marker = '            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">'

panel_start = text.index(panel_marker)
controls_start = text.index(controls_marker, panel_start)
status_start = text.index(status_marker, controls_start)

new_layout = '''            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Servidor">
                <select
                  value={market.config.server}
                  onChange={(event) =>
                    market.setConfig({ server: event.target.value as AlbionServer })
                  }
                  className={INPUT_CLASS}
                >
                  {Object.entries(MARKET_SERVER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Estado Premium"
                hint="Premium no cambia el RRR; aquí solo ajusta el impuesto de venta."
              >
                <select
                  value={isPremium ? 'premium' : 'standard'}
                  onChange={(event) => setIsPremium(event.target.value === 'premium')}
                  className={INPUT_CLASS}
                >
                  <option value="premium">Premium · impuesto 4%</option>
                  <option value="standard">Sin Premium · impuesto 8%</option>
                </select>
              </Field>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex -space-x-3">
                    <ItemIcon
                      itemId={recipe.rawItemId}
                      enchantment={recipe.rawEnchantment}
                      name={rawName}
                      size={56}
                      priority="high"
                      className="rounded-lg border-border bg-bg/70"
                    />
                    {recipe.previousRefinedItemId && (
                      <ItemIcon
                        itemId={recipe.previousRefinedItemId}
                        enchantment={recipe.previousRefinedEnchantment}
                        name={previousName}
                        size={56}
                        priority="high"
                        className="rounded-lg border-border bg-bg/70"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-faint">
                      Compra de materiales
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      Origen de los materiales
                    </p>
                    <p className="text-[11px] text-text-faint">
                      Elige la ciudad y el tipo de compra antes de revisar los precios.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ciudad de compra"
                    hint="Mercado donde buscarás el recurso crudo y el refinado previo."
                  >
                    <select
                      value={market.config.purchaseCity}
                      onChange={(event) =>
                        market.setConfig({
                          purchaseCity: event.target.value as RefiningCityId,
                        })
                      }
                      className={INPUT_CLASS}
                    >
                      {REFINING_CITIES.map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {REFINING_CITY_LABELS[candidate]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cómo comprar">
                    <select
                      value={market.config.purchaseStrategy}
                      onChange={(event) =>
                        market.setConfig({
                          purchaseStrategy: event.target.value as PurchaseStrategy,
                        })
                      }
                      className={INPUT_CLASS}
                    >
                      {Object.entries(PURCHASE_STRATEGY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                  <PriceField
                    label={`Compra: ${rawName}`}
                    manualValue={manualRawPrice}
                    automaticDetail={automaticRawDetail}
                    loading={market.status === 'loading'}
                    onChange={setManualRawPrice}
                  />
                  {recipe.previousRefinedItemId && (
                    <PriceField
                      label={`Compra: ${previousName}`}
                      manualValue={manualPreviousPrice}
                      automaticDetail={automaticPreviousDetail}
                      loading={market.status === 'loading'}
                      onChange={setManualPreviousPrice}
                    />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-accent-border bg-accent-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-accent-border/50 pb-4">
                  <ItemIcon
                    itemId={recipe.outputItemId}
                    enchantment={recipe.outputEnchantment}
                    name={outputName}
                    size={64}
                    priority="high"
                    className="rounded-lg bg-bg/45"
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
                      Venta del refinado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      Destino del refinado
                    </p>
                    <p className="text-[11px] text-text-faint">
                      Elige la ciudad y la estrategia de venta del producto terminado.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ciudad de venta"
                    hint="Mercado donde venderás el recurso refinado terminado."
                  >
                    <select
                      value={market.config.saleCity}
                      onChange={(event) =>
                        market.setConfig({
                          saleCity: event.target.value as RefiningCityId,
                        })
                      }
                      className={INPUT_CLASS}
                    >
                      {REFINING_CITIES.map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {REFINING_CITY_LABELS[candidate]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cómo vender">
                    <select
                      value={market.config.saleStrategy}
                      onChange={(event) =>
                        market.setConfig({
                          saleStrategy: event.target.value as SaleStrategy,
                        })
                      }
                      className={INPUT_CLASS}
                    >
                      {Object.entries(SALE_STRATEGY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-5 border-t border-accent-border/50 pt-5">
                  <PriceField
                    label={`Venta: ${outputName}`}
                    manualValue={manualOutputPrice}
                    automaticDetail={market.automaticSalePriceDetail}
                    loading={market.status === 'loading'}
                    onChange={setManualOutputPrice}
                  />
                </div>
              </section>
            </div>

'''

path.write_text(text[:controls_start] + new_layout + text[status_start:], encoding='utf-8')
