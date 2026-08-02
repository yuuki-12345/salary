import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Plus, Trash2, BookOpen, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const COLORS = {
  paper: "#FAF6EC",
  paperDeep: "#EFEEE1",
  line: "#D6D3C2",
  ink: "#2B2B28",
  inkSoft: "#6B6558",
  juku: "#2B6CB0",
  conveni: "#2F9E6B",
  total: "#000000",
  stamp: "#B3492F",
};

const JOB_META = {
  juku: { label: "塾", color: COLORS.juku },
  conveni: { label: "コンビニ", color: COLORS.conveni },
};

function monthLabel(m) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${y}/${mo}`;
}

function monthLabelJa(m) {
  if (!m) return "選択してください";
  const [y, mo] = m.split("-");
  return `${y}年${parseInt(mo, 10)}月`;
}

function yen(n) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalaryPassbook() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    month: todayMonth(),
    type: "juku",
    amount: "",
  });
  const [stampPulse, setStampPulse] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("salary-entries");
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (e) {
      console.error("データの読み込みに失敗しました", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = (next) => {
    setSaving(true);
    try {
      localStorage.setItem("salary-entries", JSON.stringify(next));
    } catch (e) {
      console.error("保存に失敗しました", e);
    } finally {
      // 保存が速すぎるため、UIとして「記帳中…」を少しだけ見せるための遅延
      setTimeout(() => setSaving(false), 300);
    }
  };

  const addEntry = () => {
    const amt = parseFloat(form.amount);
    if (!form.month || !amt || amt <= 0) return;
    const idx = entries.findIndex((en) => en.month === form.month && en.type === form.type);
    let next;
    if (idx >= 0) {
      next = entries.map((en, i) =>
        i === idx ? { ...en, amount: amt } : en
      );
    } else {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        month: form.month,
        type: form.type,
        amount: amt,
      };
      next = [...entries, entry];
    }
    setEntries(next);
    persist(next);
    setForm((f) => ({ ...f, amount: "" }));
    setStampPulse(true);
    setTimeout(() => setStampPulse(false), 500);
  };

  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "yearly"
  const [editTarget, setEditTarget] = useState(null); // { month, type }
  const [editAmount, setEditAmount] = useState("");

  const openEditCell = (month, type) => {
    const entry = entries.find((e) => e.month === month && e.type === type);
    if (!entry) return;
    setEditTarget({ month, type });
    setEditAmount(String(entry.amount));
  };

  const saveEditCell = () => {
    const amt = parseFloat(editAmount);
    if (!editTarget || !amt || amt <= 0) return;
    const next = entries.map((e) =>
      e.month === editTarget.month && e.type === editTarget.type ? { ...e, amount: amt } : e
    );
    setEntries(next);
    persist(next);
    setEditTarget(null);
  };

  const deleteEditCell = () => {
    if (!editTarget) return;
    const next = entries.filter(
      (e) => !(e.month === editTarget.month && e.type === editTarget.type)
    );
    setEntries(next);
    persist(next);
    setEditTarget(null);
  };

  const removeEntry = (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    persist(next);
  };

  const totals = useMemo(() => {
    let juku = 0,
      conveni = 0;
    entries.forEach((e) => {
      if (e.type === "juku") juku += e.amount;
      else conveni += e.amount;
    });
    return { juku, conveni, total: juku + conveni };
  }, [entries]);

  const chartData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.month]) map[e.month] = { month: e.month, juku: 0, conveni: 0 };
      map[e.month][e.type] += e.amount;
    });
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({ ...d, total: d.juku + d.conveni, label: monthLabel(d.month) }));
  }, [entries]);

  const monthlySummary = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.month]) map[e.month] = { month: e.month, juku: 0, conveni: 0 };
      map[e.month][e.type] += e.amount;
    });
    return Object.values(map)
      .map((d) => ({ ...d, total: d.juku + d.conveni }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [entries]);

  const dataYears = useMemo(
    () => [...new Set(entries.map((e) => e.month.split("-")[0]))].sort(),
    [entries]
  );

  const [listYear, setListYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (dataYears.length > 0) {
      setListYear(parseInt(dataYears[dataYears.length - 1], 10));
    }
  }, [dataYears.length === 0]);

  const monthlyRows = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (e.month.split("-")[0] !== String(listYear)) return;
      if (!map[e.month]) map[e.month] = { month: e.month, juku: 0, conveni: 0 };
      map[e.month][e.type] += e.amount;
    });
    const rows = [];
    for (let m = 12; m >= 1; m--) {
      const key = `${listYear}-${String(m).padStart(2, "0")}`;
      const d = map[key] || { month: key, juku: 0, conveni: 0 };
      rows.push({ ...d, total: d.juku + d.conveni });
    }
    return rows;
  }, [entries, listYear]);

  const yearlySummary = useMemo(() => {
    const map = {};
    monthlySummary.forEach((m) => {
      const year = m.month.split("-")[0];
      if (!map[year]) map[year] = { year, juku: 0, conveni: 0 };
      map[year].juku += m.juku;
      map[year].conveni += m.conveni;
    });
    return Object.values(map)
      .map((d) => ({ ...d, total: d.juku + d.conveni }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [monthlySummary]);

  const yearlyChartData = useMemo(
    () => yearlySummary.map((d) => ({ ...d, label: `${d.year}年` })).slice().reverse(),
    [yearlySummary]
  );

  const trendData = viewMode === "monthly" ? chartData : yearlyChartData;

  return (
    <div
      style={{
        fontFamily: "'Noto Sans JP', sans-serif",
        background: COLORS.paperDeep,
        minHeight: "100%",
        padding: "24px 12px",
        color: COLORS.ink,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@600;700&family=Noto+Sans+JP:wght@400;500;700&family=DotGothic16&display=swap');
        .num { font-family: 'DotGothic16', monospace; letter-spacing: 0.5px; }
        .book-shadow { box-shadow: 0 2px 4px rgba(43,43,40,0.08), 0 10px 24px rgba(43,43,40,0.10); }
        input, select { font-family: 'Noto Sans JP', sans-serif; }
        input:focus, select:focus { outline: 2px solid ${COLORS.juku}; outline-offset: 1px; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .row-hover:hover { background: ${COLORS.paperDeep}; }
        @media (prefers-reduced-motion: reduce) { .pulse { animation: none !important; } }
        @keyframes stampIn {
          0% { transform: scale(1.4); opacity: 0; }
          60% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse { animation: stampIn 0.45s ease-out; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 880 }}>
        {/* Cover / spine */}
        <div
          className="book-shadow"
          style={{
            display: "flex",
            background: COLORS.paper,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 40,
              background: `linear-gradient(180deg, #1F3A54 0%, ${COLORS.ink} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                writingMode: "vertical-rl",
                color: COLORS.paper,
                fontFamily: "'Zen Old Mincho', serif",
                fontSize: 15,
                letterSpacing: 4,
                fontWeight: 700,
              }}
            >
              給与通帳
            </span>
          </div>

          <div style={{ flex: 1, padding: "20px 22px 26px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BookOpen size={20} color={COLORS.inkSoft} />
                <h1
                  style={{
                    fontFamily: "'Zen Old Mincho', serif",
                    fontSize: 22,
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  給与ノート
                </h1>
              </div>
              <span style={{ fontSize: 12, color: COLORS.inkSoft }}>
                {saving ? "記帳中…" : loaded ? "自動保存済み" : "読み込み中…"}
              </span>
            </div>

            {/* Summary stamps */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginTop: 20,
              }}
            >
              <SummaryCard label="塾" value={totals.juku} color={COLORS.juku} />
              <SummaryCard label="コンビニ" value={totals.conveni} color={COLORS.conveni} />
              <SummaryCard
                label="合計"
                value={totals.total}
                color={COLORS.total}
                stamped
                pulse={stampPulse}
              />
            </div>

            {/* Input form */}
            <div
              style={{
                marginTop: 24,
                border: `1px dashed ${COLORS.line}`,
                borderRadius: 8,
                padding: 16,
                background: COLORS.paper,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.inkSoft,
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                新しい記録を追加
                <span style={{ fontWeight: 400 }}>（同じ月・種類はこの内容に上書きされます）</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <Field label="月">
                  <MonthPicker
                    value={form.month}
                    onChange={(m) => setForm((f) => ({ ...f, month: m }))}
                  />
                </Field>
                <Field label="種類">
                  <div style={{ display: "flex", gap: 6 }}>
                    {Object.entries(JOB_META).map(([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => setForm((f) => ({ ...f, type: key }))}
                        style={{
                          flex: 1,
                          padding: "9px 6px",
                          borderRadius: 6,
                          border: `1.5px solid ${form.type === key ? meta.color : COLORS.line}`,
                          background: form.type === key ? meta.color : "transparent",
                          color: form.type === key ? "#fff" : COLORS.ink,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="支給額（円）" style={{ gridColumn: "1 / -1" }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="例: 32000"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addEntry()}
                    style={{ ...inputStyle }}
                    className="num"
                  />
                </Field>
              </div>
              <button
                onClick={addEntry}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 6,
                  border: "none",
                  background: COLORS.ink,
                  color: COLORS.paper,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={16} /> 記帳する
              </button>
            </div>

            {/* Chart */}
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <SectionTitle>推移グラフ</SectionTitle>
                <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
              </div>
              {trendData.length === 0 ? (
                <EmptyNote text="記録を追加するとグラフが表示されます" />
              ) : (
                <div style={{ height: 260, marginTop: 4 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={COLORS.line} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: COLORS.inkSoft }}
                        axisLine={{ stroke: COLORS.line }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: COLORS.inkSoft }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      />
                      <Tooltip
                        formatter={(v, name) => [yen(v), name]}
                        contentStyle={{
                          fontFamily: "'Noto Sans JP', sans-serif",
                          fontSize: 12,
                          borderRadius: 6,
                          border: `1px solid ${COLORS.line}`,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="juku" name="塾" stroke={COLORS.juku} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="conveni" name="コンビニ" stroke={COLORS.conveni} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="total" name="合計" stroke={COLORS.total} strokeWidth={2.5} strokeDasharray="4 3" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Ledger table */}
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <SectionTitle>記録一覧</SectionTitle>
                {viewMode === "monthly" && entries.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setListYear((y) => y - 1)}
                      aria-label="前の年"
                      style={yearNavBtnStyle}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="num" style={{ fontWeight: 700, fontSize: 14, minWidth: 56, textAlign: "center" }}>
                      {listYear}年
                    </span>
                    <button
                      type="button"
                      onClick={() => setListYear((y) => y + 1)}
                      aria-label="次の年"
                      style={yearNavBtnStyle}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {entries.length === 0 ? (
                <EmptyNote text="まだ記録がありません。上のフォームから追加してください" />
              ) : viewMode === "monthly" ? (
                <div style={{ marginTop: 10, border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 1fr 1fr",
                      gap: 8,
                      padding: "8px 12px",
                      background: COLORS.paperDeep,
                      fontSize: 11,
                      color: COLORS.inkSoft,
                      fontWeight: 500,
                    }}
                  >
                    <span>月</span>
                    <span style={{ textAlign: "right", color: COLORS.juku }}>塾</span>
                    <span style={{ textAlign: "right", color: COLORS.conveni }}>コンビニ</span>
                    <span style={{ textAlign: "right" }}>合計</span>
                  </div>
                  {monthlyRows.map((row) => (
                    <div
                      key={row.month}
                      className="row-hover"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 1fr 1fr",
                        gap: 8,
                        padding: "9px 12px",
                        borderTop: `1px solid ${COLORS.line}`,
                        fontSize: 13,
                        alignItems: "center",
                      }}
                    >
                      <span className="num">{monthLabelJa(row.month)}</span>
                      <AmountCell
                        value={row.juku}
                        color={COLORS.juku}
                        onClick={() => openEditCell(row.month, "juku")}
                      />
                      <AmountCell
                        value={row.conveni}
                        color={COLORS.conveni}
                        onClick={() => openEditCell(row.month, "conveni")}
                      />
                      <span className="num" style={{ textAlign: "right", fontWeight: 700 }}>
                        {yen(row.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 1fr 1fr 1fr",
                      gap: 8,
                      padding: "8px 12px",
                      background: COLORS.paperDeep,
                      fontSize: 11,
                      color: COLORS.inkSoft,
                      fontWeight: 500,
                    }}
                  >
                    <span>年</span>
                    <span style={{ textAlign: "right", color: COLORS.juku }}>塾</span>
                    <span style={{ textAlign: "right", color: COLORS.conveni }}>コンビニ</span>
                    <span style={{ textAlign: "right" }}>合計</span>
                  </div>
                  {yearlySummary.map((row) => (
                    <div
                      key={row.year}
                      className="row-hover"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr 1fr 1fr",
                        gap: 8,
                        padding: "9px 12px",
                        borderTop: `1px solid ${COLORS.line}`,
                        fontSize: 13,
                        alignItems: "center",
                      }}
                    >
                      <span className="num">{row.year}年</span>
                      <span className="num" style={{ textAlign: "right", color: COLORS.juku }}>
                        {yen(row.juku)}
                      </span>
                      <span className="num" style={{ textAlign: "right", color: COLORS.conveni }}>
                        {yen(row.conveni)}
                      </span>
                      <span className="num" style={{ textAlign: "right", fontWeight: 700 }}>
                        {yen(row.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editTarget && (
        <div
          onClick={() => setEditTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43,43,40,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 20,
              width: 280,
              boxSizing: "border-box",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 4 }}>
              {monthLabelJa(editTarget.month)}・{JOB_META[editTarget.type].label}
            </div>
            <div
              style={{
                fontFamily: "'Zen Old Mincho', serif",
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              金額を変更
            </div>
            <input
              type="number"
              min="0"
              autoFocus
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEditCell()}
              className="num"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={saveEditCell}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 6,
                  border: "none",
                  background: COLORS.ink,
                  color: COLORS.paper,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                変更する
              </button>
              <button
                type="button"
                onClick={deleteEditCell}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 6,
                  border: `1.5px solid ${COLORS.stamp}`,
                  background: "transparent",
                  color: COLORS.stamp,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                削除する
              </button>
            </div>
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "7px 0",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: COLORS.inkSoft,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewModeToggle({ viewMode, setViewMode }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[
        ["monthly", "月次"],
        ["yearly", "年次"],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setViewMode(key)}
          style={{
            padding: "5px 14px",
            borderRadius: 6,
            border: `1.5px solid ${viewMode === key ? COLORS.ink : COLORS.line}`,
            background: viewMode === key ? COLORS.ink : "transparent",
            color: viewMode === key ? COLORS.paper : COLORS.ink,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AmountCell({ value, color, onClick }) {
  const tappable = value > 0;
  return (
    <button
      type="button"
      onClick={tappable ? onClick : undefined}
      className="num"
      style={{
        textAlign: "right",
        color,
        background: "transparent",
        border: "none",
        padding: 0,
        font: "inherit",
        fontFamily: "'DotGothic16', monospace",
        cursor: tappable ? "pointer" : "default",
        textDecoration: tappable ? "underline dotted" : "none",
        textUnderlineOffset: 3,
      }}
    >
      {yen(value)}
    </button>
  );
}

function SummaryCard({ label, value, color, stamped, pulse }) {
  return (
    <div
      className={pulse ? "pulse" : ""}
      style={{
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: "10px 8px",
        textAlign: "center",
        background: stamped ? `${color}0D` : "transparent",
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.inkSoft, fontWeight: 500 }}>{label}</div>
      <div className="num" style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2 }}>
        {yen(value)}
      </div>
    </div>
  );
}

function MonthPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() =>
    value ? parseInt(value.split("-")[0], 10) : new Date().getFullYear()
  );
  const wrapRef = useRef(null);

  const selectedYear = value ? parseInt(value.split("-")[0], 10) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1], 10) : null;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setYear(value ? parseInt(value.split("-")[0], 10) : new Date().getFullYear());
      }
      return !wasOpen;
    });
  };

  const pickMonth = (m) => {
    onChange(`${year}-${String(m).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggleOpen}
        className="num"
        style={{
          ...inputStyle,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: value ? COLORS.ink : COLORS.inkSoft,
        }}
      >
        {monthLabelJa(value)}
        <Calendar size={14} color={COLORS.inkSoft} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            background: "#fff",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 6px 20px rgba(43,43,40,0.18)",
            width: 220,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="前の年"
              style={yearNavBtnStyle}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="num" style={{ fontWeight: 700, fontSize: 15 }}>
              {year}年
            </span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="次の年"
              style={yearNavBtnStyle}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const isSelected = selectedYear === year && selectedMonth === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMonth(m)}
                  className="num"
                  style={{
                    padding: "7px 0",
                    borderRadius: 6,
                    border: `1.5px solid ${isSelected ? COLORS.juku : COLORS.line}`,
                    background: isSelected ? COLORS.juku : "transparent",
                    color: isSelected ? "#fff" : COLORS.ink,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {m}月
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "7px 0",
              borderRadius: 6,
              border: `1.5px solid ${COLORS.line}`,
              background: "transparent",
              color: COLORS.inkSoft,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}

const yearNavBtnStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: COLORS.ink,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 4,
  borderRadius: 4,
};

function Field({ label, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      <div style={{ fontSize: 11, color: COLORS.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Zen Old Mincho', serif",
        fontSize: 14,
        fontWeight: 700,
        borderBottom: `2px solid ${COLORS.ink}`,
        display: "inline-block",
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

function EmptyNote({ text }) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: "18px 12px",
        textAlign: "center",
        fontSize: 12,
        color: COLORS.inkSoft,
        border: `1px dashed ${COLORS.line}`,
        borderRadius: 8,
      }}
    >
      {text}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 6,
  border: `1.5px solid ${COLORS.line}`,
  fontSize: 13,
  boxSizing: "border-box",
  background: "#fff",
};
