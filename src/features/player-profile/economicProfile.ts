import { calculateEffectiveFocusCost } from '@core/domain/entities/ProductionEconomy'
import { SETUP_FEE_RATE } from '@features/craft-calculator/utils/profitCalculations'
import type { SavedCalculation } from '@features/account/api/savedDataApi'

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
  readonly keywords: readonly string[]
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
  { key: 'bags', label: 'Bolsas', keywords: ['bolsa', 'bag'] },
  { key: 'capes', label: 'Capas', keywords: ['capa', 'cape'] },
  {
    key: 'leather-armor',
    label: 'Armaduras de cuero',
    keywords: [
      'mercenario',
      'cazador',
      'asesino',
      'acechador',
      'espectro',
      'demonio',
      'tenacidad',
      'leather',
    ],
  },
  {
    key: 'plate-armor',
    label: 'Armaduras de placas',
    keywords: [
      'soldado',
      'caballero',
      'guardián',
      'tumba',
      'demoníaco',
      'juramentado',
      'valor',
      'plate',
    ],
  },
  {
    key: 'cloth-armor',
    label: 'Armaduras de tela',
    keywords: [
      'erudito',
      'clérigo',
      'mago',
      'druida',
      'infernal',
      'sectario',
      'pureza',
      'cloth',
    ],
  },
  { key: 'swords', label: 'Espadas', keywords: ['espada', 'sword', 'claymore'] },
  { key: 'axes', label: 'Hachas', keywords: ['hacha', 'axe'] },
  { key: 'maces', label: 'Mazas', keywords: ['maza', 'mace'] },
  { key: 'hammers', label: 'Martillos', keywords: ['martillo', 'hammer'] },
  { key: 'spears', label: 'Lanzas', keywords: ['lanza', 'spear', 'pica'] },
  { key: 'bows', label: 'Arcos', keywords: ['arco', 'bow'] },
  { key: 'crossbows', label: 'Ballestas', keywords: ['ballesta', 'crossbow'] },
  { key: 'daggers', label: 'Dagas', keywords: ['daga', 'dagger', 'garras'] },
  {
    key: 'quarterstaffs',
    label: 'Bastones de combate',
    keywords: ['bastón doble', 'baston doble', 'quarterstaff', 'grailseeker'],
  },
  { key: 'fire-staffs', label: 'Bastones de fuego', keywords: ['fuego', 'fire staff'] },
  { key: 'frost-staffs', label: 'Bastones de escarcha', keywords: ['escarcha', 'frost'] },
  { key: 'arcane-staffs', label: 'Bastones arcanos', keywords: ['arcano', 'arcane'] },
  { key: 'holy-staffs', label: 'Bastones sagrados', keywords: ['sagrado', 'holy'] },
  { key: 'nature-staffs', label: 'Bastones naturales', keywords: ['naturaleza', 'nature'] },
  { key: 'cursed-staffs', label: 'Bastones malditos', keywords: ['maldito', 'cursed'] },
  {
    key: 'shapeshifter-staffs',
    label: 'Bastones cambiaformas',
    keywords: ['cambiaformas', 'shapeshifter', 'prowling', 'primal'],
  },
  {
    key: 'offhands',
    label: 'Manos secundarias',
    keywords: ['escudo', 'libro', 'tomo', 'orbe', 'antorcha', 'off-hand', 'offhand'],
  },
  {
    key: 'tools',
    label: 'Herramientas',
    keywords: ['pico', 'hacha de leñador', 'hoz', 'cuchillo de desuello', 'martillo de piedra', 'tool'],
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
  readonly branchKey: string
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
  return (
    SPECIALIZATION_BRANCHES.find((branch) =>
      branch.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
    ) ?? null
  )
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
          branchKey: branch.key,
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
