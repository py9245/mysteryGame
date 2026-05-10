import type {
  AcquireInvestigationLockRequest,
  AdvanceStageRequest,
  AssignTeamsRequest,
  ApiFailure,
  ApiResponse,
  EndPrivateChatRequest,
  GameCommandResponse,
  JoinInvestigationQueueRequest,
  ListGameSnapshotsResponse,
  LeaveInvestigationQueueRequest,
  ReleaseInvestigationLockRequest,
  RequestPrivateChatRequest,
  RespondPrivateChatRequest,
  SetReadyRequest,
  StartStageRequest,
  SubmitAnswerRequest,
  SubmitQuestionRequest,
} from "@/contracts/api";
import {
  acquireInvestigationLockInStore,
  advanceStageInStore,
  AdvanceStageError,
  assignTeamsInStore,
  AssignTeamsError,
  endPrivateChatInStore,
  InvestigationLockError,
  joinInvestigationQueueInStore,
  leaveInvestigationQueueInStore,
  listGameSnapshotsFromStore,
  PrivateChatError,
  requestPrivateChatInStore,
  releaseInvestigationLockInStore,
  respondPrivateChatInStore,
  setReadyInStore,
  submitAnswerInStore,
  submitQuestionInStore,
  startStageInStore,
  StartStageError,
} from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";
import { createPlaceholderFailure } from "../_shared/placeholder";

export const runtime = "nodejs";

function resolveAssignTeamsErrorStatus(error: AssignTeamsError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "GAME_NOT_FOUND":
      return 404;
    case "REQUESTER_NOT_ALLOWED":
      return 403;
    case "ROOM_NOT_READY":
    case "ROOM_NOT_FULL":
    case "STAGE_NUMBER_MISMATCH":
    case "STAGE_NOT_ASSIGNABLE":
      return 409;
    default:
      return 400;
  }
}

function resolveStartStageErrorStatus(error: StartStageError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "GAME_NOT_FOUND":
    case "STAGE_NOT_FOUND":
      return 404;
    case "REQUESTER_NOT_ALLOWED":
      return 403;
    case "STAGE_NOT_STARTABLE":
    case "ASSIGNMENTS_NOT_READY":
      return 409;
    default:
      return 400;
  }
}

function resolveAdvanceStageErrorStatus(error: AdvanceStageError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "GAME_NOT_FOUND":
      return 404;
    case "REQUESTER_NOT_ALLOWED":
      return 403;
    case "STAGE_NOT_READY":
    case "FINAL_STAGE_NOT_ADVANCABLE":
      return 409;
    default:
      return 400;
  }
}

function resolveInvestigationLockErrorStatus(error: InvestigationLockError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "STAGE_NOT_FOUND":
    case "PLAYER_NOT_FOUND":
      return 404;
    case "LOCK_CONFLICT":
    case "LOCK_NOT_OWNED":
    case "PLAYER_NOT_ACTIVE":
    case "LOCK_LIMIT_REACHED":
    case "TEAM_SLOT_MISMATCH":
    case "STAGE_NOT_ACTIVE":
    case "QUEUE_ALREADY_JOINED":
    case "QUEUE_NOT_JOINED":
    case "QUEUE_COOLDOWN_ACTIVE":
    case "LOCK_ALREADY_OWNED":
      return 409;
    default:
      return 400;
  }
}

function resolvePrivateChatErrorStatus(error: PrivateChatError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "STAGE_NOT_FOUND":
    case "PLAYER_NOT_FOUND":
    case "REQUEST_NOT_FOUND":
    case "SESSION_NOT_FOUND":
      return 404;
    case "REQUESTER_NOT_ALLOWED":
    case "RESPONDER_NOT_ALLOWED":
    case "SESSION_NOT_ALLOWED":
      return 403;
    case "TARGET_BUSY":
    case "REQUESTER_BUSY":
    case "REQUEST_COOLDOWN":
    case "ACTIVE_REQUEST_EXISTS":
    case "REQUEST_NOT_PENDING":
    case "REQUEST_EXPIRED":
    case "SESSION_LOCKED":
    case "STAGE_NOT_ACTIVE":
    case "PLAYER_NOT_ACTIVE":
    case "SAME_PLAYER":
    case "SAME_TEAM":
      return 409;
    default:
      return 400;
  }
}

