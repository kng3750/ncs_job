"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Job = { id:string; title:string; institution:string; region:string; field:string; employment:string; startDate:string; endDate:string; status:string; sourceUrl?:string };
const fallbackJobs: Job[] = [
  {id:"210354",title:"2026년도 제3회 일반임기제공무원 채용 공고",institution:"인사혁신처",region:"세종",field:"행정",employment:"일반임기제",startDate:"2026.08.18",endDate:"2026.08.28",status:"접수중"},
  {id:"210355",title:"연구직 공무원 경력경쟁채용시험 시행계획",institution:"국립환경과학원",region:"인천",field:"연구",employment:"연구직",startDate:"2026.08.17",endDate:"2026.09.02",status:"접수중"},
  {id:"210356",title:"교육공무직원 공개채용 공고",institution:"서울특별시교육청",region:"서울",field:"교육",employment:"공무직",startDate:"2026.08.14",endDate:"2026.08.26",status:"마감임박"},
  {id:"210357",title:"정보보안 전문경력관 채용시험 공고",institution:"행정안전부",region:"세종",field:"기술",employment:"전문경력관",startDate:"2026.08.13",endDate:"2026.09.04",status:"접수중"},
  {id:"210358",title:"2026년 하반기 체험형 청년인턴 모집",institution:"한국지역정보개발원",region:"서울",field:"행정",employment:"청년인턴",startDate:"2026.08.11",endDate:"2026.08.25",status:"마감임박"},
  {id:"210359",title:"지방공무원 경력경쟁 임용시험 공고",institution:"광주광역시",region:"광주",field:"기술",employment:"지방공무원",startDate:"2026.08.08",endDate:"2026.09.08",status:"접수중"},
];
const filters={region:["전체 지역","서울","세종","광주","인천","경기"],field:["전체 직종","행정","기술","연구","교육"],employment:["고용 형태","일반임기제","연구직","공무직","전문경력관","청년인턴","지방공무원"]};

