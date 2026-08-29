const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
const search = "{/* YouTube API Integration Section */}";
const replace = `{/* Google Tasks Integration Section */}
      <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-[24px] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[var(--accent)]" />
              Google Tasks Integration
            </h2>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5">
              Sync study reminders to your Google Tasks
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-high)] space-y-3">
          {tasksLoading ? (
             <div className="text-sm text-[var(--ink-dim)]">Checking connection status...</div>
          ) : tasksConnected ? (
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                 <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                   <CheckCircle2 className="w-4 h-4" /> Connected
                 </div>
                 <div className="text-xs text-[var(--ink-dim)] mt-1">
                   Connected to Google Tasks as <span className="font-medium text-[var(--ink)]">{user?.email}</span>
                 </div>
               </div>
               <button onClick={handleDisconnectTasks} className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-mid)] text-sm font-semibold text-[var(--ink)] transition">
                 Disconnect
               </button>
             </div>
          ) : (
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div className="text-sm text-[var(--ink-dim)]">
                 Not connected. Enable Google Tasks to receive daily study reminders.
               </div>
               <button onClick={handleConnectTasks} className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition">
                 Connect Google Tasks
               </button>
             </div>
          )}
        </div>
      </div>

      {/* YouTube API Integration Section */}`;
code = code.replace(search, replace);
fs.writeFileSync('src/pages/SettingsPage.tsx', code);
