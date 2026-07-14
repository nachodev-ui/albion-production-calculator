export type AlbionServer = 'americas' | 'europe' | 'asia'

export interface AlbionPlayerSearchResult {
  readonly server: AlbionServer
  readonly playerId: string
  readonly playerName: string
  readonly guildName?: string | null
  readonly allianceName?: string | null
  readonly killFame: number
  readonly deathFame: number
  readonly fameRatio: number
}

export interface AlbionPlayerProfile {
  readonly id: string
  readonly server: AlbionServer
  readonly playerId: string
  readonly playerName: string
  readonly guildName?: string | null
  readonly allianceName?: string | null
  readonly verificationStatus: 'unverified' | 'verified'
  readonly killFame: number
  readonly deathFame: number
  readonly fameRatio: number
  readonly linkedAt: string
  readonly lastRefreshedAt?: string | null
  readonly lastRefreshAttemptAt?: string | null
  readonly lastRefreshStatus: 'pending' | 'ok' | 'error'
  readonly lastRefreshError?: string | null
}

export interface AlbionProfileSummary {
  readonly recentKills: number
  readonly recentDeaths: number
  readonly recentFightCount: number
  readonly kdRatio?: number | null
  readonly killFame: number
  readonly deathFame: number
  readonly fameRatio: number
}

export interface AlbionProfileEvent {
  readonly eventId: number
  readonly occurredAt: string
  readonly result: 'kill' | 'death'
  readonly opponentName: string
  readonly opponentGuild?: string | null
  readonly killFame: number
  readonly playerItemPower: number
  readonly opponentItemPower: number
  readonly weaponType?: string | null
  readonly participantCount: number
  readonly groupMemberCount: number
}

export interface AlbionProfileResponse {
  readonly profile: AlbionPlayerProfile
  readonly summary: AlbionProfileSummary
  readonly events: readonly AlbionProfileEvent[]
}
