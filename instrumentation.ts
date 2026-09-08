export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { hydrateSupabaseCache } = await import("@/lib/supabase/hydrate")
    try {
      await hydrateSupabaseCache()
    } catch (error) {
      console.error("[g100] Supabase hydrate failed; using local JSON fallback", error)
    }
  }
}
