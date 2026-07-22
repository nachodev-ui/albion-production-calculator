import { calculateEffectiveFocusCost } from '@core/domain/entities/ProductionEconomy'
import type { SavedCalculation } from '@features/account/api/savedDataApi'

const SETUP_FEE_RATE = 0.025

export type EconomicServer = 'americas' | 'europe' | 'asia'

export type EconomicCity =
  | 'bridgewatch'
  | 'caerleon'
  | 'fort-sterling'
  | 'lymhurst'
  | 'martlock'
  | 'thetford'
  | 'brecilien'

export interface EconomicSpecialization {
  readonly branchKey: string
  readonly branchName: string
  readonly level: number
  readonly focusCostEfficiency: number
}

export interface EconomicProfileInput {
  readonly server: EconomicServer
  readonly premiumActive: boolean
  readonly dailyFocusBalance: number
  readonly homeCity: EconomicCity
  readonly guildHasIsland: boolean
  readonly salesTaxRate: number
  readonly transportCost: number
  readonly specializations: readonly EconomicSpecialization[]
}

export interface EconomicProfile extends EconomicProfileInput {
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SpecializationBranchOption {
  readonly key: string
  readonly label: string
  readonly pattern: RegExp
}

export const ECONOMIC_SERVER_LABELS: Readonly<Record<EconomicServer, string>> = {
  americas: 'Americas',
  europe: 'Europe',
  asia: 'Asia',
}

export const ECONOMIC_CITY_LABELS: Readonly<Record<EconomicCity, string>> = {
  bridgewatch: 'Bridgewatch',
  caerleon: 'Caerleon',
  'fort-sterling': 'Fort Sterling',
  lymhurst: 'Lymhurst',
  martlock: 'Martlock',
  thetford: 'Thetford',
  brecilien: 'Brecilien',
}

export const SPECIALIZATION_BRANCHES: readonly SpecializationBranchOption[] = [
  { key: 'bags', label: 'Bolsas', pattern: /bolsa/ },
  { key: 'capes', label: 'Capas', pattern: /capa/ },
  {
    key: 'leather-armor',
    label: 'Armaduras de cuero',
    pattern: /mercenario|cazador|asesino|acechador|espectro|demonio|tenacidad/,
  },
  {
    key: 'plate-armor',
    label: 'Armaduras de placas',
    pattern: /soldado|caballero|guardian|tumba|demoniaco|juramentado|valor/,
  },
  {
    key: 'cloth-armor',
    label: 'Armaduras de tela',
    pattern: /erudito|clerigo|mago|druida|infernal|sectario|pureza/,
  },
  {
    key: 'tools',
    label: 'Herramientas',
    pattern: /pico|hacha de lenador|hoz|cuchillo de desuello|martillo de piedra/,
  },
  { key: 'swords', label: 'Espadas', pattern: /espada|claymore/ },
  { key: 'axes', label: 'Hachas', pattern: /hacha/ },
  { key: 'maces', label: 'Mazas', pattern: /maza/ },
  { key: 'hammers', label: 'Martillos', pattern: /martillo/ },
  { key: 'spears', label: 'Lanzas', pattern: /lanza|pica/ },
  { key: 'bows', label: 'Arcos', pattern: /arco/ },
  { key: 'crossbows', label: 'Ballestas', pattern: /ballesta/ },
  { key: 'daggers', label: 'Dagas', pattern: /daga|garras/ },
  {
    key: 'quarterstaffs',
    label: 'Bastones de combate',
    pattern: /baston doble|grailseeker/,
  },
  { key: 'fire-staffs', label: 'Bastones de fuego', pattern: /fuego/ },
  { key: 'frost-staffs', label: 'Bastones de escarcha', pattern: /escarcha/ },
  { key: 'arcane-staffs', label: 'Bastones arcanos', pattern: /arcano/ },
  { key: 'holy-staffs', label: 'Bastones sagrados', pattern: /sagrado/ },
  { key: 'nature-staffs', label: 'Bastones naturales', pattern: /naturaleza/ },
  { key: 'cursed-staffs', label: 'Bastones malditos', pattern: /maldito/ },
  {
    key: 'shapeshifter-staffs',
    label: 'Bastones cambiaformas',
    pattern: /cambiaformas|prowling|primal/,
  },
  {
    key: 'offhands',
    label: 'Manos secundarias',
    pattern: /escudo|libro|tomo|orbe|antorcha/,
  },
] as const

export const DEFAULT_ECONOMIC_PROFILE: EconomicProfileInput = {
  server: 'americas',
  premiumActive: false,
  dailyFocusBalance: 10_000,
  homeCity: 'bridgewatch',
  guildHasIsland: false,
  salesTaxRate: 8,
  transportCost: 0,
  specializations: [],
}

export interface FocusRecommendation {
  readonly calculationId: string
  readonly itemName: string
  readonly tierLabel: string
  readonly branchName: string
  readonly specializationLevel: number
  readonly focusCostEfficiency: number
  readonly totalFocusRequired: number
  readonly estimatedProfit: number
  readonly profitPer10kFocus: number
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function inferSpecializationBranch(
  itemName: string,
): SpecializationBranchOption | null {
  const normalized = normalizeText(itemName)
  return SPECIALIZATION_BRANCHES.find((branch) => branch.pattern.test(normalized)) ?? null
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function buildFocusRecommendations(
  calculations: readonly SavedCalculation[],
  profile: EconomicProfileInput,
): readonly FocusRecommendation[] {
  const specializations = new Map(
    profile.specializations.map((specialization) => [
      specialization.branchKey,
      specialization,
    ]),
  )
  const taxRate = Math.min(0.99, Math.max(0, profile.salesTaxRate / 100))
  const transportCost = finiteNonNegative(profile.transportCost)

  return calculations
    .flatMap((calculation): readonly FocusRecommendation[] => {
      if (calculation.kind !== 'craft') return []

      const snapshot = calculation.snapshot
      if (
        !snapshot.isComplete ||
        !snapshot.useFocus ||
        snapshot.unitSellPrice === null ||
        snapshot.unitSellPrice <= 0 ||
        snapshot.totalFocusRequired <= 0 ||
        snapshot.baseFocusPerCraft <= 0 ||
        snapshot.effectiveFocusPerCraft <= 0 ||
        snapshot.quantity <= 0
      ) {
        return []
      }

      const branch = inferSpecializationBranch(snapshot.itemName)
      if (!branch) return []
      const specialization = specializations.get(branch.key)
      if (!specialization) return []

      const craftsNeeded = Math.max(
        1,
        Math.round(snapshot.totalFocusRequired / snapshot.effectiveFocusPerCraft),
      )
      const currentFocusPerCraft = calculateEffectiveFocusCost(
        snapshot.baseFocusPerCraft,
        specialization.focusCostEfficiency,
      )
      const totalFocusRequired = currentFocusPerCraft * craftsNeeded
      if (totalFocusRequired <= 0) return []

      const grossRevenue = snapshot.unitSellPrice * snapshot.quantity
      const feeRate = Math.min(0.99, taxRate + SETUP_FEE_RATE)
      const netRevenue = grossRevenue * (1 - feeRate)
      const estimatedProfit = netRevenue - snapshot.totalCost - transportCost
      const profitPer10kFocus = (estimatedProfit / totalFocusRequired) * 10_000

      return [
        {
          calculationId: calculation.id,
          itemName: snapshot.itemName,
          tierLabel: `T${snapshot.tier}${snapshot.enchantment > 0 ? `.${snapshot.enchantment}` : ''}`,
          branchName: branch.label,
          specializationLevel: specialization.level,
          focusCostEfficiency: specialization.focusCostEfficiency,
          totalFocusRequired,
          estimatedProfit,
          profitPer10kFocus,
        },
      ]
    })
    .sort((left, right) => right.profitPer10kFocus - left.profitPer10kFocus)
}
