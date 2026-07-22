import { describe, expect, it } from "vitest";
import type { CraftCalculation } from "@core/domain/entities/CraftCostNode";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import { asBaseItemId, type Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import type { BlackMarketOpportunity } from "../types";
import type { BlackMarketCraftingEconomics } from "./blackMarketCraftingComparison";
import {
  buildSuggestedManufacturingOrder,
  consolidateBatchMaterials,
  groupBatchMaterialsByCity,
  resolveBatchPlannerLine,
  type BatchPlannerSelection,
} from "./blackMarketBatchPlanner";

const E0 = 0 as EnchantmentLevel;
const SWORD = asBaseItemId("T4_MAIN_SWORD");
const BAR = asBaseItemId("T4_METALBAR");
const LEATHER = asBaseItemId("T4_LEATHER");
const COMPONENT = asBaseItemId("T4_COMPONENT");

function item(
  id: ReturnType<typeof asBaseItemId>,
  name: string,
  recipe: Item["recipe"],
  category: Item["category"] = "other",
): Item {
  return {
    id,
    name,
    tier: 4,
    category,
    maxEnchantment: E0,
    itemValue: 1,
    recipe,
  };
}

function repository(items: readonly Item[]): ItemRepository {
  const byId = new Map(items.map((entry) => [entry.id, entry]));
  return {
    getById: (id) => byId.get(id) ?? null,
    getAll: (category) =>
      category ? items.filter((entry) => entry.category === category) : items,
    searchByName: (query) =>
      items.filter((entry) =>
        entry.name.toLowerCase().includes(query.toLowerCase()),
      ),
  };
}

function opportunity(): BlackMarketOpportunity {
  return {
    id: "T4_MAIN_SWORD:bridgewatch:q1:bmq1",
    itemIdentifier: "T4_MAIN_SWORD",
    tier: 4,
    enchantment: 0,
    category: "weapon",
    purchaseMarketKey: "bridgewatch",
    purchaseQuality: 1,
    purchaseUnitPrice: 100,
    purchasePriceDate: "2026-07-21T12:00:00Z",
    purchaseAgeMinutes: 5,
    purchaseBuyUnitPrice: 95,
    purchaseHistoryObservations7d: 10,
    purchaseHistoryVolume7d: 200,
    purchaseMedianPrice7d: 100,
    blackMarketQuality: 1,
    blackMarketBuyUnitPrice: 160,
    blackMarketBuyPriceDate: "2026-07-21T12:00:00Z",
    blackMarketAgeMinutes: 5,
    blackMarketHistoryObservations7d: 12,
    blackMarketHistoryVolume7d: 240,
    blackMarketMedianPrice7d: 155,
    blackMarketSellUnitPrice: 170,
    blackMarketSellPriceDate: "2026-07-21T12:00:00Z",
    blackMarketOrderDifference: 10,
    estimatedSalesTax: 6,
    transportCostPerUnit: 10,
    netUnitRevenue: 154,
    profit: 44,
    marginPercent: 28.5,
    returnOnCostPercent: 40,
    breakEvenUnitPrice: 115,
    caerleonCompetition: {
      available: false,
      purchaseUnitPrice: null,
      purchaseQuality: null,
      purchasePriceDate: null,
      ageMinutes: null,
      profit: null,
      canFillProfitably: false,
    },
    risk: "low",
    riskReasons: [],
  };
}

function economics(overrides: Partial<BlackMarketCraftingEconomics> = {}) {
  return {
    isComplete: true,
    quantity: 3,
    grossMaterialCost: 1_500,
    recoveredMaterialValue: 200,
    netMaterialCost: 1_300,
    stationFees: 100,
    effectiveCraftCost: 1_400,
    targetQuality: 1,
    qualityIncreasePercent: 0,
    qualitySuccessProbability: 1,
    expectedTargetUnits: 3,
    expectedAlternativeUnits: 0,
    nominalGrossRevenue: 2_000,
    expectedGrossRevenue: 2_000,
    expectedTargetRevenue: 2_000,
    expectedAlternativeRevenue: 0,
    estimatedSalesTax: 80,
    expectedNetRevenue: 1_920,
    materialTransportCostTotal: 0,
    finishedTransportCostTotal: 0,
    escortCostTotal: 0,
    directLogisticsCostTotal: 0,
    accountingInvestment: 1_400,
    accountingProfit: 520,
    accountingProfitPerUnit: 173.33,
    returnOnCostPercent: 37.14,
    focusRequired: 0,
    focusValuePerPoint: 0,
    focusOpportunityCost: 0,
    deathProbabilityRate: 0,
    expectedDeathLoss: 0,
    timeCostTotal: 0,
    economicCostTotal: 1_400,
    adjustedProfit: 520,
    adjustedProfitPerUnit: 173.33,
    adjustedReturnOnCostPercent: 37.14,
    buyFinishedProfit: 132,
    advantageOverBuying: 388,
    ...overrides,
  } satisfies BlackMarketCraftingEconomics;
}

function calculation(): CraftCalculation {
  return {
    root: {
      itemId: SWORD,
      enchantment: E0,
      quantity: 10,
      totalCost: 10_000,
      unitCost: 1_000,
      isManualPrice: false,
      priceSource: null,
      hasValidPrice: true,
      returnRate: {
        grossQuantity: 2_000,
        returnRate: 0.2,
        returnedQuantity: 400,
        netQuantity: 1_600,
      },
      recipeOptionIndex: 0,
      children: [
        {
          itemId: BAR,
          enchantment: E0,
          quantity: 16,
          totalCost: 1_600,
          unitCost: 100,
          isManualPrice: true,
          priceSource: "automatic",
          hasValidPrice: true,
          returnRate: null,
          recipeOptionIndex: null,
          children: [],
        },
        {
          itemId: LEATHER,
          enchantment: E0,
          quantity: 8,
          totalCost: 400,
          unitCost: 50,
          isManualPrice: true,
          priceSource: "automatic",
          hasValidPrice: true,
          returnRate: null,
          recipeOptionIndex: null,
          children: [],
        },
      ],
    },
    totalStationFees: 0,
    stationUsageFee: 0,
    stationFeeBreakdown: {} as CraftCalculation["stationFeeBreakdown"],
    focusCostBreakdown: {} as CraftCalculation["focusCostBreakdown"],
    totalMaterialCost: 10_000,
    grandTotal: 10_000,
    totalSilverSavedByReturnRate: 3_200,
    returnedMaterials: [
      {
        itemId: BAR,
        enchantment: E0,
        grossQuantity: 160,
        returnedQuantity: 32,
        netQuantity: 128,
        silverValue: 3_200,
      },
    ],
    missingPriceItems: [],
    missingPriceCount: 0,
    isComplete: true,
  };
}

const selection: BatchPlannerSelection = {
  itemId: SWORD,
  enchantment: E0,
  quality: 1,
  quantity: 3,
};

describe("batch planner economics", () => {
  it("scales finished-item profit, ROI and capital by the requested quantity", () => {
    const current = opportunity();
    const result = resolveBatchPlannerLine({
      selection,
      opportunity: current,
      recommendation: {
        kind: "buy-finished",
        label: "Comprar y transportar",
        profit: 132,
        returnOnCostPercent: 40,
        advantageOverBuying: 0,
      },
      withoutFocus: economics(),
      withFocus: economics(),
      withoutFocusCalculation: calculation(),
      withFocusCalculation: calculation(),
    });

    expect(result.profit).toBe(132);
    expect(result.returnOnCostPercent).toBe(40);
    expect(result.capitalRequired).toBe(330);
    expect(result.confidence).toBe("high");
    expect(result.calculation).toBeNull();
  });

  it("uses adjusted crafting profit, ROI and direct accounting investment", () => {
    const crafted = economics({
      adjustedProfit: 600,
      adjustedReturnOnCostPercent: 42.5,
      accountingInvestment: 1_500,
    });
    const result = resolveBatchPlannerLine({
      selection,
      opportunity: opportunity(),
      recommendation: {
        kind: "craft-with-focus",
        label: "Fabricar con foco",
        profit: 600,
        returnOnCostPercent: 42.5,
        advantageOverBuying: 468,
      },
      withoutFocus: economics(),
      withFocus: crafted,
      withoutFocusCalculation: calculation(),
      withFocusCalculation: calculation(),
    });

    expect(result.profit).toBe(600);
    expect(result.returnOnCostPercent).toBe(42.5);
    expect(result.capitalRequired).toBe(1_500);
    expect(result.calculation).not.toBeNull();
  });
});

describe("batch planner shopping list", () => {
  const repo = repository([
    item(
      SWORD,
      "Espada",
      {
        tiers: [
          {
            enchantment: E0,
            station: "warrior_forge",
            ingredients: [
              { itemId: BAR, enchantment: E0, quantity: 16 },
              { itemId: LEATHER, enchantment: E0, quantity: 8 },
            ],
            outputQuantity: 1,
            silverFee: 0,
            craftingFocus: 0,
            upgradeFrom: null,
          },
        ],
      },
      "weapon",
    ),
    item(BAR, "Lingote", null, "refined_resource"),
    item(LEATHER, "Cuero", null, "refined_resource"),
  ]);

  it("consolidates gross, recovered and effective material quantities", () => {
    const craftedLine = resolveBatchPlannerLine({
      selection: { ...selection, quantity: 10 },
      opportunity: opportunity(),
      recommendation: {
        kind: "craft-with-focus",
        label: "Fabricar con foco",
        profit: 1_000,
        returnOnCostPercent: 20,
        advantageOverBuying: 500,
      },
      withoutFocus: economics(),
      withFocus: economics(),
      withoutFocusCalculation: calculation(),
      withFocusCalculation: calculation(),
    });
    const materials = consolidateBatchMaterials(
      [craftedLine],
      repo,
      new Map([
        ["T4_METALBAR@0", { city: "bridgewatch", unitPrice: 100 }],
        ["T4_LEATHER@0", { city: "martlock", unitPrice: 50 }],
      ]),
    );

    expect(materials).toHaveLength(2);
    expect(materials.find((entry) => entry.itemId === BAR)).toMatchObject({
      grossQuantity: 160,
      recoveredQuantity: 32,
      effectiveQuantity: 128,
      city: "bridgewatch",
    });
    expect(materials.find((entry) => entry.itemId === LEATHER)).toMatchObject({
      grossQuantity: 80,
      recoveredQuantity: 0,
      effectiveQuantity: 80,
      city: "martlock",
    });
  });

  it("groups the consolidated purchase list by cheapest city", () => {
    const groups = groupBatchMaterialsByCity([
      {
        key: "T4_METALBAR@0",
        itemId: BAR,
        enchantment: E0,
        name: "Lingote",
        grossQuantity: 160,
        recoveredQuantity: 32,
        effectiveQuantity: 128,
        unitPrice: 100,
        city: "bridgewatch",
        estimatedWeight: 12.8,
      },
      {
        key: "T4_LEATHER@0",
        itemId: LEATHER,
        enchantment: E0,
        name: "Cuero",
        grossQuantity: 80,
        recoveredQuantity: 0,
        effectiveQuantity: 80,
        unitPrice: 50,
        city: "martlock",
        estimatedWeight: 8,
      },
    ]);

    expect(groups.map((group) => group.city)).toEqual([
      "bridgewatch",
      "martlock",
    ]);
    expect(groups[0]?.materials[0]?.effectiveQuantity).toBe(128);
  });
});

describe("batch planner manufacturing order", () => {
  it("places selected dependencies before the objects that consume them", () => {
    const componentItem = item(COMPONENT, "Componente", null, "other");
    const swordItem = item(
      SWORD,
      "Espada",
      {
        tiers: [
          {
            enchantment: E0,
            station: "warrior_forge",
            ingredients: [
              { itemId: COMPONENT, enchantment: E0, quantity: 2 },
            ],
            outputQuantity: 1,
            silverFee: 0,
            craftingFocus: 0,
            upgradeFrom: null,
          },
        ],
      },
      "weapon",
    );
    const repo = repository([swordItem, componentItem]);
    const order = buildSuggestedManufacturingOrder(
      [
        selection,
        { itemId: COMPONENT, enchantment: E0, quality: 1, quantity: 6 },
      ],
      repo,
    );

    expect(order.map((step) => step.itemId)).toEqual([COMPONENT, SWORD]);
  });
});
