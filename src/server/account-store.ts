import { createHash, randomBytes } from "node:crypto";
import type {
  AccountGameHistoryItem,
  AccountProfileView,
  AccountStatsSummary,
} from "@/contracts/account";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { nowUtcIso } from "@/server/time";
import { hashPassword, verifyPassword } from "./auth-password";

export const SESSION_COOKIE_NAME = "mt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type DbUserAccountRow = {
  id: string;
  email: string;
  password_hash: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbUserProfileRow = {
  account_id: string;
  age: number;
  nickname: string;
  created_at: string;
  updated_at: string;
};

type DbUserSessionRow = {
  id: string;
  account_id: string;
  token_hash: string;
  expires_at: string;
  last_seen_at: string | null;
  created_at: string;
};

type DbAccountGameResultRow = {
  id: string;
  account_id: string;
  game_id: string | null;
  room_id: string | null;
  final_rank: number | null;
  is_winner: boolean;
  total_score: number | null;
  solved_count: number;
  bonus_keyword_count: number;
  created_at: string;
  rooms?: { code: string } | { code: string }[] | null;
};

type DbPlayerStatRow = {
  role: "host" | "player" | "admin" | "observer";
  solved_count: number;
};

export interface AccountGameResultInput {
  accountId: string;
  gameId: string;
  roomId: string;
  finalRank: number;
  isWinner: boolean;
  totalScore: number;
  solvedCount: number;
  bonusKeywordCount: number;
}

export class AccountAuthError extends Error {
  constructor(
    public readonly code:
      | "EMAIL_TAKEN"
      | "INVALID_CREDENTIALS"
      | "SESSION_NOT_FOUND"
      | "ACCOUNT_NOT_FOUND"
      | "UNAUTHORIZED",
    message: string,
  ) {
    super(message);
    this.name = "AccountAuthError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeNickname(nickname: string): string {
  return nickname.trim();
}

function normalizePassword(password: string): string {
  return password.trim();
}

function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function addSecondsToIso(isoTimestamp: string, seconds: number): string {
  return new Date(Date.parse(isoTimestamp) + seconds * 1000).toISOString();
}

function isSessionExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

function validateEmail(email: string): boolean {
  return email.length >= 5 && email.includes("@") && email.includes(".");
}

function validateNickname(nickname: string): boolean {
  return nickname.length >= 2 && nickname.length <= 20;
}

function normalizeAge(age: number | null | undefined): number {
  if (typeof age !== "number" || !Number.isFinite(age)) {
    return 0;
  }

  const normalized = Math.floor(age);
  return normalized >= 0 ? normalized : 0;
}

function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 72;
}

async function getAccountRowById(accountId: string): Promise<DbUserAccountRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle<DbUserAccountRow>();

  if (error) {
    throw new Error(`Failed to load account: ${error.message}`);
  }

  return data;
}

async function getAccountRowByEmail(email: string): Promise<DbUserAccountRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("email", email)
    .maybeSingle<DbUserAccountRow>();

  if (error) {
    throw new Error(`Failed to load account by email: ${error.message}`);
  }

  return data;
}

async function getProfileRowByAccountId(accountId: string): Promise<DbUserProfileRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle<DbUserProfileRow>();

  if (error) {
    throw new Error(`Failed to load account profile: ${error.message}`);
  }

  return data;
}

