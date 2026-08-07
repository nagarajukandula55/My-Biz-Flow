import { formatCurrencyINR } from "@/lib/format";

export type KanbanStage = {
  key: string;
  label: string;
};

export type KanbanCard = {
  id: string;
  stageKey: string;
  title: string;
  meta: string;
  amount?: number;
};

type KanbanBoardProps = {
  stages: KanbanStage[];
  cards: KanbanCard[];
};

export function KanbanBoard({ stages, cards }: KanbanBoardProps) {
  return (
    <div className="flex w-full gap-4 overflow-x-auto pb-2">
      {stages.map((stage) => {
        const stageCards = cards.filter((card) => card.stageKey === stage.key);
        return (
          <div
            key={stage.key}
            className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-border bg-bg-sunken"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {stage.label}
              </span>
              <span className="rounded-full bg-bg-raised px-2 py-0.5 text-xs font-semibold text-text-muted">
                {stageCards.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {stageCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-md border border-border bg-bg-raised p-3 shadow-sm"
                >
                  <div className="text-sm font-semibold text-text">{card.title}</div>
                  <div className="mt-1 text-xs text-text-muted">{card.meta}</div>
                  {card.amount !== undefined && (
                    <div className="mt-2 font-mono text-sm font-bold tabular-nums text-text">
                      {formatCurrencyINR(card.amount)}
                    </div>
                  )}
                </div>
              ))}
              {stageCards.length === 0 && (
                <div className="px-2 py-4 text-center text-xs text-text-muted">No records</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
