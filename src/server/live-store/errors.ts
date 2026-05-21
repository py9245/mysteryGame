export class RoomJoinError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "ROOM_NOT_JOINABLE"
      | "ROOM_PASSWORD_REQUIRED"
      | "ROOM_PASSWORD_INVALID"
      | "ROOM_FULL"
      | "NICKNAME_TAKEN",
    message: string,
  ) {
    super(message);
    this.name = "RoomJoinError";
  }
}

export class RoomSettingsError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "ROOM_NOT_EDITABLE"
      | "INVALID_ROOM_MODE"
      | "PASSWORD_REQUIRED"
      | "ROOM_TOO_SMALL"
      | "ROOM_TOO_FULL",
    message: string,
  ) {
    super(message);
    this.name = "RoomSettingsError";
  }
}

export class LeaveRoomError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "PLAYER_NOT_FOUND"
      | "ROOM_LEAVE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "LeaveRoomError";
  }
}

export class AssignTeamsError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "GAME_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "ROOM_NOT_READY"
      | "ROOM_NOT_FULL"
      | "STAGE_NUMBER_MISMATCH"
      | "STAGE_NOT_ASSIGNABLE",
    message: string,
  ) {
    super(message);
    this.name = "AssignTeamsError";
  }
}

export class StartStageError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "GAME_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "STAGE_NOT_FOUND"
      | "STAGE_NOT_STARTABLE"
      | "ASSIGNMENTS_NOT_READY",
    message: string,
  ) {
    super(message);
    this.name = "StartStageError";
  }
}

export class AdvanceStageError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "GAME_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "STAGE_NOT_READY"
      | "FINAL_STAGE_NOT_ADVANCABLE",
    message: string,
  ) {
    super(message);
    this.name = "AdvanceStageError";
  }
}

export class InvestigationLockError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "STAGE_NOT_FOUND"
      | "PLAYER_NOT_FOUND"
      | "PLAYER_NOT_ACTIVE"
      | "LOCK_CONFLICT"
      | "LOCK_NOT_OWNED"
      | "LOCK_LIMIT_REACHED"
      | "TEAM_SLOT_MISMATCH"
      | "STAGE_NOT_ACTIVE"
      | "QUEUE_ALREADY_JOINED"
      | "QUEUE_NOT_JOINED"
      | "QUEUE_COOLDOWN_ACTIVE"
      | "LOCK_ALREADY_OWNED",
    message: string,
  ) {
    super(message);
    this.name = "InvestigationLockError";
  }
}

export class PrivateChatError extends Error {
  constructor(
    public readonly code:
      | "ROOM_NOT_FOUND"
      | "STAGE_NOT_FOUND"
      | "PLAYER_NOT_FOUND"
      | "REQUEST_NOT_FOUND"
      | "SESSION_NOT_FOUND"
      | "REQUESTER_NOT_ALLOWED"
      | "RESPONDER_NOT_ALLOWED"
      | "SESSION_NOT_ALLOWED"
      | "SAME_PLAYER"
      | "SAME_TEAM"
      | "TARGET_BUSY"
      | "REQUESTER_BUSY"
      | "REQUEST_COOLDOWN"
      | "ACTIVE_REQUEST_EXISTS"
      | "REQUEST_NOT_PENDING"
      | "REQUEST_EXPIRED"
      | "SESSION_LOCKED"
      | "STAGE_NOT_ACTIVE"
      | "PLAYER_NOT_ACTIVE",
    message: string,
  ) {
    super(message);
    this.name = "PrivateChatError";
  }
}
