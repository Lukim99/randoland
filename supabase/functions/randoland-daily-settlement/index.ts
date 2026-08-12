import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type JsonObject = Record<string, unknown>;

interface ClaimResult {
  status: "idle" | "claimed" | "busy" | "completed";
  serverTime?: string;
  executionKey?: string;
  recoverableAt?: string;
}

interface AdminSettlementAuthorization {
  userId: string;
  role: "owner" | "operator";
}

interface SettlementRequestBody {
  mode?: "admin_now";
  leagueId?: string;
  requestKey?: string;
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 900);
  return String(error).slice(0, 900);
}

async function callRpc<T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  functionName: string,
  body: JsonObject = {},
): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`${functionName} 실패 (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

async function callRpcAsUser<T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  authorization: string,
  functionName: string,
  body: JsonObject = {},
): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`${functionName} 실패 (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 허용합니다." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let executionKey: string | undefined;
  let requestBody: SettlementRequestBody = {};

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase 서버 환경 변수가 없습니다." }, 500);
  }

  try {
    const rawBody = await request.text();
    requestBody = rawBody.trim()
      ? JSON.parse(rawBody) as SettlementRequestBody
      : {};
  } catch {
    return jsonResponse({ error: "요청 본문은 JSON이어야 합니다." }, 400);
  }

  const isAdminRequest = requestBody.mode === "admin_now";
  if (requestBody.mode && !isAdminRequest) {
    return jsonResponse({ error: "지원하지 않는 정산 실행 방식입니다." }, 400);
  }
  if (isAdminRequest && (!requestBody.leagueId || !requestBody.requestKey)) {
    return jsonResponse({ error: "리그와 요청 키가 필요합니다." }, 400);
  }

  try {
    let claim: ClaimResult;
    if (isAdminRequest) {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer ")) {
        return jsonResponse({ error: "관리자 로그인이 필요합니다." }, 401);
      }

      const administrator = await callRpcAsUser<AdminSettlementAuthorization>(
        supabaseUrl,
        serviceRoleKey,
        authorization,
        "randoland_admin_console_authorize_settlement",
      );

      claim = await callRpc<ClaimResult>(
        supabaseUrl,
        serviceRoleKey,
        "randoland_admin_claim_settlement_now",
        {
          p_league_id: requestBody.leagueId,
          p_operator_user_id: administrator.userId,
          p_request_key: requestBody.requestKey,
        },
      );
    } else {
      claim = await callRpc<ClaimResult>(
        supabaseUrl,
        serviceRoleKey,
        "randoland_admin_claim_settlement",
      );
    }

    if (claim.status === "idle") {
      return jsonResponse({ status: "idle", serverTime: claim.serverTime });
    }
    if (claim.status === "busy") {
      return jsonResponse({
        status: "busy",
        recoverableAt: claim.recoverableAt,
      });
    }
    if (claim.status === "completed") {
      return jsonResponse({ status: "completed", alreadyCompleted: true });
    }
    if (!claim.executionKey) {
      throw new Error("정산 실행 키가 반환되지 않았습니다.");
    }
    executionKey = claim.executionKey;

    await callRpc<JsonObject>(
      supabaseUrl,
      serviceRoleKey,
      "randoland_admin_prepare_settlement_v4",
      { p_execution_key: executionKey },
    );

    const result = await callRpc<JsonObject>(
      supabaseUrl,
      serviceRoleKey,
      isAdminRequest
        ? "randoland_admin_finalize_settlement_now_v4"
        : "randoland_admin_finalize_settlement_v4",
      { p_execution_key: executionKey },
    );

    return jsonResponse({
      ...result,
      trigger: isAdminRequest ? "admin" : "scheduled",
    });
  } catch (error) {
    const message = safeErrorMessage(error);

    if (executionKey) {
      try {
        await callRpc(
          supabaseUrl,
          serviceRoleKey,
          "randoland_admin_fail_settlement",
          {
            p_execution_key: executionKey,
            p_error_message: message,
          },
        );
      } catch (failureError) {
        console.error("정산 실패 상태 기록 오류", failureError);
      }
    }

    console.error("란도랜드2 일일 정산 오류", error);
    return jsonResponse({ status: "failed", error: message }, 500);
  }
});
