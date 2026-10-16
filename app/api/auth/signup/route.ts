import { NextResponse } from "next/server";

// Pause public registration without changing existing sign-in or admin paths.
export async function POST() {
  return NextResponse.json(
    { error: "暂不开放注册，请使用已有账号登录或联系管理员。" },
    { status: 403 },
  );
}
