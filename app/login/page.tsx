import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/auth-page.module.css";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/server";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/home");
  }

  return (
    <main className="page-shell">
      <div className={styles.shell}>
        <Link className="button-ghost" href="/">
          처음으로
        </Link>

        <section className={styles.grid}>
          <div className={`glass-panel ${styles.panel}`}>
            <div className="stack">
              <p className="eyebrow">로그인</p>
              <h1 className="headline">이어서 작성하려면 로그인하세요.</h1>
              <p className={`body-copy ${styles.copy}`}>
                이메일과 비밀번호로 로그인하면 내가 참여한 캔버스를 바로 열 수 있습니다.
              </p>
            </div>
          </div>

          <LoginForm />
        </section>
      </div>
    </main>
  );
}
