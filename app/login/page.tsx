"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/local/client";

export default function LoginPage() {
  const router = useRouter();
  const localClient = createClient();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg("");
    const e = email.trim().toLowerCase();
    if (!e) { setMsg("请输入邮箱"); return; }
    if (pw.length < 6) { setMsg("密码至少 6 位"); return; }
    setBusy(true);
    try {
      const { error } = await localClient.auth.signInWithPassword({ email: e, password: pw });
      if (error) throw error;
      router.replace("/workspace"); router.refresh();
    } catch (err: any) { setMsg(err?.message || "出错了，请重试"); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-shell relative grid min-h-[100dvh] w-full touch-pan-y place-items-center overflow-y-auto bg-[#08080c] p-6 text-white overscroll-y-contain">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb absolute left-1/2 top-[-10%] h-[620px] w-[620px] -translate-x-1/2 opacity-55" />
        <div className="grain" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#08080c]/40 to-[#08080c]" />
      </div>

      <div className="relative z-10 w-[440px] max-w-full">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 font-disp text-lg font-semibold text-white">
          <img src="/fg-logo.svg" width={34} height={34} alt="FG Studio" className="h-8 w-8 object-contain" />
          FG Studio
        </Link>
        <div className="rounded-[24px] border border-white/12 bg-white/[.04] p-9 shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)] backdrop-blur-2xl">
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-cyan">FableGlitch · AI 漫剧</div>
          <h1 className="font-disp text-[26px] font-semibold tracking-tight">登录工作台</h1>
          <p className="mb-6 mt-1.5 text-sm text-white/55">用公司邮箱开始你的 AI 漫剧项目。</p>

          <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wide text-white/45">邮箱</label>
          <input className="mb-4 w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-3 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-violet focus:bg-white/[.08]" value={email} placeholder="yourname@beva.com" autoCapitalize="none" onChange={(ev) => setEmail(ev.target.value)} />
          <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wide text-white/45">密码</label>
          <input className="mb-2 w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-3 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-violet focus:bg-white/[.08]"
            type="password" value={pw} placeholder="至少 6 位" onChange={(ev) => setPw(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && submit()} />

          {msg && <div className="mb-2 mt-1 text-[13px] font-medium text-coral">{msg}</div>}

          <button className="pop-grad mt-3 w-full rounded-pill py-3.5 text-sm font-semibold text-black transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={busy} onClick={submit}>{busy ? "处理中…" : "登录 →"}</button>

          <p className="mt-5 border-t border-white/8 pt-4 text-[12px] leading-relaxed text-white/40">
            仅限已有账号登录。如需开通账号，请联系管理员。
          </p>
        </div>
      </div>
    </main>
  );
}