export default function Home(){
 const [jobs,setJobs]=useState<Job[]>(fallbackJobs),[query,setQuery]=useState(""),[submitted,setSubmitted]=useState("");
 const [region,setRegion]=useState(filters.region[0]),[field,setField]=useState(filters.field[0]),[employment,setEmployment]=useState(filters.employment[0]);
 const [loading,setLoading]=useState(true),[live,setLive]=useState(false);
 useEffect(()=>{void loadJobs()},[]);
 const visible=useMemo(()=>jobs.filter(job=>{const text=`${job.title} ${job.institution} ${job.field}`.toLowerCase();return(!submitted||text.includes(submitted.toLowerCase()))&&(region==="전체 지역"||job.region.includes(region))&&(field==="전체 직종"||job.field.includes(field))&&(employment==="고용 형태"||job.employment.includes(employment))}),[jobs,submitted,region,field,employment]);
 async function loadJobs(searchQuery=""){
  setLoading(true);
  try{
   const params=new URLSearchParams({numOfRows:"100"});
   if(searchQuery)params.set("q",searchQuery);
   const response=await fetch(`/api/jobs?${params}`);
   const data=await response.json();
   if(data.jobs?.length){setJobs(data.jobs);setLive(true)}
   else if(searchQuery){setJobs([])}
  }catch{
   // API 장애 시 현재 목록을 유지합니다.
  }finally{setLoading(false)}
 }
 function search(e:FormEvent){e.preventDefault();const value=query.trim();setSubmitted(value);void loadJobs(value)} function reset(){setQuery("");setSubmitted("");setRegion(filters.region[0]);setField(filters.field[0]);setEmployment(filters.employment[0]);void loadJobs()}
 return <>
 <header className="site-header"><div className="header-inner"><a className="brand" href="#top" aria-label="공공일자리 홈"><span className="brand-mark">P</span><span>공공<span>일자리</span></span></a><nav aria-label="주요 메뉴"><a className="active" href="#jobs">채용공고</a><a href="#guide">이용안내</a><a href="https://www.gojobs.go.kr" target="_blank" rel="noreferrer">나라일터 ↗</a></nav><div className="official"><span>✓</span> 인사혁신처 공공데이터 연계</div></div></header>
 <main id="top"><section className="hero"><div className="hero-grid" aria-hidden="true"/><div className="hero-inner"><div className="hero-copy"><p className="eyebrow"><i/> PUBLIC JOBS, ONE PLACE</p><h1>당신의 다음 공공일자리,<br/><strong>한곳에서 찾으세요.</strong></h1><p className="hero-desc">중앙부처부터 지방자치단체, 교육청, 공공기관까지.<br/>현직 채용 담당자가 직접 등록한 신뢰도 높은 공고를 실시간으로 만나보세요.</p><div className="trust-row"><span>✓ 실시간 연계</span><span>✓ 공식 기관 등록</span><span>✓ 누구나 무료</span></div></div><div className="hero-visual" aria-hidden="true"><div className="orb"><span className="building">▥</span><div className="orbit orbit-one"><b>행정</b></div><div className="orbit orbit-two"><b>기술</b></div><div className="orbit orbit-three"><b>연구</b></div></div></div></div></section>
 <section className="search-wrap" aria-label="채용공고 검색"><form className="search-panel" onSubmit={search}><div className="keyword"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="기관명, 공고명, 직무 키워드로 검색" aria-label="검색어"/><button>검색하기</button></div><div className="filter-row"><select value={region} onChange={e=>setRegion(e.target.value)} aria-label="지역">{filters.region.map(v=><option key={v}>{v}</option>)}</select><select value={field} onChange={e=>setField(e.target.value)} aria-label="직종">{filters.field.map(v=><option key={v}>{v}</option>)}</select><select value={employment} onChange={e=>setEmployment(e.target.value)} aria-label="고용 형태">{filters.employment.map(v=><option key={v}>{v}</option>)}</select><button type="button" className="reset" onClick={reset}>↻ 필터 초기화</button></div></form></section>
 <section className="content" id="jobs"><div className="section-title"><div><p>LIVE RECRUITMENT</p><h2>지금 지원 가능한 채용공고</h2></div><div className={`live-badge ${live?"":"sample"}`}><i/> {loading?"데이터 연결 중":live?"실시간 데이터":"미리보기 데이터"}</div></div><div className="jobs-layout"><aside className="stats-card"><p>오늘의 채용 현황</p><strong>{jobs.length.toLocaleString()}<small>건</small></strong><span>현재 확인 가능한 공고</span><div className="stat-list"><div><b>{jobs.filter(j=>j.status==="마감임박").length}</b><span>마감 임박</span></div><div><b>{new Set(jobs.map(j=>j.institution)).size}</b><span>참여 기관</span></div></div><div className="source-note"><b>데이터 출처</b><p>인사혁신처 나라일터<br/>공공취업정보 조회 서비스</p></div></aside><div className="job-area"><div className="result-head"><p>총 <strong>{visible.length}</strong>개의 공고</p><span>최신 등록순</span></div><div className="job-list">{visible.map(job=><article className="job-card" key={job.id}><div className="job-main"><div className="badges"><span className={job.status==="마감임박"?"urgent":"open"}>{job.status}</span><span>{job.field}</span></div><h3>{job.title}</h3><p className="institution">▣ {job.institution}</p><div className="meta"><span>⌖ {job.region}</span><span>♙ {job.employment}</span><span>▦ {job.startDate} ~ {job.endDate}</span></div></div><a className="detail" href={job.sourceUrl||`https://www.gojobs.go.kr/apmView.do?idx=${job.id}`} target="_blank" rel="noreferrer" aria-label={`${job.title} 상세보기`}>상세보기 <b>→</b></a></article>)}{!visible.length&&<div className="empty"><b>검색 결과가 없습니다.</b><p>검색어나 필터를 바꿔 다시 찾아보세요.</p><button onClick={reset}>전체 공고 보기</button></div>}</div></div></div></section>
 <section className="guide" id="guide"><div><p>공공 채용의 새로운 기준</p><h2>흩어진 공공일자리 정보를<br/>정확하고 빠르게 전합니다.</h2></div><div className="guide-points"><article><b>01</b><h3>믿을 수 있는 정보</h3><p>각 기관 채용 담당자가 직접 등록한 공식 공고만 제공합니다.</p></article><article><b>02</b><h3>한눈에 보는 채용</h3><p>기관별 사이트를 찾아다닐 필요 없이 한곳에서 비교하세요.</p></article><article><b>03</b><h3>실시간 업데이트</h3><p>나라일터 데이터와 연계해 최신 채용 소식을 빠르게 전합니다.</p></article></div></section></main>
 <footer><div className="footer-inner"><div className="brand footer-brand"><span className="brand-mark">P</span><span>공공<span>일자리</span></span></div><p>본 서비스는 인사혁신처 공공데이터를 활용한 채용정보 제공 서비스입니다.<br/>채용 관련 최종 내용은 반드시 해당 기관의 공고문을 확인하시기 바랍니다.</p><span>© 2026 PUBLIC JOBS. ALL RIGHTS RESERVED.</span></div></footer></>
}
