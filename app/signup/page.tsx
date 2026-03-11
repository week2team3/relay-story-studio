import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/auth-page.module.css";
import { SignupForm } from "@/components/auth/signup-form";
import { getSession } from "@/lib/auth/server";

export default async function SignupPage() {
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
              <p className="eyebrow">회원가입</p>
              <h1 className="headline">작성자 계정을 만들고 이야기를 시작하세요.</h1>
              <p className={`body-copy ${styles.copy}`}>
                계정을 만들면 바로 로그인 상태가 시작되고 캔버스를 만들 수 있습니다.
              </p>
            </div>
          </div>

          <SignupForm />
        </section>
      </div>
    </main>
  );
}
