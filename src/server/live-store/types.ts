import type {
  AnswerResult,
  ChatChannel,
  ConnectionStatus,
  Game,
  PlayerRole,
  PlayerStageState,
  PrivateChatRequestStatus,
  Room,
  RoomMode,
  StageEndReason,
  StageStatus,
  QuestionJudgement,
  ScoreEvent,
} from "@/contracts/game";

export type DbRoomRow = {
  id: string;
  code: string;
  title?: string | null;
  mode?: RoomMode | null;
  password_hash?: string | null;
  stage_count?: number | null;
  status: Room["status"];
  max_players: number;
  created_at: string;
  updated_at: string;
};

export type DbPlayerRow = {
  id: string;
  room_id: string;
  account_id?: string | null;
  guest_identity?: string | null;
  nickname: string;
  role: PlayerRole;
  is_ready: boolean;
  connection_status: ConnectionStatus;
  total_score: number;
  solved_count: number;
  bonus_keyword_count: number;
  joined_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTeamSlotRow = {
  id: string;
  room_id: string;
  label: string;
  created_at: string;
  updated_at: string;
};

export type DbGameRow = {
  id: string;
  room_id: string;
  status: Game["status"];
  current_stage_number: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStageRow = {
  id: string;
  game_id: string;
  room_id: string;
  stage_number: number;
  case_key: string;
  status: StageStatus;
  briefing_started_at: string | null;
  started_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  solved_player_ids: string[];
  end_reason: StageEndReason | null;
  created_at: string;
  updated_at: string;
};

export type DbStageTeamAssignmentRow = {
  stage_id: string;
  player_id: string;
  team_slot_id: string;
  created_at: string;
};

export type DbPlayerStageStateRow = {
  stage_id: string;
  player_id: string;
  team_slot_id: string | null;
  status: PlayerStageState["status"];
  queue_joined_at: string | null;
  queue_cooldown_ends_at: string | null;
  question_count: number;
  answer_attempt_count: number;
  has_received_inactivity_penalty: boolean;
  solved_at: string | null;
  locked_at: string | null;
  updated_at: string;
};

export type DbInvestigationLockRow = {
  stage_id: string;
  room_id: string;
  locked_by_player_id: string | null;
  locked_at: string | null;
  expires_at: string | null;
  question_count: number;
  answer_attempt_count: number;
  last_released_by_player_id: string | null;
  last_released_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type DbHintRevealRow = {
  id: string;
  stage_id: string;
  hint_index: number;
  trigger_type: string;
  revealed_at: string;
};

export type DbScoreEventRow = {
  id: string;
  room_id: string;
  game_id: string;
  stage_id: string | null;
  player_id: string;
  type: ScoreEvent["type"];
  delta: number;
  quantity: number;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DbQuestionRow = {
  id: string;
  stage_id: string;
  player_id: string;
  team_slot_id: string;
  content: string;
  judgement: QuestionJudgement;
  reason_code: string;
  judged_at: string | null;
  created_at: string;
};

export type DbAnswerAttemptRow = {
  id: string;
  stage_id: string;
  player_id: string;
  team_slot_id: string;
  content: string;
  result: AnswerResult;
  matched_bonus_keywords: string[];
  missing_required_keywords: string[];
  reason_code: string;
  needs_manual_review: boolean;
  should_lock_player: boolean;
  created_at: string;
};

export type DbChatMessageRow = {
  id: string;
  room_id: string;
  stage_id: string | null;
  player_id: string;
  team_slot_id: string | null;
  channel: ChatChannel;
  content: string;
  created_at: string;
};

export type DbPrivateChatRequestRow = {
  id: string;
  stage_id: string;
  requester_player_id: string;
  target_player_id: string;
  status: PrivateChatRequestStatus;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  response_reason: string | null;
  updated_at: string;
};

export type DbAdminLogRow = {
  id: string;
  room_id: string;
  game_id: string | null;
  stage_id: string | null;
  actor_type: string;
  actor_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DbCaseLibraryRow = {
  case_key: string;
  stage_number: number;
  title: string;
  public_description: string;
  image_url: string | null;
  image_data_url: string | null;
  question: string;
  truth: string;
  required_keywords: string[];
  bonus_keywords: string[];
  accepted_answer_summary: string;
  hints: unknown;
  is_practice_pool: boolean;
  origin: string;
  review_notes: string | null;
  version: string | null;
  created_at: string;
  updated_at: string;
};

export type DbPlayerCaseHistoryRow = {
  id: string;
  identity_key: string;
  account_id: string | null;
  guest_identity: string | null;
  case_key: string;
  first_seen_at: string;
  last_played_at: string;
  play_count: number;
  solved_count: number;
  created_at: string;
  updated_at: string;
};

export type DbPrivateChatSessionRow = {
  id: string;
  stage_id: string;
  request_id: string;
  player_a_id: string;
  player_b_id: string;
  started_at: string;
  release_allowed_at: string;
  ended_at: string | null;
  closed_by_player_id: string | null;
};
