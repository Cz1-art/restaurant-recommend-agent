export function formatApiError(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    const msg = d.dify_message ?? d.message;
    const hint = d.fix_hint;
    if (typeof msg === "string" && msg) {
      return typeof hint === "string" ? `${msg} — ${hint}` : msg;
    }
    if (d.code === "dify_bad_response") {
      return "Dify 调用失败。请在 Dify 云为应用配置大模型并发布。";
    }
  }
  return fallback || "请求失败";
}
