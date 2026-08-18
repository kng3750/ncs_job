import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"공공일자리 | 대한민국 공공 채용정보",description:"중앙부처, 지방자치단체, 교육청과 공공기관의 최신 채용정보를 한곳에서 확인하세요."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body>{children}</body></html>}