async function getAccountStats(accountId: string): Promise<AccountStatsSummary> {
  const supabase = getSupabaseAdminClient();
  const [
    { data: gameResults, error: gameResultsError },
    { data: playerStats, error: playerStatsError },
  ] = await Promise.all([
    supabase
      .from("account_game_results")
      .select("*")
      .eq("account_id", accountId)
      .returns<DbAccountGameResultRow[]>(),
    supabase
      .from("players")
      .select("role, solved_count")
      .eq("account_id", accountId)
      .returns<DbPlayerStatRow[]>(),
  ]);

  if (gameResultsError) {
    throw new Error(`Failed to load account game results: ${gameResultsError.message}`);
  }

  if (playerStatsError) {
    throw new Error(`Failed to load player aggregates: ${playerStatsError.message}`);
  }

  const results = gameResults ?? [];
  const playerRows = playerStats ?? [];
  const gamesPlayed = results.length;
  const wins = results.filter((result) => result.is_winner).length;
  const losses = gamesPlayed - wins;
  const rankedResults = results.filter(
    (result) => typeof result.final_rank === "number",
  );
  const bestRank =
    rankedResults.length > 0
      ? Math.min(...rankedResults.map((result) => result.final_rank as number))
      : null;
  const averageRank =
    rankedResults.length > 0
      ? Number(
          (
            rankedResults.reduce(
              (sum, result) => sum + (result.final_rank as number),
              0,
            ) / rankedResults.length
          ).toFixed(2),
        )
      : null;

  return {
    gamesPlayed,
    wins,
    losses,
    winRate: gamesPlayed > 0 ? Number(((wins / gamesPlayed) * 100).toFixed(1)) : 0,
    bestRank,
    averageRank,
    hostedRooms: playerRows.filter((row) => row.role === "host").length,
    solvedCount: playerRows.reduce((sum, row) => sum + row.solved_count, 0),
  };
}

