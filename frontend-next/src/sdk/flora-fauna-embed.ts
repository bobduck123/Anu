/**
 * Manara Embeddable SDK.
 *
 * Usage:
 *   <script src="https://your-domain/sdk/manara-embed.js"></script>
 *   <script>
 *     Manara.init({ apiBase: 'https://...', token: 'your-api-token' });
 *     Manara.embed('events', document.getElementById('events-container'));
 *   </script>
 *
 * Legacy compatibility:
 *   window.FloraFauna remains available as an alias.
 *
 * Or via iframe:
 *   <iframe src="https://your-domain/sdk/demo.html?token=...&module=events"></iframe>
 */

interface ManaraConfig {
  apiBase: string;
  token: string;
  theme?: 'light' | 'dark';
}

interface EmbedModule {
  name: string;
  render: (container: HTMLElement, config: ManaraConfig) => void;
}

const modules: Record<string, EmbedModule> = {
  events: {
    name: 'events',
    render: async (container, config) => {
      container.innerHTML = '<div style="padding:16px;font-family:system-ui">Loading events...</div>';
      try {
        const res = await fetch(`${config.apiBase}/api/events`, {
          headers: { Authorization: `Bearer ${config.token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        const events = data.data || data || [];
        container.innerHTML = `
          <div style="font-family:system-ui;max-width:600px">
            <h3 style="margin:0 0 12px;font-size:18px">Upcoming Events</h3>
            ${(events as Array<{ id: number; title: string; date?: string; description?: string }>)
              .slice(0, 10)
              .map(
                (e) => `
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px">
                <div style="font-weight:600">${e.title}</div>
                <div style="font-size:12px;color:#666;margin-top:4px">${e.date || ''}</div>
                <div style="font-size:13px;margin-top:8px">${(e.description || '').slice(0, 100)}</div>
              </div>
            `
              )
              .join('')}
            ${events.length === 0 ? '<p style="color:#666">No upcoming events.</p>' : ''}
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div style="color:red;padding:16px">Error loading events: ${err}</div>`;
      }
    },
  },
  booking: {
    name: 'booking',
    render: async (container, config) => {
      container.innerHTML = '<div style="padding:16px;font-family:system-ui">Loading shifts...</div>';
      try {
        const now = new Date();
        const start = now.toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);
        const res = await fetch(`${config.apiBase}/api/calendar/shifts?start=${start}&end=${end}`, {
          headers: { Authorization: `Bearer ${config.token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch shifts');
        const data = await res.json();
        const shifts = data.data || data || [];
        container.innerHTML = `
          <div style="font-family:system-ui;max-width:600px">
            <h3 style="margin:0 0 12px;font-size:18px">Available Shifts</h3>
            ${(shifts as Array<{ id: number; title: string; date?: string; start_time?: string; end_time?: string; assigned_count?: number; max_volunteers?: number }>)
              .slice(0, 10)
              .map(
                (s) => `
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px">
                <div style="font-weight:600">${s.title}</div>
                <div style="font-size:12px;color:#666;margin-top:4px">${s.date || ''} ${(s.start_time || '').slice(0, 5)} - ${(s.end_time || '').slice(0, 5)}</div>
                <div style="font-size:12px;margin-top:4px">${s.assigned_count || 0}/${s.max_volunteers || 0} volunteers</div>
                <button onclick="Manara._signUp(${s.id})" style="margin-top:8px;padding:6px 16px;background:#2d5a3d;color:#fff;border:none;border-radius:999px;cursor:pointer;font-size:13px">
                  Sign Up
                </button>
              </div>
            `
              )
              .join('')}
            ${shifts.length === 0 ? '<p style="color:#666">No available shifts.</p>' : ''}
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div style="color:red;padding:16px">Error loading shifts: ${err}</div>`;
      }
    },
  },
};

let _config: ManaraConfig | null = null;

export const Manara = {
  init(config: ManaraConfig) {
    _config = config;
  },

  embed(moduleName: string, container: HTMLElement) {
    if (!_config) throw new Error('Manara.init() must be called first');
    const mod = modules[moduleName];
    if (!mod) throw new Error(`Unknown module: ${moduleName}. Available: ${Object.keys(modules).join(', ')}`);
    mod.render(container, _config);
  },

  async _signUp(shiftId: number) {
    if (!_config) return;
    try {
      const res = await fetch(`${_config.apiBase}/api/calendar/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${_config.token}` },
      });
      if (res.ok) {
        alert('Signed up successfully!');
      } else {
        const data = await res.json();
        alert(data?.error?.message || 'Failed to sign up');
      }
    } catch {
      alert('Network error');
    }
  },
};

export const FloraFauna = Manara;

// Auto-expose to window for script tag usage
if (typeof window !== 'undefined') {
  const globalWindow = window as unknown as Record<string, unknown>;
  globalWindow.Manara = Manara;
  globalWindow.FloraFauna = Manara;
}
