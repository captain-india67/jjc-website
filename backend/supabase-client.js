const SUPABASE_URL = "https://yprgxbgyqiuglkaafbht.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_PtzFWt0c3DyCyG1ctOMYcw_HAejnwbb";

(function () {
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 40;
  if (!configured) {
    console.error("[JJC] backend/supabase-client.js still has placeholder values. Paste the Project URL and anon key from Supabase > Project Settings > API.");
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error("[JJC] Supabase library not loaded.");
    return;
  }
  const sb = window.supabase.createClient(configured ? SUPABASE_URL : "https://unconfigured.supabase.co", configured ? SUPABASE_ANON_KEY : "unconfigured");

  const JJC = {
    client: sb,
    configured,

    authErrorFromUrl() {
      const sources = [window.location.hash.replace(/^#/, ""), window.location.search.replace(/^\?/, "")];
      for (const src of sources) {
        const params = new URLSearchParams(src);
        if (params.get("error_description") || params.get("error")) {
          return (params.get("error_description") || params.get("error")).replace(/\+/g, " ");
        }
      }
      return null;
    },

    cleanUrl() {
      if (window.location.hash || /[?&](code|error)=/.test(window.location.search)) {
        history.replaceState(null, "", window.location.pathname);
      }
    },

    async signInWithGoogle() {
      if (!configured) return { error: { message: "The site is not connected to Supabase yet." } };
      return sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
    },

    async signOut() {
      await sb.auth.signOut();
      window.location.href = "index.html";
    },

    async getUser() {
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session.user : null;
    },

    async getProfile() {
      const user = await this.getUser();
      if (!user) return { profile: null, error: null };
      let { data, error } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) return { profile: null, error };
      if (!data) {
        const meta = user.user_metadata || {};
        const insert = await sb.from("profiles").insert({
          id: user.id,
          full_name: meta.full_name || meta.name || null,
          email: user.email
        }).select("*").single();
        if (insert.error) return { profile: null, error: insert.error };
        data = insert.data;
      }
      return { profile: data, error: null };
    },

    async updateProfile(fields) {
      const user = await this.getUser();
      if (!user) return { error: { message: "Not signed in" } };
      const allowed = {
        full_name: fields.full_name || null,
        school: fields.school || null,
        committee: fields.committee || null
      };
      return sb.from("profiles").update(allowed).eq("id", user.id);
    },

    async getMyHours() {
      const user = await this.getUser();
      if (!user) return { rows: [], error: null };
      const { data, error } = await sb.from("service_hours").select("*").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false });
      return { rows: data || [], error };
    },

    async logHours({ activity, category, hours, date, reflection }) {
      const user = await this.getUser();
      if (!user) return { error: { message: "Not signed in" } };
      return sb.from("service_hours").insert({
        user_id: user.id, activity, category, hours: Number(hours), date, reflection: reflection || null, status: "pending"
      });
    },

    async deleteHours(id) {
      return sb.from("service_hours").delete().eq("id", id);
    },

    async getMyTotals() {
      const { rows, error } = await this.getMyHours();
      const sum = (s) => rows.filter(r => r.status === s).reduce((a, r) => a + Number(r.hours), 0);
      return { approved: sum("approved"), pending: sum("pending"), entries: rows.length, all: rows, error };
    },

    async getPendingHours() {
      const { data, error } = await sb
        .from("service_hours")
        .select("*, profiles!service_hours_user_id_fkey(full_name, email, school, committee)")
        .eq("status", "pending").order("created_at", { ascending: true });
      return { rows: data || [], error };
    },

    async getAllStudents() {
      const { data, error } = await sb.from("profiles").select("*").order("full_name", { ascending: true });
      return { rows: data || [], error };
    },

    async getAllHours() {
      const { data, error } = await sb.from("service_hours").select("user_id,hours,status");
      return { rows: data || [], error };
    },

    async reviewHours(id, decision) {
      const user = await this.getUser();
      return sb.from("service_hours").update({
        status: decision, reviewed_by: user ? user.id : null, reviewed_at: new Date().toISOString()
      }).eq("id", id);
    }
  };

  window.JJC = JJC;
})();
