import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "릴레이 스토리 스튜디오",
  description: "함께 이어 쓰는 분기형 소설 캔버스"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