async function getRecentResults(
  accountId: string,
  limit = 10,
): Promise<AccountGameHistoryItem[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("account_game_results")
    .select("*, rooms(code)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DbAccountGameResultRow[]>();

  if (error) {
    throw new Error(`Failed to load recent account results: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    gameId: row.game_id,
    roomId: row.room_id,
    roomCode:
      row.rooms && !Array.isArray(row.rooms) ? row.rooms.code : null,
    finalRank: row.final_rank,
    isWinner: row.is_winner,
    totalScore: row.total_score,
    solvedCount: row.solved_count,
    bonusKeywordCount: row.bonus_keyword_count,
    createdAt: row.created_at,
  }));
}

export async function upsertAccountGameResults(
  results: AccountGameResultInput[],
): Promise<void> {
  if (results.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("account_game_results")
    .upsert(
      results.map((result) => ({
        account_id: result.accountId,
        game_id: result.gameId,
        room_id: result.roomId,
        final_rank: result.finalRank,
        is_winner: result.isWinner,
        total_score: result.totalScore,
        solved_count: result.solvedCount,
        bonus_keyword_count: result.bonusKeywordCount,
      })),
      {
        onConflict: "account_id,game_id",
      },
    );

  if (error) {
    throw new Error(`Failed to persist account game results: ${error.message}`);
  }
}

export async function getAccountProfileView(
  accountId: string,
): Promise<AccountProfileView | null> {
  const [account, profile] = await Promise.all([
    getAccountRowById(accountId),
    getProfileRowByAccountId(accountId),
  ]);

  if (!account || !profile) {
    return null;
  }

  const [stats, recentResults] = await Promise.all([
    getAccountStats(accountId),
    getRecentResults(accountId),
  ]);

  return {
    accountId: account.id,
    email: account.email,
    age: profile.age,
    nickname: profile.nickname,
    createdAt: account.created_at,
    lastLoginAt: account.last_login_at,
    stats,
    recentResults,
  };
}

export async function registerAccount(input: {
  email: string;
  password: string;
  nickname: string;
  age?: number;
}): Promise<AccountProfileView> {
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);
  const nickname = normalizeNickname(input.nickname);
  const age = normalizeAge(input.age);

  if (!validateEmail(email)) {
    throw new Error("올바른 이메일 형식이 필요합니다.");
  }

  if (!validatePassword(password)) {
    throw new Error("비밀번호는 8자 이상 72자 이하로 입력해야 합니다.");
  }

  if (!validateNickname(nickname)) {
    throw new Error("닉네임은 2자 이상 20자 이하로 입력해야 합니다.");
  }

  const existingAccount = await getAccountRowByEmail(email);
  if (existingAccount) {
    throw new AccountAuthError("EMAIL_TAKEN", "이미 사용 중인 이메일입니다.");
  }

  const passwordHash = await hashPassword(password);
  const supabase = getSupabaseAdminClient();
  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .insert({
      email,
      password_hash: passwordHash,
    })
    .select("*")
    .single<DbUserAccountRow>();

  if (accountError || !account) {
    throw new Error(`Failed to create account: ${accountError?.message ?? "unknown error"}`);
  }

  const { error: profileError } = await supabase.from("user_profiles").insert({
    account_id: account.id,
    age,
    nickname,
  });

  if (profileError) {
    throw new Error(`Failed to create account profile: ${profileError.message}`);
  }

  const profileView = await getAccountProfileView(account.id);

  if (!profileView) {
    throw new Error("회원가입은 완료됐지만 프로필을 불러오지 못했습니다.");
  }

  return profileView;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AccountProfileView> {
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);
  const account = await getAccountRowByEmail(email);

  if (!account) {
    throw new AccountAuthError(
      "INVALID_CREDENTIALS",
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  }

  const verified = await verifyPassword(password, account.password_hash);

  if (!verified) {
    throw new AccountAuthError(
      "INVALID_CREDENTIALS",
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error: updateError } = await supabase
    .from("user_accounts")
    .update({
      last_login_at: nowUtcIso(),
      updated_at: nowUtcIso(),
    })
    .eq("id", account.id);

  if (updateError) {
    throw new Error(`Failed to update last login timestamp: ${updateError.message}`);
  }

  const profileView = await getAccountProfileView(account.id);

  if (!profileView) {
    throw new Error("로그인은 완료됐지만 프로필을 불러오지 못했습니다.");
  }

  return profileView;
}

export async function createSessionForAccount(
  accountId: string,
): Promise<{ token: string; expiresAt: string }> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = addSecondsToIso(nowUtcIso(), SESSION_TTL_SECONDS);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("user_sessions").insert({
    account_id: accountId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    last_seen_at: nowUtcIso(),
  });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return { token, expiresAt };
}

async function getSessionRowByToken(
  token: string,
): Promise<DbUserSessionRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("token_hash", hashSessionToken(token))
    .maybeSingle<DbUserSessionRow>();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }

  return data;
}

export async function revokeSession(token: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .eq("token_hash", hashSessionToken(token));

  if (error) {
    throw new Error(`Failed to revoke session: ${error.message}`);
  }
}

export async function getAuthenticatedAccountByToken(
  token: string,
): Promise<AccountProfileView | null> {
  const session = await getSessionRowByToken(token);

  if (!session) {
    return null;
  }

  if (isSessionExpired(session.expires_at)) {
    await revokeSession(token);
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { error: updateError } = await supabase
    .from("user_sessions")
    .update({
      last_seen_at: nowUtcIso(),
    })
    .eq("id", session.id);

  if (updateError) {
    throw new Error(`Failed to refresh session activity: ${updateError.message}`);
  }

  return getAccountProfileView(session.account_id);
}

export async function updateAccountNickname(
  accountId: string,
  nickname: string,
): Promise<AccountProfileView> {
  const normalizedNickname = normalizeNickname(nickname);

  if (!validateNickname(normalizedNickname)) {
    throw new Error("닉네임은 2자 이상 20자 이하로 입력해야 합니다.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      nickname: normalizedNickname,
      updated_at: nowUtcIso(),
    })
    .eq("account_id", accountId);

  if (error) {
    throw new Error(`Failed to update nickname: ${error.message}`);
  }

  const profileView = await getAccountProfileView(accountId);

  if (!profileView) {
    throw new Error("프로필 수정 후 계정 정보를 불러오지 못했습니다.");
  }

  return profileView;
}
