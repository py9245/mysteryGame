import type {
  AcquireInvestigationLockRequest,
  AssignTeamsRequest,
  ApiFailure,
  ApiResponse,
  GameCommandResponse,
  ListGameSnapshotsResponse,
  ReleaseInvestigationLockRequest,
  SetReadyRequest,
  StartStageRequest,
  SubmitAnswerRequest,
  SubmitQuestionRequest,
} from "@/contracts/api";
import { listGameSnapshotsFromStore, setReadyInStore } from "@/server/live-store";
import {
  buildSampleAcquireLockResponse,
  buildSampleAssignTeamsResponse,
  buildSampleSubmitAnswerResponse,
  buildSampleSubmitQuestionResponse,
  buildSampleReleaseLockResponse,
  buildSampleSetReadyResponse,
  buildSampleStartStageResponse,
  IMPLEMENTED_SAMPLE_GAME_COMMAND_TYPES,
} from "@/server/sample-game-command";
import { buildSampleGameSnapshotsResponse } from "@/server/sample-game-snapshot";
import { isSupabaseEnabled } from "@/server/supabase-admin";
import { createPlaceholderFailure } from "../_shared/placeholder";

export const runtime = "nodejs";

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

  const payload = {
    ok: true,
    data: buildSampleGameSnapshotsResponse(),
  } satisfies ApiResponse<ListGameSnapshotsResponse>;

  return Response.json(payload, { status: 200 });
}

type ValidatedGameCommand =
  | { kind: "success"; command: SetReadyRequest }
  | { kind: "success"; command: AssignTeamsRequest }
  | { kind: "success"; command: StartStageRequest }
  | { kind: "success"; command: AcquireInvestigationLockRequest }
  | { kind: "success"; command: ReleaseInvestigationLockRequest }
  | { kind: "success"; command: SubmitQuestionRequest }
  | { kind: "success"; command: SubmitAnswerRequest }
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
    case "acquire_lock":
      return validateAcquireLockCommand(body);
    case "release_lock":
      return validateReleaseLockCommand(body);
    case "submit_question":
      return validateSubmitQuestionCommand(body);
    case "submit_answer":
      return validateSubmitAnswerCommand(body);
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
        status: "partial_sample",
        requestedType: validated.requestedType,
        implementedTypes: [...IMPLEMENTED_SAMPLE_GAME_COMMAND_TYPES],
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

      const response =
        validated.command.type === "set_ready"
          ? buildSampleSetReadyResponse(validated.command)
          : validated.command.type === "assign_teams"
            ? buildSampleAssignTeamsResponse(validated.command)
            : validated.command.type === "start_stage"
              ? buildSampleStartStageResponse(validated.command)
              : validated.command.type === "acquire_lock"
                ? buildSampleAcquireLockResponse(validated.command)
                : validated.command.type === "release_lock"
                  ? buildSampleReleaseLockResponse(validated.command)
                  : validated.command.type === "submit_question"
                    ? buildSampleSubmitQuestionResponse(validated.command)
                    : buildSampleSubmitAnswerResponse(validated.command);
      const payload = {
        ok: true,
        data: response,
      } satisfies ApiResponse<GameCommandResponse>;

      return Response.json(payload, { status: 200 });
    }
  }
}
