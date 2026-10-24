export type Statement = {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: string;
  transfer: boolean;
};

export type Coverage = { from: string; to: string };
export type ReceiptStatus = "id" | "famima" | "aupay_or_cash" | "unconfirmed";
export type ReceiptMatch = { receipt: Statement; status: ReceiptStatus; reason: string };

const requiredHeaders = ["日付", "内容", "金額（円）", "保有金融機関", "振替", "ID"];

function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const character = input[i];
    if (character === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += character;
  }
  if (quoted) throw new Error("CSVの引用符が閉じられていません");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const epochDay = (date: string) => {
  const normalized = date.replaceAll("/", "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`日付の形式が不正です: ${date}`);
  const parsed = Date.parse(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== normalized) {
    throw new Error(`日付が不正です: ${date}`);
  }
  return Math.floor(parsed / 86400000);
};

export function parseMoneyForwardCsv(input: string): Statement[] {
  const rows = csvRows(input.replace(/^\uFEFF/, ""));
  const header = rows.shift();
  if (!header || requiredHeaders.some((name) => !header.includes(name))) {
    throw new Error("マネーフォワードの家計簿CSV列を確認できません");
  }
  const index = (name: string) => header.indexOf(name);
  return rows.map((cells, rowIndex) => {
    const date = (cells[index("日付")] ?? "").replaceAll("/", "-");
    epochDay(date);
    const rawAmount = (cells[index("金額（円）")] ?? "").replaceAll(",", "");
    if (!/^-?\d+$/.test(rawAmount)) throw new Error(`${rowIndex + 2}行目の金額を読めません`);
    const id = cells[index("ID")] ?? "";
    if (!id) throw new Error(`${rowIndex + 2}行目のIDを読めません`);
    return {
      id, date,
      description: cells[index("内容")] ?? "",
      amount: Number(rawAmount),
      account: cells[index("保有金融機関")] ?? "",
      transfer: cells[index("振替")] === "1",
    };
  });
}

export function coverageFromFilename(name: string): Coverage {
  const match = name.match(/収入・支出詳細_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$/);
  if (!match) throw new Error(`期間をファイル名から確認できません: ${name}`);
  epochDay(match[1]); epochDay(match[2]);
  return { from: match[1], to: match[2] };
}

const dayDifference = (a: string, b: string) => Math.abs(epochDay(a) - epochDay(b));
const sameAmount = (a: Statement, b: Statement) => a.amount < 0 && b.amount < 0 && a.amount === b.amount;
const isDebit = (row: Statement) => row.account.includes("ＳＭＴＢ") && /^デビット\s*[0-9０-９]+$/.test(row.description);
const isFamima = (row: Statement) => row.account === "ファミマカード";
const merchantKey = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();

function completeWindow(date: string, asOf: string, coverage: Coverage[]) {
  const base = epochDay(date);
  if (base + 3 >= epochDay(asOf)) return false;
  for (let offset = -3; offset <= 3; offset += 1) {
    const day = base + offset;
    if (!coverage.some((range) => epochDay(range.from) <= day && day <= epochDay(range.to))) return false;
  }
  return true;
}

export function matchReceipts(rows: Statement[], asOf: string, coverage: Coverage[]): ReceiptMatch[] {
  const byId = new Map<string, Statement>();
  for (const row of rows) {
    const previous = byId.get(row.id);
    if (previous && (previous.date !== row.date || previous.description !== row.description ||
      previous.amount !== row.amount || previous.account !== row.account || previous.transfer !== row.transfer)) {
      throw new Error(`同じIDの明細に食い違いがあります: ${row.id}`);
    }
    byId.set(row.id, row);
  }
  const unique = [...byId.values()];
  const receipts = unique.filter((row) => row.account === "なし" && row.amount < 0 && !row.transfer);
  const candidateUse = new Map<string, number>();
  const candidates = receipts.map((receipt) => {
    const debit = unique.filter((row) => isDebit(row) && sameAmount(receipt, row) && dayDifference(receipt.date, row.date) <= 3);
    const famima = unique.filter((row) => isFamima(row) && sameAmount(receipt, row) && dayDifference(receipt.date, row.date) <= 1);
    for (const candidate of [...debit, ...famima]) candidateUse.set(candidate.id, (candidateUse.get(candidate.id) ?? 0) + 1);
    const amountMismatch = unique.some((row) => isFamima(row) && row.amount < 0 &&
      dayDifference(receipt.date, row.date) <= 1 && merchantKey(row.description) === merchantKey(receipt.description) &&
      !sameAmount(receipt, row));
    return { receipt, debit, famima, amountMismatch };
  });

  return candidates.map(({ receipt, debit, famima, amountMismatch }) => {
    if (!completeWindow(receipt.date, asOf, coverage)) {
      return { receipt, status: "unconfirmed", reason: "前後3日分の明細がまだ揃っていません" };
    }
    if (debit.length + famima.length > 1 || amountMismatch ||
      [...debit, ...famima].some((candidate) => (candidateUse.get(candidate.id) ?? 0) > 1)) {
      return { receipt, status: "unconfirmed", reason: "候補が競合、または同じ店の金額が一致しません" };
    }
    if (debit.length === 1) return { receipt, status: "id", reason: "SBIデビットと同額・前後3日以内で一意" };
    if (famima.length === 1) return { receipt, status: "famima", reason: "ファミマカードと同額・前後1日以内で一意" };
    return { receipt, status: "aupay_or_cash", reason: "一致するカード明細なし。現金の可能性あり" };
  });
}

export function plannedAuPayAmount(masterAmount: number, matches: ReceiptMatch[], complete: boolean) {
  const matchedAmount = matches.filter((match) => match.status === "aupay_or_cash")
    .reduce((sum, match) => sum - match.receipt.amount, 0);
  return complete ? matchedAmount : Math.max(masterAmount, matchedAmount);
}
