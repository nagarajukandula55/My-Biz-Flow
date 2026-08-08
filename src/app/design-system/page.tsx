import { LogoMark } from "@/components/LogoMark";
import { StatusChip } from "@/components/StatusChip";
import { DataTable } from "@/components/DataTable";
import { KanbanBoard } from "@/components/KanbanBoard";
import { RecordDetail } from "@/components/RecordDetail";
import { DashboardWidget } from "@/components/DashboardWidget";
import { AppShell } from "@/components/AppShell";
import {
  workorderColumns,
  workorderRows,
  workorderStages,
  workorderCards,
  sampleRecordFields,
  sampleTimeline,
  sampleRelated,
  sampleNavGroups,
} from "@/lib/sample-data";

const SWATCHES: { name: string; varName: string }[] = [
  { name: "Background", varName: "--bg" },
  { name: "Background Raised", varName: "--bg-raised" },
  { name: "Background Sunken", varName: "--bg-sunken" },
  { name: "Text", varName: "--text" },
  { name: "Text Muted", varName: "--text-muted" },
  { name: "Border", varName: "--border" },
  { name: "Accent (Flow Amber)", varName: "--accent" },
  { name: "Accent Soft", varName: "--accent-soft" },
  { name: "Teal (Flow Teal)", varName: "--teal" },
  { name: "Teal Soft", varName: "--teal-soft" },
  { name: "Danger", varName: "--danger" },
  { name: "Danger Soft", varName: "--danger-soft" },
  { name: "Success", varName: "--success" },
  { name: "Success Soft", varName: "--success-soft" },
  { name: "Warning", varName: "--warning" },
  { name: "Warning Soft", varName: "--warning-soft" },
  { name: "Sidebar BG", varName: "--sidebar-bg" },
  { name: "Sidebar Active", varName: "--sidebar-active" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-extrabold text-text">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mbf-page space-y-16 bg-bg">
      <header className="flex items-center gap-3">
        <LogoMark size={40} />
        <div>
          <h1 className="font-display text-3xl font-extrabold text-text">My Biz Flow</h1>
          <p className="mt-1 mbf-prose text-sm text-text-muted">
            Design system reference — the "Ledger Ink" palette, MBF type system, and the
            component library every future screen must visually match.
          </p>
        </div>
      </header>

      <Section title="Color tokens — Ledger Ink">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map((swatch) => (
            <div key={swatch.varName} className="overflow-hidden rounded-lg border border-border">
              <div className="h-16" style={{ background: `var(${swatch.varName})` }} />
              <div className="bg-bg-raised p-2">
                <div className="text-xs font-semibold text-text">{swatch.name}</div>
                <div className="font-mono text-[10px] text-text-muted">{swatch.varName}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mbf-prose text-sm text-text-muted">
          Teal marks module/vertical identity, amber is reserved for brand and primary actions,
          and danger / success / warning are status-only — never reused as the brand accent.
        </p>
      </Section>

      <Section title="Type system">
        <div className="space-y-6 rounded-lg border border-border bg-bg-raised p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              MBF Display — Archivo 700 / 800 (headings, wordmark only)
            </div>
            <div className="font-display text-4xl font-extrabold text-text">
              Workorders overview
            </div>
            <div className="font-display text-2xl font-bold text-text">Job WO-2291</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              MBF Sans — IBM Plex Sans 400 / 600 / 700 (default UI font)
            </div>
            <div className="text-base text-text">
              The quick brown fox jumps over the lazy dog — regular body copy at 400 weight.
            </div>
            <div className="text-base font-semibold text-text">
              Semibold labels and table headers use 600 weight.
            </div>
            <div className="text-base font-bold text-text">Bold emphasis uses 700 weight.</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              MBF Mono — IBM Plex Mono 500 / 700, tabular-nums
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums text-text">
              ₹3,200 · WO-2291 · 08/09
            </div>
          </div>
        </div>
      </Section>

      <Section title="Logo mark">
        <div className="flex flex-wrap items-center gap-8 rounded-lg border border-border bg-bg-raised p-6">
          <div className="flex flex-col items-center gap-2">
            <LogoMark size={20} />
            <span className="text-xs text-text-muted">Sidebar (20px)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-xs text-text-muted">Header (40px)</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-md bg-sidebar-bg p-4">
            <LogoMark size={20} />
            <span className="text-xs text-sidebar-text-dim">On sidebar-bg</span>
          </div>
        </div>
      </Section>

      <Section title="StatusChip">
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-bg-raised p-6">
          <StatusChip label="Diagnosed" variant="warning" />
          <StatusChip label="In repair" variant="amber" />
          <StatusChip label="Ready" variant="teal" />
          <StatusChip label="Delivered" variant="success" />
          <StatusChip label="On hold" variant="danger" />
          <StatusChip label="Draft" variant="neutral" />
        </div>
      </Section>

      <Section title="DashboardWidget (with neon numeral treatment)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardWidget
            label="Revenue this month"
            value="₹4,82,300"
            trend={{ direction: "up", label: "12.4% vs last month" }}
            neon
          />
          <DashboardWidget
            label="Open workorders"
            value="18"
            trend={{ direction: "up", label: "3 new today" }}
          />
          <DashboardWidget
            label="Avg. turnaround"
            value="2.3 days"
            trend={{ direction: "down", label: "0.4d faster" }}
          />
          <DashboardWidget label="Overdue jobs" value="2" />
        </div>
        <p className="mbf-prose text-sm text-text-muted">
          The neon glow (hero revenue figure above) is static, accent-colored, and dark-mode-only
          — in light mode it renders as a plain solid accent color with no glow.
        </p>
      </Section>

      <Section title="DataTable">
        <DataTable columns={workorderColumns} rows={workorderRows} />
      </Section>

      <Section title="KanbanBoard">
        <KanbanBoard stages={workorderStages} cards={workorderCards} />
      </Section>

      <Section title="RecordDetail">
        <RecordDetail
          fields={sampleRecordFields}
          timeline={sampleTimeline}
          related={sampleRelated}
        />
      </Section>

      <Section title="AppShell">
        <div className="overflow-hidden rounded-lg border border-border" style={{ height: 420 }}>
          <div className="h-full w-full overflow-auto">
            <AppShell vendorId="demo" navGroups={sampleNavGroups} topbarTitle="Dashboard">
              <p className="mbf-prose text-sm text-text-muted">
                AppShell renders its sidebar (dark sidebar-bg), grouped nav with teal / amber /
                neutral module-taxonomy dots, and a topbar around whatever content is passed as
                children. Full pages built on AppShell arrive in a follow-up pass.
              </p>
            </AppShell>
          </div>
        </div>
      </Section>
    </div>
  );
}
