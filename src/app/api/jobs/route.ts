import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = "https://apis.data.go.kr/1760000/PblJobService/getList";
const DATA_YEAR = "2026";

function clean(value = "") {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
}

function field(xml: string, names: string[]) {
  for (const name of names) {
    const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return clean(match[1]);
  }
  return "";
}

function formatDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8
    ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
    : value;
}

export async function GET(request: NextRequest) {
  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (!serviceKey) return NextResponse.json({ jobs: [], configured: false });

  const input = request.nextUrl.searchParams;
  const params = new URLSearchParams({
    serviceKey,
    pageNo: input.get("pageNo") || "1",
    numOfRows: input.get("numOfRows") || "30",
  });
  for (const key of ["title", "instt", "region", "clsf"]) {
    if (input.get(key)) params.set(key, input.get(key)!);
  }

  try {
    const response = await fetch(`${ENDPOINT}?${params}`, { next: { revalidate: 300 } });
    const xml = await response.text();
    if (!response.ok || /SERVICE_KEY|APPLICATION_ERROR/i.test(xml)) throw new Error("Public API error");

    const jobs = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)]
      .map((match, index) => {
        const item = match[1];
        const title = field(item, ["title", "subject", "recrutPblntTtl", "pblancSj"]) || "공공기관 채용 공고";
        const startDate = formatDate(field(item, ["startDate", "fromDate", "receiptStartDate", "rceptBgngDt", "beginDe"]));
        const endDate = formatDate(field(item, ["endDate", "toDate", "receiptEndDate", "rceptClosDt", "endDe"]));
        const end = endDate ? new Date(endDate.replaceAll(".", "-")) : null;
        const days = end ? Math.ceil((end.getTime() - Date.now()) / 86400000) : 99;
        return {
          id: field(item, ["idx", "seq", "recrutPblntSn", "pblancSn"]) || String(index),
          title,
          institution: field(item, ["insttNm", "instt", "orgNm", "recrutInsttNm"]) || "공공기관",
          region: field(item, ["region", "workRegion", "workRgnNm", "sidoNm"]) || "전국",
          field: field(item, ["clsfNm", "jobType", "recrutSeNm", "realmNm"]) || "공공채용",
          employment: field(item, ["position", "emplymTyNm", "recrutTyNm", "clsf"]) || "채용공고",
          startDate,
          endDate,
          status: days >= 0 && days <= 7 ? "마감임박" : "접수중",
          sourceUrl: field(item, ["url", "detailUrl", "recrutPblntUrl"]),
        };
      })
      .filter((job) =>
        job.startDate.startsWith(DATA_YEAR) ||
        job.endDate.startsWith(DATA_YEAR) ||
        job.title.includes(DATA_YEAR),
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    return NextResponse.json({ jobs, configured: true, totalCount: jobs.length, year: DATA_YEAR });
  } catch {
    return NextResponse.json(
      { jobs: [], configured: true, error: "공공데이터를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
