import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/page.module.css";
import { getSession } from "@/lib/auth/server";

export default async function LandingPage() {
  const session = await getSession();

  if (session) {
    redirect("/home");
  }

  return (
    <main className="page-shell">
      <section className={`glass-panel ${styles.hero}`}>
        <div className="stack">
          <p className="eyebrow">릴레이 스토리</p>
          <h1 className="headline">이야기를 잇고, 분기를 만들고, 결말을 완성하세요.</h1>
          <p className={`body-copy ${styles.lede}`}>
            하나의 시작에서 여러 갈래의 이야기를 함께 이어 쓰는 협업 소설 공간입니다.
          </p>
        </div>

        <div className="button-row">
          <Link className="button-primary" href="/signup">
            회원가입
          </Link>
          <Link className="button-secondary" href="/login">
            로그인
          </Link>
        </div>
      </section>
    </main>
  );
}
