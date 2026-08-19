import { NextRequest, NextResponse } from "next/server";

const GOJOBS_ENDPOINT = "https://apis.data.go.kr/1760000/PblJobService/getList";
const MOEF_ENDPOINT = "https://apis.data.go.kr/1051000/recruitment/list";
const DATA_YEAR = "2026";

type Job = {
  id: string;
  title: string;
  institution: string;
  region: string;
  field: string;
  employment: string;
  startDate: string;
  endDate: string;
  status: string;
  sourceUrl?: string;
};

type MoefItem = Record<string, unknown>;

function clean(value = "") {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
}

function xmlField(xml: string, names: string[]) {
  for (const name of names) {
    const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return clean(match[1]);
  }
  return "";
}

function text(item: MoefItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function formatDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8
    ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
    : value;
}

function statusFromEndDate(endDate: string) {
  const end = endDate ? new Date(endDate.replaceAll(".", "-")) : null;
  const days = end ? Math.ceil((end.getTime() - Date.now()) / 86400000) : 99;
  return days >= 0 && days <= 7 ? "마감임박" : "접수중";
}

function is2026(job: Job) {
  return job.startDate.startsWith(DATA_YEAR) || job.endDate.startsWith(DATA_YEAR) || job.title.includes(DATA_YEAR);
}

function matchesQuery(job: Job, query: string) {
  if (!query) return true;
  return `${job.title} ${job.institution} ${job.region} ${job.field} ${job.employment}`
    .toLocaleLowerCase("ko")
    .includes(query.toLocaleLowerCase("ko"));
}

async function fetchGojobs(serviceKey: string, query: string, numOfRows: string): Promise<Job[]> {
  const params = new URLSearchParams({ serviceKey, pageNo: "1", numOfRows });
  if (query) params.set("title", query);

  const response = await fetch(`${GOJOBS_ENDPOINT}?${params}`, { next: { revalidate: 300 } });
  const xml = await response.text();
  if (!response.ok || /SERVICE_KEY|APPLICATION_ERROR|PERMISSION_DENIED/i.test(xml)) {
    throw new Error("나라일터 API 오류");
  }

  return [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1];
    const startDate = formatDate(xmlField(item, ["startDate", "fromDate", "receiptStartDate", "rceptBgngDt", "beginDe"]));
    const endDate = formatDate(xmlField(item, ["endDate", "toDate", "receiptEndDate", "rceptClosDt", "endDe"]));
    return {
      id: `gojobs-${xmlField(item, ["idx", "seq", "recrutPblntSn", "pblancSn"]) || index}`,
      title: xmlField(item, ["title", "subject", "recrutPblntTtl", "pblancSj"]) || "공공기관 채용 공고",
      institution: xmlField(item, ["insttNm", "instt", "orgNm", "recrutInsttNm"]) || "공공기관",
      region: xmlField(item, ["region", "workRegion", "workRgnNm", "sidoNm"]) || "전국",
      field: xmlField(item, ["clsfNm", "jobType", "recrutSeNm", "realmNm"]) || "공공채용",
      employment: xmlField(item, ["position", "emplymTyNm", "recrutTyNm", "clsf"]) || "채용공고",
      startDate,
      endDate,
      status: statusFromEndDate(endDate),
      sourceUrl: xmlField(item, ["url", "detailUrl", "recrutPblntUrl"]),
    };
  });
}

async function fetchMoef(serviceKey: string): Promise<Job[]> {
  const params = new URLSearchParams({
    serviceKey,
    resultType: "json",
    pbancBgngYmd: `${DATA_YEAR}-01-01`,
    pbancEndYmd: `${DATA_YEAR}-12-31`,
  });
  const response = await fetch(`${MOEF_ENDPOINT}?${params}`, { next: { revalidate: 300 } });
  const data = (await response.json()) as Record<string, unknown>;
  const resultCode = String(data.resultCode ?? "");
  if (!response.ok || (resultCode && resultCode !== "0" && resultCode !== "00")) {
    throw new Error(`재정경제부 API 오류: ${resultCode || response.status}`);
  }

  const result = Array.isArray(data.result) ? (data.result as MoefItem[]) : [];
  return result.map((item, index) => {
    const startDate = formatDate(text(item, "pbancBgngYmd"));
    const endDate = formatDate(text(item, "pbancEndYmd"));
    return {
      id: `moef-${text(item, "recrutPblntSn") || index}`,
      title: text(item, "recrutPbancTtl") || "공공기관 채용 공고",
      institution: text(item, "instNm") || "공공기관",
      region: text(item, "workRgnNmLst") || "전국",
      field: text(item, "ncsCdNmLst") || text(item, "recrutSeNm") || "공공채용",
      employment: text(item, "hireTypeNmLst") || text(item, "recrutSeNm") || "채용공고",
      startDate,
      endDate,
      status: statusFromEndDate(endDate),
      sourceUrl: text(item, "srcUrl"),
    };
  });
}

function deduplicate(jobs: Job[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.institution}|${job.title}|${job.startDate}|${job.endDate}`.toLocaleLowerCase("ko");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (!serviceKey) return NextResponse.json({ jobs: [], configured: false });

  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const numOfRows = request.nextUrl.searchParams.get("numOfRows") || "100";
  const [gojobsResult, moefResult] = await Promise.allSettled([
    fetchGojobs(serviceKey, query, numOfRows),
    fetchMoef(serviceKey),
  ]);

  const gojobs = gojobsResult.status === "fulfilled" ? gojobsResult.value : [];
  const moef = moefResult.status === "fulfilled" ? moefResult.value : [];
  const jobs = deduplicate([...gojobs, ...moef])
    .filter((job) => is2026(job) && matchesQuery(job, query))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  if (gojobsResult.status === "rejected" && moefResult.status === "rejected") {
    return NextResponse.json(
      { jobs: [], configured: true, error: "공공데이터를 불러오지 못했습니다." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    jobs,
    configured: true,
    totalCount: jobs.length,
    year: DATA_YEAR,
    sources: {
      gojobs: gojobsResult.status === "fulfilled",
      moef: moefResult.status === "fulfilled",
    },
  });
}
