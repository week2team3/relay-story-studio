import styles from "@/components/home/dashboard.module.css";
import { CreateCanvasForm } from "@/components/home/create-canvas-form";
import { LogoutButton } from "@/components/home/logout-button";
import { getSession } from "@/lib/auth/server";
import { listParticipatedCanvases } from "@/lib/services/canvas";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const canvases = await listParticipatedCanvases(session.userId);

  return (
    <main className="page-shell">
      <div className={styles.stack}>
        <section className={`glass-panel ${styles.header}`}>
          <div className={styles.headerRow}>
            <div className="stack">
              <p className="eyebrow">내 작업실</p>
              <h1 className="headline" style={{ fontSize: "clamp(2.2rem, 5vw, 4.2rem)" }}>
                {session.nickname}님의 캔버스
              </h1>
            </div>

            <LogoutButton />
          </div>
        </section>

        <section className={styles.grid}>
          <aside className={`glass-panel ${styles.section}`}>
            <h2 style={{ margin: 0 }}>캔버스 만들기</h2>

            <CreateCanvasForm />
          </aside>

          <section className={`glass-panel ${styles.section}`}>
            <h2 style={{ margin: 0 }}>참여 중인 캔버스</h2>

            {canvases.length === 0 ? (
              <p className="status-text">아직 참여 중인 캔버스가 없습니다.</p>
            ) : (
              <div className="card-grid">
                {canvases.map((canvas) => (
                  <article className={`glass-panel ${styles.canvasCard}`} key={canvas.id}>
                    <h3 className={styles.canvasTitle}>{canvas.title}</h3>

                    <div className="button-row">
                      <a className="button-primary" href={`/canvas/${canvas.shareKey}`}>
                        열기
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