export async function GET() {
  if (isSupabaseEnabled()) {
    try {
      const games = await listGameSnapshotsFromStore();
      const payload = {
        ok: true,
        data: { games },
      } satisfies ApiResponse<ListGameSnapshotsResponse>;

      return Response.json(payload, { status: 200 });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "GAME_LIST_FAILED",
            message: error instanceof Error ? error.message : "게임 목록을 불러오지 못했습니다.",
          },
        },
        { status: 500 },
      );
    }
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "LIVE_STORAGE_REQUIRED",
        message: "게임 목록 조회는 Supabase 런타임 설정이 필요합니다.",
      },
    } satisfies ApiResponse<ListGameSnapshotsResponse>,
    { status: 501 },
  );
}

type ValidatedGameCommand =
  | { kind: "success"; command: SetReadyRequest }
  | { kind: "success"; command: AssignTeamsRequest }
  | { kind: "success"; command: StartStageRequest }
  | { kind: "success"; command: AdvanceStageRequest }
  | { kind: "success"; command: JoinInvestigationQueueRequest }
  | { kind: "success"; command: LeaveInvestigationQueueRequest }
  | { kind: "success"; command: AcquireInvestigationLockRequest }
  | { kind: "success"; command: ReleaseInvestigationLockRequest }
  | { kind: "success"; command: SubmitQuestionRequest }
  | { kind: "success"; command: SubmitAnswerRequest }
  | { kind: "success"; command: RequestPrivateChatRequest }
  | { kind: "success"; command: RespondPrivateChatRequest }
  | { kind: "success"; command: EndPrivateChatRequest }
  | { kind: "unsupported"; requestedType: string }
  | { kind: "failure"; error: ApiFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createValidationFailure(
  message: string,
  details?: Record<string, unknown>,
): ApiFailure {
  return {
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function validateSetReadyCommand(body: Record<string, unknown>): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "set_ready",
      }),
    };
  }

  const playerId = normalizeRequiredString(body.playerId);
  if (!playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("playerId is required.", {
        field: "playerId",
        type: "set_ready",
      }),
    };
  }

  if (typeof body.isReady !== "boolean") {
    return {
      kind: "failure",
      error: createValidationFailure("isReady must be a boolean.", {
        field: "isReady",
        type: "set_ready",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "set_ready",
      roomId,
      playerId,
      isReady: body.isReady,
    },
  };
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function validateAssignTeamsCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "assign_teams",
      }),
    };
  }

  const requestedByPlayerId = normalizeRequiredString(body.requestedByPlayerId);
  if (!requestedByPlayerId) {
    return {
      kind: "failure",
      error: createValidationFailure("requestedByPlayerId is required.", {
        field: "requestedByPlayerId",
        type: "assign_teams",
      }),
    };
  }

  const stageNumber = normalizePositiveInteger(body.stageNumber);
  if (!stageNumber) {
    return {
      kind: "failure",
      error: createValidationFailure("stageNumber must be a positive integer.", {
        field: "stageNumber",
        type: "assign_teams",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "assign_teams",
      roomId,
      requestedByPlayerId,
      stageNumber,
    },
  };
}

function validateStartStageCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "start_stage",
      }),
    };
  }

  const requestedByPlayerId = normalizeRequiredString(body.requestedByPlayerId);
  if (!requestedByPlayerId) {
    return {
      kind: "failure",
      error: createValidationFailure("requestedByPlayerId is required.", {
        field: "requestedByPlayerId",
        type: "start_stage",
      }),
    };
  }

  const caseKey = normalizeRequiredString(body.caseKey);
  if (!caseKey) {
    return {
      kind: "failure",
      error: createValidationFailure("caseKey is required.", {
        field: "caseKey",
        type: "start_stage",
      }),
    };
  }

  const durationSeconds = normalizePositiveInteger(body.durationSeconds);
  if (!durationSeconds) {
    return {
      kind: "failure",
      error: createValidationFailure("durationSeconds must be a positive integer.", {
        field: "durationSeconds",
        type: "start_stage",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "start_stage",
      roomId,
      requestedByPlayerId,
      caseKey,
      durationSeconds,
    },
  };
}

function validateAdvanceStageCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "advance_stage",
      }),
    };
  }

  const requestedByPlayerId = normalizeRequiredString(body.requestedByPlayerId);
  if (!requestedByPlayerId) {
    return {
      kind: "failure",
      error: createValidationFailure("requestedByPlayerId is required.", {
        field: "requestedByPlayerId",
        type: "advance_stage",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "advance_stage",
      roomId,
      requestedByPlayerId,
    },
  };
}

function validateAcquireLockCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "acquire_lock",
      }),
    };
  }

  const stageId = normalizeRequiredString(body.stageId);
  if (!stageId) {
    return {
      kind: "failure",
      error: createValidationFailure("stageId is required.", {
        field: "stageId",
        type: "acquire_lock",
      }),
    };
  }

  const playerId = normalizeRequiredString(body.playerId);
  if (!playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("playerId is required.", {
        field: "playerId",
        type: "acquire_lock",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "acquire_lock",
      roomId,
      stageId,
      playerId,
    },
  };
}

function validateJoinLockQueueCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  const stageId = normalizeRequiredString(body.stageId);
  const playerId = normalizeRequiredString(body.playerId);

  if (!roomId || !stageId || !playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId, stageId, playerId are required.", {
        type: "join_lock_queue",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "join_lock_queue",
      roomId,
      stageId,
      playerId,
    },
  };
}

function validateLeaveLockQueueCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  const stageId = normalizeRequiredString(body.stageId);
  const playerId = normalizeRequiredString(body.playerId);

  if (!roomId || !stageId || !playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId, stageId, playerId are required.", {
        type: "leave_lock_queue",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "leave_lock_queue",
      roomId,
      stageId,
      playerId,
    },
  };
}

function validateReleaseLockCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "release_lock",
      }),
    };
  }

  const stageId = normalizeRequiredString(body.stageId);
  if (!stageId) {
    return {
      kind: "failure",
      error: createValidationFailure("stageId is required.", {
        field: "stageId",
        type: "release_lock",
      }),
    };
  }

  const playerId = normalizeRequiredString(body.playerId);
  if (!playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("playerId is required.", {
        field: "playerId",
        type: "release_lock",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "release_lock",
      roomId,
      stageId,
      playerId,
    },
  };
}

function validateSubmitQuestionCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "submit_question",
      }),
    };
  }

  const stageId = normalizeRequiredString(body.stageId);
  if (!stageId) {
    return {
      kind: "failure",
      error: createValidationFailure("stageId is required.", {
        field: "stageId",
        type: "submit_question",
      }),
    };
  }

  const playerId = normalizeRequiredString(body.playerId);
  if (!playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("playerId is required.", {
        field: "playerId",
        type: "submit_question",
      }),
    };
  }

  const teamSlotId = normalizeRequiredString(body.teamSlotId);
  if (!teamSlotId) {
    return {
      kind: "failure",
      error: createValidationFailure("teamSlotId is required.", {
        field: "teamSlotId",
        type: "submit_question",
      }),
    };
  }

  const content = normalizeRequiredString(body.content);
  if (!content) {
    return {
      kind: "failure",
      error: createValidationFailure("content is required.", {
        field: "content",
        type: "submit_question",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "submit_question",
      roomId,
      stageId,
      playerId,
      teamSlotId,
      content,
    },
  };
}

function validateSubmitAnswerCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  if (!roomId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId is required.", {
        field: "roomId",
        type: "submit_answer",
      }),
    };
  }

  const stageId = normalizeRequiredString(body.stageId);
  if (!stageId) {
    return {
      kind: "failure",
      error: createValidationFailure("stageId is required.", {
        field: "stageId",
        type: "submit_answer",
      }),
    };
  }

  const playerId = normalizeRequiredString(body.playerId);
  if (!playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("playerId is required.", {
        field: "playerId",
        type: "submit_answer",
      }),
    };
  }

  const teamSlotId = normalizeRequiredString(body.teamSlotId);
  if (!teamSlotId) {
    return {
      kind: "failure",
      error: createValidationFailure("teamSlotId is required.", {
        field: "teamSlotId",
        type: "submit_answer",
      }),
    };
  }

  const content = normalizeRequiredString(body.content);
  if (!content) {
    return {
      kind: "failure",
      error: createValidationFailure("content is required.", {
        field: "content",
        type: "submit_answer",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "submit_answer",
      roomId,
      stageId,
      playerId,
      teamSlotId,
      content,
    },
  };
}

function validateRequestPrivateChatCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  const stageId = normalizeRequiredString(body.stageId);
  const requesterPlayerId = normalizeRequiredString(body.requesterPlayerId);
  const targetPlayerId = normalizeRequiredString(body.targetPlayerId);

  if (!roomId || !stageId || !requesterPlayerId || !targetPlayerId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId, stageId, requesterPlayerId, targetPlayerId are required.", {
        type: "request_private_chat",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "request_private_chat",
      roomId,
      stageId,
      requesterPlayerId,
      targetPlayerId,
    },
  };
}

function validateRespondPrivateChatCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  const requestId = normalizeRequiredString(body.requestId);
  const responderPlayerId = normalizeRequiredString(body.responderPlayerId);

  if (!roomId || !requestId || !responderPlayerId || typeof body.accept !== "boolean") {
    return {
      kind: "failure",
      error: createValidationFailure("roomId, requestId, responderPlayerId, accept are required.", {
        type: "respond_private_chat",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "respond_private_chat",
      roomId,
      requestId,
      responderPlayerId,
      accept: body.accept,
    },
  };
}

function validateEndPrivateChatCommand(
  body: Record<string, unknown>,
): ValidatedGameCommand {
  const roomId = normalizeRequiredString(body.roomId);
  const stageId = normalizeRequiredString(body.stageId);
  const sessionId = normalizeRequiredString(body.sessionId);
  const playerId = normalizeRequiredString(body.playerId);

  if (!roomId || !stageId || !sessionId || !playerId) {
    return {
      kind: "failure",
      error: createValidationFailure("roomId, stageId, sessionId, playerId are required.", {
        type: "end_private_chat",
      }),
    };
  }

  return {
    kind: "success",
    command: {
      type: "end_private_chat",
      roomId,
      stageId,
      sessionId,
      playerId,
    },
  };
}

function validateGameCommandRequest(body: unknown): ValidatedGameCommand {
  if (!isRecord(body)) {
    return {
      kind: "failure",
      error: createValidationFailure("Request body must be a JSON object."),
    };
  }

  if (typeof body.type !== "string" || body.type.trim().length === 0) {
    return {
      kind: "failure",
      error: createValidationFailure("type is required.", {
        field: "type",
      }),
    };
  }

  const requestedType = body.type.trim();
  switch (requestedType) {
    case "set_ready":
      return validateSetReadyCommand(body);
    case "assign_teams":
      return validateAssignTeamsCommand(body);
    case "start_stage":
      return validateStartStageCommand(body);
    case "advance_stage":
      return validateAdvanceStageCommand(body);
    case "join_lock_queue":
      return validateJoinLockQueueCommand(body);
    case "leave_lock_queue":
      return validateLeaveLockQueueCommand(body);
    case "acquire_lock":
      return validateAcquireLockCommand(body);
    case "release_lock":
      return validateReleaseLockCommand(body);
    case "submit_question":
      return validateSubmitQuestionCommand(body);
    case "submit_answer":
      return validateSubmitAnswerCommand(body);
    case "request_private_chat":
      return validateRequestPrivateChatCommand(body);
    case "respond_private_chat":
      return validateRespondPrivateChatCommand(body);
    case "end_private_chat":
      return validateEndPrivateChatCommand(body);
    default:
      return {
        kind: "unsupported",
        requestedType,
      };
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const payload = createValidationFailure("Request body must be valid JSON.", {
      expected: "GameCommandRequest",
    });

    return Response.json(payload, { status: 400 });
  }

  const validated = validateGameCommandRequest(body);
  switch (validated.kind) {
    case "failure":
      return Response.json(validated.error, { status: 400 });
    case "unsupported": {
      const payload = createPlaceholderFailure({
        route: "game.command",
        status: "unimplemented_command",
        requestedType: validated.requestedType,
      }) satisfies ApiResponse<GameCommandResponse>;

      return Response.json(payload, { status: 501 });
    }
    case "success": {
      if (isSupabaseEnabled() && validated.command.type === "set_ready") {
        try {
          const response = await setReadyInStore(
            validated.command.roomId,
            validated.command.playerId,
            validated.command.isReady,
          );

          if (!response) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: "PLAYER_NOT_FOUND",
                  message: "해당 플레이어의 준비 상태를 바꿀 수 없습니다.",
                },
              },
              { status: 404 },
            );
          }

          const payload = {
            ok: true,
            data: response,
          } satisfies ApiResponse<GameCommandResponse>;

          return Response.json(payload, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error: {
                code: "SET_READY_FAILED",
                message: error instanceof Error ? error.message : "준비 상태 저장에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "assign_teams") {
        try {
          const response = await assignTeamsInStore(
            validated.command.roomId,
            validated.command.requestedByPlayerId,
            validated.command.stageNumber,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof AssignTeamsError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveAssignTeamsErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "ASSIGN_TEAMS_FAILED",
                message: error instanceof Error ? error.message : "팀 배정 저장에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "start_stage") {
        try {
          const response = await startStageInStore(
            validated.command.roomId,
            validated.command.requestedByPlayerId,
            validated.command.caseKey,
            validated.command.durationSeconds,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof StartStageError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveStartStageErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "START_STAGE_FAILED",
                message: error instanceof Error ? error.message : "스테이지 시작에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "advance_stage") {
        try {
          const response = await advanceStageInStore(
            validated.command.roomId,
            validated.command.requestedByPlayerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof AdvanceStageError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveAdvanceStageErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "ADVANCE_STAGE_FAILED",
                message: error instanceof Error ? error.message : "다음 스테이지 준비에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "acquire_lock") {
        try {
          const response = await acquireInvestigationLockInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.playerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof InvestigationLockError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveInvestigationLockErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "ACQUIRE_LOCK_FAILED",
                message: error instanceof Error ? error.message : "조사실 입장에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "join_lock_queue") {
        try {
          const response = await joinInvestigationQueueInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.playerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof InvestigationLockError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveInvestigationLockErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "JOIN_LOCK_QUEUE_FAILED",
                message: error instanceof Error ? error.message : "질문방 대기열 참가에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "leave_lock_queue") {
        try {
          const response = await leaveInvestigationQueueInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.playerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof InvestigationLockError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveInvestigationLockErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "LEAVE_LOCK_QUEUE_FAILED",
                message: error instanceof Error ? error.message : "질문방 대기열 취소에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "release_lock") {
        try {
          const response = await releaseInvestigationLockInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.playerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof InvestigationLockError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveInvestigationLockErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "RELEASE_LOCK_FAILED",
                message: error instanceof Error ? error.message : "조사실 퇴장에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "submit_question") {
        try {
          const response = await submitQuestionInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.playerId,
            validated.command.teamSlotId,
            validated.command.content,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof InvestigationLockError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveInvestigationLockErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "SUBMIT_QUESTION_FAILED",
                message: error instanceof Error ? error.message : "질문 제출에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "submit_answer") {
        try {
          const response = await submitAnswerInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.playerId,
            validated.command.teamSlotId,
            validated.command.content,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof InvestigationLockError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolveInvestigationLockErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "SUBMIT_ANSWER_FAILED",
                message: error instanceof Error ? error.message : "정답 제출에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "request_private_chat") {
        try {
          const response = await requestPrivateChatInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.requesterPlayerId,
            validated.command.targetPlayerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof PrivateChatError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolvePrivateChatErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "REQUEST_PRIVATE_CHAT_FAILED",
                message: error instanceof Error ? error.message : "1:1 채팅 요청에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "respond_private_chat") {
        try {
          const response = await respondPrivateChatInStore(
            validated.command.roomId,
            validated.command.requestId,
            validated.command.responderPlayerId,
            validated.command.accept,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof PrivateChatError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolvePrivateChatErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "RESPOND_PRIVATE_CHAT_FAILED",
                message: error instanceof Error ? error.message : "1:1 채팅 응답 처리에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (isSupabaseEnabled() && validated.command.type === "end_private_chat") {
        try {
          const response = await endPrivateChatInStore(
            validated.command.roomId,
            validated.command.stageId,
            validated.command.sessionId,
            validated.command.playerId,
          );

          return Response.json(
            {
              ok: true,
              data: response,
            } satisfies ApiResponse<GameCommandResponse>,
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof PrivateChatError) {
            return Response.json(
              {
                ok: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: resolvePrivateChatErrorStatus(error) },
            );
          }

          return Response.json(
            {
              ok: false,
              error: {
                code: "END_PRIVATE_CHAT_FAILED",
                message: error instanceof Error ? error.message : "1:1 채팅 종료에 실패했습니다.",
              },
            },
            { status: 500 },
          );
        }
      }

      if (
        !isSupabaseEnabled() &&
        (validated.command.type === "join_lock_queue" ||
          validated.command.type === "leave_lock_queue" ||
          validated.command.type === "request_private_chat" ||
          validated.command.type === "respond_private_chat" ||
          validated.command.type === "end_private_chat")
      ) {
        const payload = createPlaceholderFailure({
          route: "game.command",
          status: "supabase_required",
          requestedType: validated.command.type,
        }) satisfies ApiResponse<GameCommandResponse>;

        return Response.json(payload, { status: 501 });
      }

      const payload = createPlaceholderFailure({
        route: "game.command",
        status: "supabase_required",
        requestedType: validated.command.type,
      }) satisfies ApiResponse<GameCommandResponse>;

      return Response.json(payload, { status: 501 });
    }
  }
}
