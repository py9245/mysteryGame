import type { EntityId, IsoTimestamp } from "./game";

export interface AccountStatsSummary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  bestRank: number | null;
  averageRank: number | null;
  hostedRooms: number;
  solvedCount: number;
}

export interface AccountGameHistoryItem {
  id: EntityId;
  gameId: EntityId | null;
  roomId: EntityId | null;
  roomCode: string | null;
  finalRank: number | null;
  isWinner: boolean;
  totalScore: number | null;
  solvedCount: number;
  bonusKeywordCount: number;
  createdAt: IsoTimestamp;
}

export interface AccountProfileView {
  accountId: EntityId;
  email: string;
  age: number;
  nickname: string;
  createdAt: IsoTimestamp;
  lastLoginAt: IsoTimestamp | null;
  stats: AccountStatsSummary;
  recentResults: AccountGameHistoryItem[];
}

export interface RegisterAccountRequest {
  email: string;
  password: string;
  nickname: string;
  age?: number;
}

export interface LoginAccountRequest {
  email: string;
  password: string;
}

export interface UpdateNicknameRequest {
  nickname: string;
}

export interface AccountViewerResponse {
  viewer: AccountProfileView;
}

export interface GuestProfileView {
  nickname: string;
  updatedAt: IsoTimestamp | null;
}

export type CurrentViewer =
  | {
      kind: "account";
      nickname: string;
      account: AccountProfileView;
    }
  | {
      kind: "guest";
      nickname: string;
      guest: GuestProfileView;
    };

export interface CurrentViewerResponse {
  viewer: CurrentViewer | null;
}

export type ViewerSession = CurrentViewerResponse;
